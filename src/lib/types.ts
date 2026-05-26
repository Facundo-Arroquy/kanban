export type FieldType = 'description' | 'due_date' | 'priority' | 'assignee' | 'tags'

export type Priority = 'high' | 'medium' | 'low'

export interface FieldConfig {
  type: FieldType
  enabled: boolean
  label: string
}

export interface Board {
  id: string
  name: string
  field_config: FieldConfig[]
  created_at?: string
}

export interface Column {
  id: string
  board_id: string
  name: string
  position: number
}

export interface CardFields {
  description?: string
  due_date?: string
  priority?: Priority
  assignee?: string
  tags?: string[]
}

export interface Card {
  id: string
  column_id: string
  board_id: string
  title: string
  fields: CardFields
  position: number
  color?: string
}

export interface Comment {
  id: string
  card_id: string
  body: string
  author: string
  created_at: string
}

// Color palette para tarjetas
export const CARD_COLORS = [
  { value: '', label: 'Sin color', border: 'border-l-zinc-700', bg: '' },
  { value: 'indigo', label: 'Violeta', border: 'border-l-indigo-500', bg: 'bg-indigo-950/20' },
  { value: 'blue', label: 'Azul', border: 'border-l-blue-500', bg: 'bg-blue-950/20' },
  { value: 'green', label: 'Verde', border: 'border-l-green-500', bg: 'bg-green-950/20' },
  { value: 'yellow', label: 'Amarillo', border: 'border-l-yellow-400', bg: 'bg-yellow-950/20' },
  { value: 'pink', label: 'Rosa', border: 'border-l-pink-500', bg: 'bg-pink-950/20' },
  { value: 'red', label: 'Rojo', border: 'border-l-red-500', bg: 'bg-red-950/20' },
] as const

export const PRIORITY_MAP = {
  high: { label: 'Alta', color: 'text-red-400', bg: 'bg-red-950/50 border border-red-900' },
  medium: { label: 'Media', color: 'text-yellow-400', bg: 'bg-yellow-950/50 border border-yellow-900' },
  low: { label: 'Baja', color: 'text-green-400', bg: 'bg-green-950/50 border border-green-900' },
} as const

export const ALL_FIELDS: { type: FieldType; label: string }[] = [
  { type: 'description', label: 'Descripción' },
  { type: 'priority', label: 'Prioridad' },
  { type: 'due_date', label: 'Vencimiento' },
  { type: 'assignee', label: 'Asignado a' },
  { type: 'tags', label: 'Etiquetas' },
]
