'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Settings, Plus, Loader2, Database, Lock } from 'lucide-react'
import type { Board, Column as ColumnType, Card, CardFields, FieldConfig } from '@/lib/types'
import * as db from '@/lib/db'
import { isSupabaseConfigured } from '@/lib/supabase'
import Column from './Column'
import CardModal from './CardModal'
import ConfigPanel from './ConfigPanel'
import PasswordModal from './PasswordModal'

interface CardModalState {
  open: boolean
  card?: Card
  columnId?: string
}

interface PwdModalState {
  open: boolean
  boardId: string
  boardName: string
  error: boolean
}

const UNLOCKED_KEY = 'kanban_unlocked_boards'

function getUnlocked(): Set<string> {
  try {
    const raw = sessionStorage.getItem(UNLOCKED_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

function saveUnlocked(ids: Set<string>) {
  sessionStorage.setItem(UNLOCKED_KEY, JSON.stringify([...ids]))
}

export default function KanbanApp() {
  const [boards, setBoards] = useState<Board[]>([])
  const [columns, setColumns] = useState<ColumnType[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [configOpen, setConfigOpen] = useState(false)
  const [cardModal, setCardModal] = useState<CardModalState>({ open: false })
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null)
  const [newBoardName, setNewBoardName] = useState('')
  const [newBoardPassword, setNewBoardPassword] = useState('')
  const [addingBoard, setAddingBoard] = useState(false)
  const [pwdModal, setPwdModal] = useState<PwdModalState>({ open: false, boardId: '', boardName: '', error: false })
  const [unlockedBoards, setUnlockedBoards] = useState<Set<string>>(new Set())
  const newBoardInputRef = useRef<HTMLInputElement>(null)

  const supabaseReady = isSupabaseConfigured()

  // Carga inicial
  useEffect(() => {
    const unlocked = getUnlocked()
    setUnlockedBoards(unlocked)
    db.getBoards().then(bs => {
      setBoards(bs)
      if (bs.length > 0) {
        const first = bs[0]
        if (!first.password || unlocked.has(first.id)) {
          setActiveBoardId(first.id)
        } else {
          // El primero tiene contraseña y no está desbloqueado: no activar ninguno
        }
      }
    }).finally(() => setLoading(false))
  }, [])

  // Carga columnas y tarjetas cuando cambia el tablero activo
  useEffect(() => {
    if (!activeBoardId) return
    Promise.all([
      db.getColumns(activeBoardId),
      db.getCards(activeBoardId),
    ]).then(([cols, cds]) => {
      setColumns(cols)
      setCards(cds)
    })
  }, [activeBoardId])

  const activeBoard = boards.find(b => b.id === activeBoardId)
  const boardColumns = columns
    .filter(c => c.board_id === activeBoardId)
    .sort((a, b) => a.position - b.position)

  // ─── Board operations ───────────────────────────────────────────────────

  async function handleCreateBoard() {
    const name = newBoardName.trim()
    if (!name) return
    const password = newBoardPassword.length === 4 ? newBoardPassword : undefined
    const board = await db.createBoard(name, password)
    setBoards(prev => [...prev, board])
    setActiveBoardId(board.id)
    // Tablero recién creado siempre está desbloqueado en la sesión
    if (password) {
      const next = new Set(unlockedBoards).add(board.id)
      setUnlockedBoards(next)
      saveUnlocked(next)
    }
    setColumns(prev => prev)
    setCards(prev => prev.filter(c => c.board_id !== board.id))
    setNewBoardName('')
    setNewBoardPassword('')
    setAddingBoard(false)
  }

  async function handleUpdateBoard(updates: { name?: string; field_config?: FieldConfig[]; password?: string | null }) {
    if (!activeBoardId) return
    await db.updateBoard(activeBoardId, updates)
    setBoards(prev => prev.map(b => b.id === activeBoardId ? { ...b, ...updates, password: updates.password === null ? undefined : (updates.password ?? b.password) } : b))
  }

  async function handleDeleteBoard() {
    if (!activeBoardId) return
    await db.deleteBoard(activeBoardId)
    const remaining = boards.filter(b => b.id !== activeBoardId)
    setBoards(remaining)
    setColumns(prev => prev.filter(c => c.board_id !== activeBoardId))
    setCards(prev => prev.filter(c => c.board_id !== activeBoardId))
    setActiveBoardId(remaining[0]?.id ?? null)
    setConfigOpen(false)
  }

  function handleBoardClick(board: Board) {
    if (board.id === activeBoardId) return
    if (board.password && !unlockedBoards.has(board.id)) {
      setPwdModal({ open: true, boardId: board.id, boardName: board.name, error: false })
      return
    }
    setActiveBoardId(board.id)
  }

  function handlePasswordSubmit(password: string) {
    const board = boards.find(b => b.id === pwdModal.boardId)
    if (!board) return
    if (password === board.password) {
      const next = new Set(unlockedBoards).add(board.id)
      setUnlockedBoards(next)
      saveUnlocked(next)
      setPwdModal({ open: false, boardId: '', boardName: '', error: false })
      setActiveBoardId(board.id)
    } else {
      setPwdModal(prev => ({ ...prev, error: true }))
    }
  }

  // ─── Column operations ──────────────────────────────────────────────────

  async function handleAddColumn(name: string) {
    if (!activeBoardId) return
    const position = boardColumns.length
    const col = await db.createColumn(activeBoardId, name, position)
    setColumns(prev => [...prev, col])
  }

  async function handleRenameColumn(id: string, name: string) {
    await db.updateColumn(id, { name })
    setColumns(prev => prev.map(c => c.id === id ? { ...c, name } : c))
  }

  async function handleDeleteColumn(id: string) {
    await db.deleteColumn(id)
    setColumns(prev => prev.filter(c => c.id !== id))
    setCards(prev => prev.filter(c => c.column_id !== id))
  }

  async function handleMoveColumn(id: string, direction: 'up' | 'down') {
    const sorted = [...boardColumns]
    const idx = sorted.findIndex(c => c.id === id)
    if (idx < 0) return
    const newIdx = direction === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= sorted.length) return

    const updated = sorted.map((c, i) => {
      if (i === idx) return { ...c, position: sorted[newIdx].position }
      if (i === newIdx) return { ...c, position: sorted[idx].position }
      return c
    })
    setColumns(prev => prev.map(c => {
      const u = updated.find(u => u.id === c.id)
      return u ?? c
    }))
    await db.reorderColumns(updated.map(c => ({ id: c.id, position: c.position })))
  }

  // ─── Card operations ────────────────────────────────────────────────────

  function openAddCard(columnId: string) {
    setCardModal({ open: true, columnId })
  }

  function openEditCard(card: Card) {
    setCardModal({ open: true, card, columnId: card.column_id })
  }

  async function handleSaveCard(data: { title: string; fields: CardFields; color: string; created_by?: string }) {
    if (!activeBoardId) return

    if (cardModal.card) {
      await db.updateCard(cardModal.card.id, { title: data.title, fields: data.fields, color: data.color })
      setCards(prev => prev.map(c => c.id === cardModal.card!.id ? { ...c, title: data.title, fields: data.fields, color: data.color, updated_at: new Date().toISOString() } : c))
    } else {
      const colId = cardModal.columnId!
      const colCards = cards.filter(c => c.column_id === colId)
      const position = colCards.length
      const card = await db.createCard(colId, activeBoardId, data.title, data.fields, data.color, position, data.created_by)
      setCards(prev => [...prev, card])
    }
    setCardModal({ open: false })
  }

  async function handleDeleteCard(id: string) {
    await db.deleteCard(id)
    setCards(prev => prev.filter(c => c.id !== id))
  }

  const handleDragStart = useCallback((cardId: string) => {
    setDraggedCardId(cardId)
  }, [])

  async function handleDrop(cardId: string, targetColumnId: string) {
    const card = cards.find(c => c.id === cardId)
    if (!card || card.column_id === targetColumnId) {
      setDraggedCardId(null)
      return
    }
    const targetCards = cards.filter(c => c.column_id === targetColumnId)
    const position = targetCards.length
    const now = new Date().toISOString()
    await db.updateCard(cardId, { column_id: targetColumnId, position })
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, column_id: targetColumnId, position, updated_at: now } : c))
    setDraggedCardId(null)
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 size={20} className="animate-spin text-zinc-500" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#09090b' }}>
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800 shrink-0">
        {/* Board tabs */}
        <nav className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto">
          {boards.map(board => {
            const locked = board.password && !unlockedBoards.has(board.id)
            return (
              <button
                key={board.id}
                onClick={() => handleBoardClick(board)}
                className={[
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                  board.id === activeBoardId
                    ? 'bg-indigo-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800',
                ].join(' ')}
              >
                {locked && <Lock size={11} className="opacity-70 shrink-0" />}
                {board.name}
              </button>
            )
          })}

          {addingBoard ? (
            <div className="flex items-center gap-1 ml-1">
              <input
                ref={newBoardInputRef}
                autoFocus
                value={newBoardName}
                onChange={e => setNewBoardName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreateBoard()
                  if (e.key === 'Escape') { setAddingBoard(false); setNewBoardName(''); setNewBoardPassword('') }
                }}
                onBlur={() => { if (!newBoardName.trim() && !newBoardPassword.trim()) { setAddingBoard(false) } }}
                placeholder="Nombre del tablero..."
                className="px-2 py-1.5 rounded-lg bg-zinc-800 border border-indigo-500 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none w-40"
              />
              <input
                value={newBoardPassword}
                onChange={e => setNewBoardPassword(e.target.value.replace(/\D/g, '').slice(0, 4))}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreateBoard()
                  if (e.key === 'Escape') { setAddingBoard(false); setNewBoardName(''); setNewBoardPassword('') }
                }}
                placeholder="PIN (opcional)"
                inputMode="numeric"
                type="password"
                maxLength={4}
                className="px-2 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none w-28 tracking-widest text-center font-mono"
              />
              <button onClick={handleCreateBoard} className="px-2 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs text-white transition-colors">
                Crear
              </button>
              <button onClick={() => { setAddingBoard(false); setNewBoardName(''); setNewBoardPassword('') }} className="px-2 py-1.5 text-xs text-zinc-500 hover:text-zinc-300">
                ×
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingBoard(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors ml-1 shrink-0"
              title="Nuevo tablero"
            >
              <Plus size={14} />
            </button>
          )}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {!supabaseReady && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-600 border border-zinc-800 rounded-full px-2.5 py-1">
              <Database size={11} />
              Modo local
            </span>
          )}
          {activeBoard && (
            <button
              onClick={() => setConfigOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <Settings size={14} />
              <span className="hidden sm:inline">Configurar</span>
            </button>
          )}
        </div>
      </header>

      {/* Board area */}
      {!activeBoard ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-4">
          <p className="text-zinc-500 text-sm">
            {boards.length > 0
              ? 'Seleccioná un tablero o ingresá su contraseña para acceder.'
              : 'No hay tableros. Creá uno para empezar.'}
          </p>
          <button
            onClick={() => setAddingBoard(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition-colors"
          >
            <Plus size={16} />
            Nuevo tablero
          </button>
        </div>
      ) : (
        <main className="flex-1 overflow-x-auto overflow-y-hidden p-4">
          <div
            className="flex gap-3 h-full"
            onDragEnd={() => setDraggedCardId(null)}
          >
            {boardColumns.map(col => {
              const colCards = cards
                .filter(c => c.column_id === col.id)
                .sort((a, b) => a.position - b.position)
              return (
                <Column
                  key={col.id}
                  column={col}
                  cards={colCards}
                  board={activeBoard}
                  onAddCard={openAddCard}
                  onEditCard={openEditCard}
                  onDeleteCard={handleDeleteCard}
                  onDeleteColumn={handleDeleteColumn}
                  onRenameColumn={handleRenameColumn}
                  onDrop={handleDrop}
                  onDragStart={handleDragStart}
                />
              )
            })}

            {/* Add column button */}
            <div className="shrink-0 w-72">
              <button
                onClick={() => {
                  const name = prompt('Nombre de la columna:')
                  if (name?.trim()) handleAddColumn(name.trim())
                }}
                className="w-full h-12 flex items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 text-sm text-zinc-600 hover:text-zinc-300 hover:border-zinc-600 transition-colors"
              >
                <Plus size={14} />
                Agregar columna
              </button>
            </div>
          </div>
        </main>
      )}

      {/* Card Modal */}
      {cardModal.open && activeBoard && (
        <CardModal
          board={activeBoard}
          card={cardModal.card}
          columnId={cardModal.columnId}
          onSave={handleSaveCard}
          onClose={() => setCardModal({ open: false })}
        />
      )}

      {/* Config Panel */}
      {configOpen && activeBoard && (
        <ConfigPanel
          board={activeBoard}
          columns={boardColumns}
          onClose={() => setConfigOpen(false)}
          onUpdateBoard={handleUpdateBoard}
          onAddColumn={handleAddColumn}
          onRenameColumn={handleRenameColumn}
          onDeleteColumn={handleDeleteColumn}
          onMoveColumn={handleMoveColumn}
          onDeleteBoard={handleDeleteBoard}
        />
      )}

      {/* Password Modal */}
      {pwdModal.open && (
        <PasswordModal
          boardName={pwdModal.boardName}
          onSubmit={handlePasswordSubmit}
          onCancel={() => setPwdModal({ open: false, boardId: '', boardName: '', error: false })}
          error={pwdModal.error}
        />
      )}
    </div>
  )
}
