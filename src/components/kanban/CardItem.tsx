'use client'

import { Pencil, Trash2, CalendarDays, User, Tag, MessageSquare } from 'lucide-react'
import type { Card, Board } from '@/lib/types'
import { CARD_COLORS, PRIORITY_MAP } from '@/lib/types'

interface Props {
  card: Card
  board: Board
  commentCount?: number
  onEdit: (card: Card) => void
  onDelete: (id: string) => void
  onDragStart: (cardId: string) => void
}

export default function CardItem({ card, board, commentCount = 0, onEdit, onDelete, onDragStart }: Props) {
  const colorDef = CARD_COLORS.find(c => c.value === card.color) ?? CARD_COLORS[0]
  const enabledFields = board.field_config.filter(f => f.enabled).map(f => f.type)

  const priority = card.fields.priority
  const priorityDef = priority ? PRIORITY_MAP[priority] : null

  function formatDate(iso: string) {
    const d = new Date(iso)
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
  }

  const isOverdue = card.fields.due_date
    ? new Date(card.fields.due_date) < new Date() && card.fields.priority !== undefined
    : false

  return (
    <div
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('text/plain', card.id)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart(card.id)
      }}
      className={[
        'group relative rounded-lg border-l-4 p-3 cursor-grab active:cursor-grabbing',
        'border border-zinc-700/50 border-l-4',
        colorDef.border,
        colorDef.bg || 'bg-zinc-800/80',
        'hover:border-zinc-600/70 transition-colors',
      ].join(' ')}
    >
      {/* Actions */}
      <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
        <button
          onClick={() => onEdit(card)}
          className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
        >
          <Pencil size={12} />
        </button>
        <button
          onClick={() => onDelete(card.id)}
          className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-700 transition-colors"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Title */}
      <p className="text-sm font-medium text-zinc-100 pr-10 leading-snug mb-2">{card.title}</p>

      {/* Description */}
      {enabledFields.includes('description') && card.fields.description && (
        <p className="text-xs text-zinc-500 line-clamp-2 mb-2">{card.fields.description}</p>
      )}

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-1.5 mt-1">
        {enabledFields.includes('priority') && priorityDef && (
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${priorityDef.bg} ${priorityDef.color}`}>
            {priorityDef.label}
          </span>
        )}

        {enabledFields.includes('due_date') && card.fields.due_date && (
          <span className={`inline-flex items-center gap-1 text-[10px] ${isOverdue ? 'text-red-400' : 'text-zinc-500'}`}>
            <CalendarDays size={10} />
            {formatDate(card.fields.due_date)}
          </span>
        )}

        {enabledFields.includes('assignee') && card.fields.assignee && (
          <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500">
            <User size={10} />
            {card.fields.assignee}
          </span>
        )}
      </div>

      {/* Comment count */}
      {commentCount > 0 && (
        <div className="flex items-center gap-1 mt-1.5 text-[10px] text-zinc-600">
          <MessageSquare size={10} />
          {commentCount} {commentCount === 1 ? 'comentario' : 'comentarios'}
        </div>
      )}

      {/* Tags */}
      {enabledFields.includes('tags') && card.fields.tags && card.fields.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {card.fields.tags.map(tag => (
            <span key={tag} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] bg-zinc-700 text-zinc-400">
              <Tag size={8} />
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
