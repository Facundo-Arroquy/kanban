'use client'

import { useState } from 'react'
import { X, Plus, Trash2, ChevronUp, ChevronDown, AlertTriangle } from 'lucide-react'
import type { Board, Column, FieldConfig } from '@/lib/types'
import { ALL_FIELDS } from '@/lib/types'

interface Props {
  board: Board
  columns: Column[]
  onClose: () => void
  onUpdateBoard: (updates: { name?: string; field_config?: FieldConfig[] }) => void
  onAddColumn: (name: string) => void
  onRenameColumn: (id: string, name: string) => void
  onDeleteColumn: (id: string) => void
  onMoveColumn: (id: string, direction: 'up' | 'down') => void
  onDeleteBoard: () => void
}

export default function ConfigPanel({
  board, columns,
  onClose, onUpdateBoard, onAddColumn, onRenameColumn, onDeleteColumn, onMoveColumn, onDeleteBoard,
}: Props) {
  const [boardName, setBoardName] = useState(board.name)
  const [newColName, setNewColName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editingColId, setEditingColId] = useState<string | null>(null)
  const [editingColName, setEditingColName] = useState('')

  function saveBoardName() {
    const trimmed = boardName.trim()
    if (trimmed && trimmed !== board.name) onUpdateBoard({ name: trimmed })
  }

  function toggleField(type: FieldConfig['type']) {
    const updated = board.field_config.map(f =>
      f.type === type ? { ...f, enabled: !f.enabled } : f
    )
    onUpdateBoard({ field_config: updated })
  }

  function handleAddColumn() {
    const name = newColName.trim()
    if (!name) return
    onAddColumn(name)
    setNewColName('')
  }

  function commitColRename(id: string) {
    const name = editingColName.trim()
    if (name) onRenameColumn(id, name)
    setEditingColId(null)
  }

  const sortedColumns = [...columns].sort((a, b) => a.position - b.position)

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* Backdrop */}
      <div className="flex-1" onClick={onClose} />

      {/* Panel */}
      <div className="w-80 h-full bg-zinc-900 border-l border-zinc-800 flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
          <h2 className="text-sm font-semibold text-zinc-100">Configuración del tablero</h2>
          <button onClick={onClose} className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-7">
          {/* Nombre */}
          <section>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Nombre del tablero</h3>
            <div className="flex gap-2">
              <input
                value={boardName}
                onChange={e => setBoardName(e.target.value)}
                onBlur={saveBoardName}
                onKeyDown={e => { if (e.key === 'Enter') saveBoardName() }}
                className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-colors"
              />
            </div>
          </section>

          {/* Campos */}
          <section>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Campos de tarjeta</h3>
            <div className="space-y-1">
              {/* Título siempre activo */}
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-800/50">
                <span className="text-sm text-zinc-300">Título</span>
                <span className="text-xs text-zinc-600 italic">siempre visible</span>
              </div>

              {ALL_FIELDS.map(({ type, label }) => {
                const config = board.field_config.find(f => f.type === type)
                const enabled = config?.enabled ?? false
                return (
                  <label
                    key={type}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-zinc-800/50 cursor-pointer transition-colors"
                  >
                    <span className="text-sm text-zinc-300">{label}</span>
                    <button
                      type="button"
                      onClick={() => toggleField(type)}
                      className={[
                        'relative w-9 h-5 rounded-full transition-colors focus:outline-none',
                        enabled ? 'bg-indigo-600' : 'bg-zinc-700',
                      ].join(' ')}
                    >
                      <span className={[
                        'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                        enabled ? 'translate-x-4' : 'translate-x-0',
                      ].join(' ')} />
                    </button>
                  </label>
                )
              })}
            </div>
          </section>

          {/* Columnas */}
          <section>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Columnas</h3>
            <div className="space-y-1 mb-3">
              {sortedColumns.map((col, i) => (
                <div key={col.id} className="flex items-center gap-2 group">
                  {editingColId === col.id ? (
                    <input
                      autoFocus
                      value={editingColName}
                      onChange={e => setEditingColName(e.target.value)}
                      onBlur={() => commitColRename(col.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') commitColRename(col.id)
                        if (e.key === 'Escape') setEditingColId(null)
                      }}
                      className="flex-1 px-2 py-1.5 rounded-lg bg-zinc-800 border border-indigo-500 text-sm text-zinc-100 focus:outline-none"
                    />
                  ) : (
                    <button
                      onClick={() => { setEditingColId(col.id); setEditingColName(col.name) }}
                      className="flex-1 text-left px-3 py-1.5 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800 transition-colors truncate"
                    >
                      {col.name}
                    </button>
                  )}

                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      disabled={i === 0}
                      onClick={() => onMoveColumn(col.id, 'up')}
                      className="p-1 rounded text-zinc-500 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronUp size={12} />
                    </button>
                    <button
                      disabled={i === sortedColumns.length - 1}
                      onClick={() => onMoveColumn(col.id, 'down')}
                      className="p-1 rounded text-zinc-500 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronDown size={12} />
                    </button>
                    <button
                      onClick={() => onDeleteColumn(col.id)}
                      className="p-1 rounded text-zinc-600 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                value={newColName}
                onChange={e => setNewColName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddColumn() }}
                placeholder="Nueva columna..."
                className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-colors"
              />
              <button
                onClick={handleAddColumn}
                disabled={!newColName.trim()}
                className="px-3 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-sm text-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus size={14} />
              </button>
            </div>
          </section>

          {/* Zona peligrosa */}
          <section className="border border-red-900/50 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <AlertTriangle size={12} />
              Zona peligrosa
            </h3>
            {confirmDelete ? (
              <div className="space-y-2">
                <p className="text-xs text-zinc-400">¿Eliminar el tablero y todas sus tarjetas?</p>
                <div className="flex gap-2">
                  <button
                    onClick={onDeleteBoard}
                    className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-red-700 hover:bg-red-600 text-white transition-colors"
                  >
                    Sí, eliminar
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full px-3 py-2 rounded-lg text-sm text-red-400 border border-red-900/70 hover:bg-red-950/30 transition-colors"
              >
                Eliminar tablero
              </button>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
