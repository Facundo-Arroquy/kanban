'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Tag, MessageSquare, Trash2, Send, Loader2, Camera } from 'lucide-react'
import type { Card, Board, CardFields, Priority, Comment, CardPhoto } from '@/lib/types'
import { CARD_COLORS, ALL_FIELDS } from '@/lib/types'
import * as db from '@/lib/db'

interface Props {
  board: Board
  card?: Card
  columnId?: string
  onSave: (data: { title: string; fields: CardFields; color: string; created_by?: string }) => void
  onClose: () => void
}

export default function CardModal({ board, card, onSave, onClose }: Props) {
  const [title, setTitle] = useState(card?.title ?? '')
  const [color, setColor] = useState(card?.color ?? '')
  const [fields, setFields] = useState<CardFields>(card?.fields ?? {})
  const [tagInput, setTagInput] = useState('')
  const [createdBy, setCreatedBy] = useState(card?.created_by ?? '')
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'photos'>('details')

  // Comments state
  const [comments, setComments] = useState<Comment[]>([])
  const [commentBody, setCommentBody] = useState('')
  const [commentAuthor, setCommentAuthor] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)
  const [submittingComment, setSubmittingComment] = useState(false)

  // Photos state
  const [photos, setPhotos] = useState<CardPhoto[]>([])
  const [loadingPhotos, setLoadingPhotos] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [lightboxPhoto, setLightboxPhoto] = useState<CardPhoto | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const enabledFields = board.field_config.filter(f => f.enabled).map(f => f.type)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightboxPhoto(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!card || activeTab !== 'comments') return
    setLoadingComments(true)
    db.getComments(card.id)
      .then(setComments)
      .finally(() => setLoadingComments(false))
  }, [card, activeTab])

  useEffect(() => {
    if (!card || activeTab !== 'photos') return
    setLoadingPhotos(true)
    db.getPhotos(card.id)
      .then(setPhotos)
      .finally(() => setLoadingPhotos(false))
  }, [card, activeTab])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    onSave({ title: title.trim(), fields, color, created_by: createdBy.trim() || undefined })
  }

  function setField<K extends keyof CardFields>(key: K, value: CardFields[K]) {
    setFields(prev => ({ ...prev, [key]: value }))
  }

  function addTag() {
    const tag = tagInput.trim()
    if (!tag) return
    const current = fields.tags ?? []
    if (!current.includes(tag)) setField('tags', [...current, tag])
    setTagInput('')
  }

  function removeTag(tag: string) {
    setField('tags', (fields.tags ?? []).filter(t => t !== tag))
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault()
    if (!commentBody.trim() || !card) return
    setSubmittingComment(true)
    try {
      const comment = await db.addComment(card.id, commentBody.trim(), commentAuthor.trim() || 'Yo')
      setComments(prev => [...prev, comment])
      setCommentBody('')
    } finally {
      setSubmittingComment(false)
    }
  }

  async function handleDeleteComment(id: string) {
    await db.deleteComment(id)
    setComments(prev => prev.filter(c => c.id !== id))
  }

  function readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function handleUploadPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length || !card) return
    setPhotoError(null)
    setUploadingPhoto(true)
    try {
      for (const file of files) {
        const data = await readFileAsBase64(file)
        const photo = await db.addPhoto(card.id, data, file.name)
        setPhotos(prev => [...prev, photo])
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al subir la foto'
      setPhotoError(msg.includes('relation') || msg.includes('does not exist')
        ? 'Tabla "card_photos" no existe en Supabase. Ejecutá el SQL de migración en el panel de Supabase.'
        : msg)
    } finally {
      setUploadingPhoto(false)
      e.target.value = ''
    }
  }

  async function handleDeletePhoto(id: string) {
    try {
      await db.deletePhoto(id)
      setPhotos(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Error al eliminar la foto')
    }
  }

  function formatCommentDate(iso: string) {
    const d = new Date(iso)
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
          <h2 className="text-sm font-semibold text-zinc-100">
            {card ? 'Editar tarjeta' : 'Nueva tarjeta'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Tabs (solo para tarjetas existentes) */}
        {card && (
          <div className="flex border-b border-zinc-800 shrink-0">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === 'details'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Detalles
            </button>
            <button
              onClick={() => setActiveTab('comments')}
              className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
                activeTab === 'comments'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <MessageSquare size={13} />
              Comentarios
              {comments.length > 0 && (
                <span className="text-xs bg-zinc-700 text-zinc-300 rounded-full px-1.5 py-0.5 leading-none">
                  {comments.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('photos')}
              className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
                activeTab === 'photos'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Camera size={13} />
              Fotos
              {photos.length > 0 && (
                <span className="text-xs bg-zinc-700 text-zinc-300 rounded-full px-1.5 py-0.5 leading-none">
                  {photos.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* ── Details tab ── */}
          {activeTab === 'details' && (
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Título */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Título *</label>
                <input
                  ref={inputRef}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="¿Qué hay que hacer?"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-colors"
                />
              </div>

              {/* Descripción */}
              {enabledFields.includes('description') && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    {ALL_FIELDS.find(f => f.type === 'description')?.label}
                  </label>
                  <textarea
                    value={fields.description ?? ''}
                    onChange={e => setField('description', e.target.value)}
                    placeholder="Descripción opcional..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-colors resize-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {enabledFields.includes('priority') && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Prioridad</label>
                    <select
                      value={fields.priority ?? ''}
                      onChange={e => setField('priority', (e.target.value as Priority) || undefined)}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-colors"
                    >
                      <option value="">Sin prioridad</option>
                      <option value="high">Alta</option>
                      <option value="medium">Media</option>
                      <option value="low">Baja</option>
                    </select>
                  </div>
                )}

                {enabledFields.includes('due_date') && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Vencimiento</label>
                    <input
                      type="date"
                      value={fields.due_date ?? ''}
                      onChange={e => setField('due_date', e.target.value || undefined)}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-colors [color-scheme:dark]"
                    />
                  </div>
                )}

                {enabledFields.includes('assignee') && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Asignado a</label>
                    <input
                      value={fields.assignee ?? ''}
                      onChange={e => setField('assignee', e.target.value || undefined)}
                      placeholder="Nombre..."
                      className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-colors"
                    />
                  </div>
                )}
              </div>

              {/* Tags */}
              {enabledFields.includes('tags') && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Etiquetas</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                      placeholder="Nueva etiqueta..."
                      className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-colors"
                    />
                    <button type="button" onClick={addTag} className="px-3 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-sm text-zinc-200 transition-colors">+</button>
                  </div>
                  {fields.tags && fields.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {fields.tags.map(tag => (
                        <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-zinc-700 text-zinc-300">
                          <Tag size={10} />{tag}
                          <button type="button" onClick={() => removeTag(tag)} className="text-zinc-500 hover:text-zinc-200 ml-0.5">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Creado por */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  {card ? 'Creado por' : 'Tu nombre'}
                </label>
                <input
                  value={createdBy}
                  onChange={e => setCreatedBy(e.target.value)}
                  placeholder="Nombre de quien crea la tarjeta..."
                  readOnly={!!card}
                  className={[
                    'w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors',
                    card ? 'opacity-60 cursor-not-allowed' : 'focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50',
                  ].join(' ')}
                />
              </div>

              {/* Color */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-2">Color de tarjeta</label>
                <div className="flex gap-2">
                  {CARD_COLORS.map(c => (
                    <button key={c.value} type="button" onClick={() => setColor(c.value)} title={c.label}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${color === c.value ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                    >
                      {c.value === '' && <span className="block w-full h-full rounded-full bg-zinc-700" />}
                      {c.value === 'indigo' && <span className="block w-full h-full rounded-full bg-indigo-500" />}
                      {c.value === 'blue' && <span className="block w-full h-full rounded-full bg-blue-500" />}
                      {c.value === 'green' && <span className="block w-full h-full rounded-full bg-green-500" />}
                      {c.value === 'yellow' && <span className="block w-full h-full rounded-full bg-yellow-400" />}
                      {c.value === 'pink' && <span className="block w-full h-full rounded-full bg-pink-500" />}
                      {c.value === 'red' && <span className="block w-full h-full rounded-full bg-red-500" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={!title.trim()}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  {card ? 'Guardar cambios' : 'Crear tarjeta'}
                </button>
              </div>
            </form>
          )}

          {/* ── Photos tab ── */}
          {activeTab === 'photos' && (
            <div className="p-5 flex flex-col gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleUploadPhotos}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-zinc-700 text-sm text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingPhoto ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                {uploadingPhoto ? 'Subiendo...' : 'Agregar fotos'}
              </button>

              {photoError && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-950/50 border border-red-900 text-xs text-red-400">
                  <span className="shrink-0 mt-0.5">✕</span>
                  <span>{photoError}</span>
                </div>
              )}

              {loadingPhotos ? (
                <div className="flex justify-center py-6">
                  <Loader2 size={18} className="animate-spin text-zinc-600" />
                </div>
              ) : photos.length === 0 ? (
                <p className="text-center text-sm text-zinc-600 py-6">Sin fotos todavía.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map(photo => (
                    <div key={photo.id} className="group relative aspect-square rounded-lg overflow-hidden bg-zinc-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.data}
                        alt={photo.name ?? 'Foto'}
                        onClick={() => setLightboxPhoto(photo)}
                        className="w-full h-full object-cover cursor-zoom-in"
                      />
                      <button
                        onClick={() => handleDeletePhoto(photo.id)}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 rounded bg-black/70 text-white hover:text-red-400 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Comments tab ── */}
          {activeTab === 'comments' && (
            <div className="p-5 flex flex-col gap-4">
              {/* Add comment */}
              <form onSubmit={handleAddComment} className="space-y-2">
                <input
                  value={commentAuthor}
                  onChange={e => setCommentAuthor(e.target.value)}
                  placeholder="Tu nombre (opcional)"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-colors"
                />
                <div className="flex gap-2">
                  <textarea
                    value={commentBody}
                    onChange={e => setCommentBody(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddComment(e) }}
                    placeholder="Escribe un comentario... (Cmd+Enter para enviar)"
                    rows={3}
                    className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-colors resize-none"
                  />
                  <button
                    type="submit"
                    disabled={!commentBody.trim() || submittingComment}
                    className="self-end px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {submittingComment ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              </form>

              {/* Comment list */}
              {loadingComments ? (
                <div className="flex justify-center py-6">
                  <Loader2 size={18} className="animate-spin text-zinc-600" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-center text-sm text-zinc-600 py-6">Sin comentarios todavía.</p>
              ) : (
                <div className="space-y-3">
                  {comments.map(comment => (
                    <div key={comment.id} className="group flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-indigo-800 flex items-center justify-center text-xs font-semibold text-indigo-200 shrink-0 mt-0.5">
                        {comment.author.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-xs font-medium text-zinc-300">{comment.author}</span>
                          <span className="text-[10px] text-zinc-600">{formatCommentDate(comment.created_at)}</span>
                        </div>
                        <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{comment.body}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-600 hover:text-red-400 transition-all self-start mt-0.5"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Lightbox */}
    {lightboxPhoto && (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm"
        onClick={() => setLightboxPhoto(null)}
      >
        <button
          onClick={() => setLightboxPhoto(null)}
          className="absolute top-4 right-4 p-2 rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
        >
          <X size={18} />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={lightboxPhoto.data}
          alt={lightboxPhoto.name ?? 'Foto'}
          onClick={e => e.stopPropagation()}
          className="max-w-[90vw] max-h-[90vh] rounded-lg object-contain shadow-2xl"
        />
        {lightboxPhoto.name && (
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-zinc-500 bg-black/60 px-3 py-1 rounded-full">
            {lightboxPhoto.name}
          </p>
        )}
      </div>
    )}
    </>
  )
}
