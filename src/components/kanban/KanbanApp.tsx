'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Settings, Plus, Loader2, Database } from 'lucide-react'
import type { Board, Column as ColumnType, Card, CardFields, FieldConfig } from '@/lib/types'
import * as db from '@/lib/db'
import { isSupabaseConfigured } from '@/lib/supabase'
import Column from './Column'
import CardModal from './CardModal'
import ConfigPanel from './ConfigPanel'

interface CardModalState {
  open: boolean
  card?: Card
  columnId?: string
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
  const [addingBoard, setAddingBoard] = useState(false)
  const newBoardInputRef = useRef<HTMLInputElement>(null)

  const supabaseReady = isSupabaseConfigured()

  // Carga inicial
  useEffect(() => {
    db.getBoards().then(bs => {
      setBoards(bs)
      if (bs.length > 0) setActiveBoardId(bs[0].id)
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
    const board = await db.createBoard(name)
    setBoards(prev => [...prev, board])
    setActiveBoardId(board.id)
    setColumns(prev => prev) // columns empty for new board
    setCards(prev => prev.filter(c => c.board_id !== board.id))
    setNewBoardName('')
    setAddingBoard(false)
  }

  async function handleUpdateBoard(updates: { name?: string; field_config?: FieldConfig[] }) {
    if (!activeBoardId) return
    await db.updateBoard(activeBoardId, updates)
    setBoards(prev => prev.map(b => b.id === activeBoardId ? { ...b, ...updates } : b))
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

    // Swap positions
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

  async function handleSaveCard(data: { title: string; fields: CardFields; color: string }) {
    if (!activeBoardId) return

    if (cardModal.card) {
      // Edit
      await db.updateCard(cardModal.card.id, data)
      setCards(prev => prev.map(c => c.id === cardModal.card!.id ? { ...c, ...data } : c))
    } else {
      // Create
      const colId = cardModal.columnId!
      const colCards = cards.filter(c => c.column_id === colId)
      const position = colCards.length
      const card = await db.createCard(colId, activeBoardId, data.title, data.fields, data.color, position)
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
    await db.updateCard(cardId, { column_id: targetColumnId, position })
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, column_id: targetColumnId, position } : c))
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
          {boards.map(board => (
            <button
              key={board.id}
              onClick={() => setActiveBoardId(board.id)}
              className={[
                'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                board.id === activeBoardId
                  ? 'bg-indigo-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800',
              ].join(' ')}
            >
              {board.name}
            </button>
          ))}

          {addingBoard ? (
            <div className="flex items-center gap-1 ml-1">
              <input
                ref={newBoardInputRef}
                autoFocus
                value={newBoardName}
                onChange={e => setNewBoardName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreateBoard()
                  if (e.key === 'Escape') { setAddingBoard(false); setNewBoardName('') }
                }}
                onBlur={() => { if (!newBoardName.trim()) { setAddingBoard(false) } }}
                placeholder="Nombre del tablero..."
                className="px-2 py-1.5 rounded-lg bg-zinc-800 border border-indigo-500 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none w-44"
              />
              <button onClick={handleCreateBoard} className="px-2 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs text-white transition-colors">
                Crear
              </button>
              <button onClick={() => { setAddingBoard(false); setNewBoardName('') }} className="px-2 py-1.5 text-xs text-zinc-500 hover:text-zinc-300">
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
          <p className="text-zinc-500 text-sm">No hay tableros. Creá uno para empezar.</p>
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
    </div>
  )
}
