/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseClient, isSupabaseConfigured } from './supabase'
import type { Board, Column, Card, CardFields, FieldConfig, Comment, CardPhoto } from './types'
import { SAMPLE_BOARDS, SAMPLE_COLUMNS, SAMPLE_CARDS } from './sample-data'

// In-memory store (usado cuando Supabase no está configurado)
const store = {
  boards: structuredClone(SAMPLE_BOARDS) as Board[],
  columns: structuredClone(SAMPLE_COLUMNS) as Column[],
  cards: structuredClone(SAMPLE_CARDS) as Card[],
  comments: [] as Comment[],
  photos: [] as CardPhoto[],
}

function uid(): string {
  return crypto.randomUUID()
}

function sb() {
  return getSupabaseClient() as any
}

// ─── BOARDS ────────────────────────────────────────────────────────────────

export async function getBoards(): Promise<Board[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await sb().from('boards').select('*').order('created_at')
    if (error) throw error
    return (data ?? []) as Board[]
  }
  return structuredClone(store.boards)
}

export async function createBoard(name: string, password?: string): Promise<Board> {
  const board: Board = {
    id: uid(),
    name,
    ...(password ? { password } : {}),
    field_config: [
      { type: 'description', enabled: true, label: 'Descripción' },
      { type: 'priority', enabled: true, label: 'Prioridad' },
      { type: 'due_date', enabled: false, label: 'Vencimiento' },
      { type: 'assignee', enabled: false, label: 'Asignado a' },
      { type: 'tags', enabled: false, label: 'Etiquetas' },
    ],
  }
  if (isSupabaseConfigured()) {
    const { data, error } = await sb().from('boards').insert(board).select().single()
    if (error) throw error
    return data as Board
  }
  store.boards.push(board)
  return structuredClone(board)
}

export async function updateBoard(id: string, updates: { name?: string; field_config?: FieldConfig[]; password?: string | null }): Promise<void> {
  if (isSupabaseConfigured()) {
    const { error } = await sb().from('boards').update(updates).eq('id', id)
    if (error) throw error
    return
  }
  const idx = store.boards.findIndex(b => b.id === id)
  if (idx !== -1) {
    const { password, ...rest } = updates
    const passwordUpdate = password === null ? { password: undefined } : password !== undefined ? { password } : {}
    store.boards[idx] = { ...store.boards[idx], ...rest, ...passwordUpdate }
  }
}

export async function deleteBoard(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const { error } = await sb().from('boards').delete().eq('id', id)
    if (error) throw error
    return
  }
  store.boards = store.boards.filter(b => b.id !== id)
  store.columns = store.columns.filter(c => c.board_id !== id)
  store.cards = store.cards.filter(c => c.board_id !== id)
}

// ─── COLUMNS ───────────────────────────────────────────────────────────────

export async function getColumns(boardId: string): Promise<Column[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await sb().from('columns').select('*').eq('board_id', boardId).order('position')
    if (error) throw error
    return (data ?? []) as Column[]
  }
  return structuredClone(
    store.columns.filter(c => c.board_id === boardId).sort((a, b) => a.position - b.position)
  )
}

export async function createColumn(boardId: string, name: string, position: number): Promise<Column> {
  const column: Column = { id: uid(), board_id: boardId, name, position }
  if (isSupabaseConfigured()) {
    const { data, error } = await sb().from('columns').insert(column).select().single()
    if (error) throw error
    return data as Column
  }
  store.columns.push(column)
  return structuredClone(column)
}

export async function updateColumn(id: string, updates: { name?: string; position?: number }): Promise<void> {
  if (isSupabaseConfigured()) {
    const { error } = await sb().from('columns').update(updates).eq('id', id)
    if (error) throw error
    return
  }
  const idx = store.columns.findIndex(c => c.id === id)
  if (idx !== -1) store.columns[idx] = { ...store.columns[idx], ...updates }
}

export async function deleteColumn(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const { error } = await sb().from('columns').delete().eq('id', id)
    if (error) throw error
    return
  }
  store.columns = store.columns.filter(c => c.id !== id)
  store.cards = store.cards.filter(c => c.column_id !== id)
}

export async function reorderColumns(updates: { id: string; position: number }[]): Promise<void> {
  if (isSupabaseConfigured()) {
    await Promise.all(updates.map(u => sb().from('columns').update({ position: u.position }).eq('id', u.id)))
    return
  }
  updates.forEach(u => {
    const idx = store.columns.findIndex(c => c.id === u.id)
    if (idx !== -1) store.columns[idx].position = u.position
  })
}

// ─── CARDS ─────────────────────────────────────────────────────────────────

export async function getCards(boardId: string): Promise<Card[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await sb().from('cards').select('*').eq('board_id', boardId).order('position')
    if (error) throw error
    return (data ?? []) as Card[]
  }
  return structuredClone(
    store.cards.filter(c => c.board_id === boardId).sort((a, b) => a.position - b.position)
  )
}

export async function createCard(
  columnId: string,
  boardId: string,
  title: string,
  fields: CardFields,
  color: string,
  position: number
): Promise<Card> {
  const card: Card = { id: uid(), column_id: columnId, board_id: boardId, title, fields, position, color }
  if (isSupabaseConfigured()) {
    const { data, error } = await sb().from('cards').insert(card).select().single()
    if (error) throw error
    return data as Card
  }
  store.cards.push(card)
  return structuredClone(card)
}

export async function updateCard(
  id: string,
  updates: { title?: string; fields?: CardFields; color?: string; column_id?: string; position?: number }
): Promise<void> {
  if (isSupabaseConfigured()) {
    const { error } = await sb().from('cards').update(updates).eq('id', id)
    if (error) throw error
    return
  }
  const idx = store.cards.findIndex(c => c.id === id)
  if (idx !== -1) store.cards[idx] = { ...store.cards[idx], ...updates }
}

export async function deleteCard(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const { error } = await sb().from('cards').delete().eq('id', id)
    if (error) throw error
    return
  }
  store.cards = store.cards.filter(c => c.id !== id)
  store.comments = store.comments.filter(c => c.card_id !== id)
  store.photos = store.photos.filter(p => p.card_id !== id)
}

// ─── COMMENTS ──────────────────────────────────────────────────────────────

export async function getComments(cardId: string): Promise<Comment[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await sb().from('comments').select('*').eq('card_id', cardId).order('created_at')
    if (error) throw error
    return (data ?? []) as Comment[]
  }
  return store.comments.filter(c => c.card_id === cardId).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
}

export async function addComment(cardId: string, body: string, author: string): Promise<Comment> {
  const comment: Comment = {
    id: uid(),
    card_id: cardId,
    body,
    author,
    created_at: new Date().toISOString(),
  }
  if (isSupabaseConfigured()) {
    const { data, error } = await sb().from('comments').insert(comment).select().single()
    if (error) throw error
    return data as Comment
  }
  store.comments.push(comment)
  return structuredClone(comment)
}

export async function deleteComment(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const { error } = await sb().from('comments').delete().eq('id', id)
    if (error) throw error
    return
  }
  store.comments = store.comments.filter(c => c.id !== id)
}

// ─── PHOTOS ────────────────────────────────────────────────────────────────

export async function getPhotos(cardId: string): Promise<CardPhoto[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await sb().from('card_photos').select('*').eq('card_id', cardId).order('created_at')
    if (error) throw error
    return (data ?? []) as CardPhoto[]
  }
  return store.photos
    .filter(p => p.card_id === cardId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
}

export async function addPhoto(cardId: string, data: string, name?: string): Promise<CardPhoto> {
  const photo: CardPhoto = {
    id: uid(),
    card_id: cardId,
    data,
    name,
    created_at: new Date().toISOString(),
  }
  if (isSupabaseConfigured()) {
    const { data: saved, error } = await sb().from('card_photos').insert(photo).select().single()
    if (error) throw new Error(error.message ?? 'Error al guardar la foto')
    return saved as CardPhoto
  }
  store.photos.push(photo)
  return structuredClone(photo)
}

export async function deletePhoto(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const { error } = await sb().from('card_photos').delete().eq('id', id)
    if (error) throw new Error(error.message ?? 'Error al eliminar la foto')
    return
  }
  store.photos = store.photos.filter(p => p.id !== id)
}
