import type { Board, Column, Card } from './types'

export const SAMPLE_BOARDS: Board[] = [
  {
    id: 'board-1',
    name: 'Proyecto Alpha',
    field_config: [
      { type: 'description', enabled: true, label: 'Descripción' },
      { type: 'priority', enabled: true, label: 'Prioridad' },
      { type: 'due_date', enabled: true, label: 'Vencimiento' },
      { type: 'assignee', enabled: true, label: 'Asignado a' },
      { type: 'tags', enabled: false, label: 'Etiquetas' },
    ],
  },
  {
    id: 'board-2',
    name: 'Marketing Q2',
    field_config: [
      { type: 'description', enabled: false, label: 'Descripción' },
      { type: 'priority', enabled: true, label: 'Prioridad' },
      { type: 'due_date', enabled: true, label: 'Vencimiento' },
      { type: 'assignee', enabled: false, label: 'Asignado a' },
      { type: 'tags', enabled: true, label: 'Etiquetas' },
    ],
  },
]

export const SAMPLE_COLUMNS: Column[] = [
  { id: 'col-1', board_id: 'board-1', name: 'Backlog', position: 0 },
  { id: 'col-2', board_id: 'board-1', name: 'En progreso', position: 1 },
  { id: 'col-3', board_id: 'board-1', name: 'Revisión', position: 2 },
  { id: 'col-4', board_id: 'board-1', name: 'Hecho', position: 3 },
  { id: 'col-5', board_id: 'board-2', name: 'Ideas', position: 0 },
  { id: 'col-6', board_id: 'board-2', name: 'En curso', position: 1 },
  { id: 'col-7', board_id: 'board-2', name: 'Publicado', position: 2 },
]

export const SAMPLE_CARDS: Card[] = [
  {
    id: 'card-1', column_id: 'col-1', board_id: 'board-1', position: 0, color: 'indigo',
    title: 'Diseñar wireframes',
    fields: { priority: 'high', assignee: 'Ana García', due_date: '2026-06-15', description: 'Crear wireframes para todas las pantallas principales de la app.' },
  },
  {
    id: 'card-2', column_id: 'col-1', board_id: 'board-1', position: 1,
    title: 'Definir requirements técnicos',
    fields: { priority: 'medium', assignee: 'Carlos López' },
  },
  {
    id: 'card-3', column_id: 'col-2', board_id: 'board-1', position: 0, color: 'blue',
    title: 'Desarrollar API REST',
    fields: { priority: 'high', assignee: 'Carlos López', due_date: '2026-06-20', description: 'Endpoints de usuarios, autenticación y recursos principales.' },
  },
  {
    id: 'card-4', column_id: 'col-2', board_id: 'board-1', position: 1,
    title: 'Integrar Supabase',
    fields: { priority: 'high', assignee: 'Ana García' },
  },
  {
    id: 'card-5', column_id: 'col-3', board_id: 'board-1', position: 0,
    title: 'Testing de componentes',
    fields: { priority: 'low', assignee: 'Marcos Ruiz', due_date: '2026-06-18' },
  },
  {
    id: 'card-6', column_id: 'col-4', board_id: 'board-1', position: 0, color: 'green',
    title: 'Setup inicial del proyecto',
    fields: { priority: 'medium', assignee: 'Carlos López', description: 'Configuración de Next.js, Tailwind y estructura de carpetas.' },
  },
  {
    id: 'card-7', column_id: 'col-5', board_id: 'board-2', position: 0, color: 'pink',
    title: 'Campaign de verano',
    fields: { priority: 'high', tags: ['redes', 'email'], due_date: '2026-07-01' },
  },
  {
    id: 'card-8', column_id: 'col-6', board_id: 'board-2', position: 0,
    title: 'Newsletter junio',
    fields: { priority: 'medium', tags: ['email'], due_date: '2026-06-30' },
  },
  {
    id: 'card-9', column_id: 'col-6', board_id: 'board-2', position: 1, color: 'yellow',
    title: 'Contenido para Instagram',
    fields: { priority: 'low', tags: ['redes', 'diseño'], due_date: '2026-06-25' },
  },
]
