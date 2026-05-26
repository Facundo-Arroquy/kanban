'use client'

import { useState, useRef } from 'react'
import { Plus, Trash2, Check, X, GripVertical } from 'lucide-react'
import type { Card, Board, Column as ColumnType } from '@/lib/types'
import CardItem from './CardItem'

interface Props {
  column: ColumnType
  cards: Card[]
  board: Board
  onAddCard: (columnId: string) => void
  onEditCard: (card: Card) => void
  onDeleteCard: (id: string) => void
  onDeleteColumn: (id: string) => void
  onRenameColumn: (id: string, name: string) => void
  onDrop: (cardId: string, targetColumnId: string) => void
  onDragStart: (cardId: string) => void
}

export default function Column({
  column, cards, board,
  onAddCard, onEditCard, onDeleteCard, onDeleteColumn, onRenameColumn,
  onDrop, onDragStart,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(column.name)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit() {
    setEditing(true)
    setName(column.name)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function commitRename() {
    const trimmed = name.trim()
    if (trimmed && trimmed !== column.name) onRenameColumn(column.id, trimmed)
    else setName(column.name)
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commitRename()
    if (e.key === 'Escape') { setName(column.name); setEditing(false) }
  }

  return (
    <div
      className={[
        'flex flex-col w-72 shrink-0 rounded-xl border transition-colors',
        dragOver ? 'border-indigo-500/60 bg-zinc-900' : 'border-zinc-800 bg-zinc-900/60',
      ].join(' ')}
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => {
        e.preventDefault()
        const cardId = e.dataTransfer.getData('text/plain')
        if (cardId) onDrop(cardId, column.id)
        setDragOver(false)
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-zinc-800">
        <GripVertical size={14} className="text-zinc-600 shrink-0" />

        {editing ? (
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <input
              ref={inputRef}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={commitRename}
              className="flex-1 min-w-0 px-2 py-0.5 rounded bg-zinc-800 border border-indigo-500 text-sm text-zinc-100 focus:outline-none"
            />
            <button onClick={commitRename} className="p-1 text-green-400 hover:text-green-300">
              <Check size={12} />
            </button>
            <button onClick={() => { setName(column.name); setEditing(false) }} className="p-1 text-zinc-500 hover:text-zinc-300">
              <X size={12} />
            </button>
          </div>
        ) : (
          <button
            onClick={startEdit}
            className="flex-1 min-w-0 text-left text-sm font-medium text-zinc-200 hover:text-white truncate"
            title="Clic para renombrar"
          >
            {column.name}
          </button>
        )}

        <span className="text-xs text-zinc-600 tabular-nums shrink-0">{cards.length}</span>

        <button
          onClick={() => onDeleteColumn(column.id)}
          className="p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-colors shrink-0"
          title="Eliminar columna"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-16">
        {cards.map(card => (
          <CardItem
            key={card.id}
            card={card}
            board={board}
            onEdit={onEditCard}
            onDelete={onDeleteCard}
            onDragStart={id => {
              onDragStart(id)
            }}
          />
        ))}
        {dragOver && cards.length === 0 && (
          <div className="h-16 rounded-lg border-2 border-dashed border-indigo-500/40 bg-indigo-950/10" />
        )}
      </div>

      {/* Add card */}
      <div className="p-2 border-t border-zinc-800">
        <button
          onClick={() => onAddCard(column.id)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
        >
          <Plus size={14} />
          Agregar tarjeta
        </button>
      </div>
    </div>
  )
}
