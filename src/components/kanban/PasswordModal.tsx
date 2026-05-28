'use client'

import { useState, useRef, useEffect } from 'react'
import { Lock, X } from 'lucide-react'

interface Props {
  boardName: string
  onSubmit: (password: string) => void
  onCancel: () => void
  error?: boolean
}

export default function PasswordModal({ boardName, onSubmit, onCancel, error }: Props) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 4)
    setValue(digits)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (value.length === 4) onSubmit(value)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-full bg-indigo-600/20 border border-indigo-600/30 flex items-center justify-center shrink-0">
            <Lock size={16} className="text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-100">Tablero protegido</p>
            <p className="text-xs text-zinc-500 truncate max-w-[200px]">{boardName}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">PIN de 4 dígitos</label>
            <input
              ref={inputRef}
              inputMode="numeric"
              type="password"
              value={value}
              onChange={handleChange}
              placeholder="••••"
              maxLength={4}
              className={[
                'w-full px-3 py-2 rounded-lg bg-zinc-800 border text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 transition-colors tracking-[0.5em] text-center font-mono text-lg',
                error
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50'
                  : 'border-zinc-700 focus:border-indigo-500 focus:ring-indigo-500/50',
              ].join(' ')}
            />
            {error && (
              <p className="text-xs text-red-400 mt-1.5 text-center">PIN incorrecto. Intentá de nuevo.</p>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={value.length !== 4}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Acceder
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
