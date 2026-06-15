'use client'

import { forwardRef, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react'
import { clsx } from 'clsx'

// -------------------------------------------------------
// BADGE
// -------------------------------------------------------
type BadgeVariant = 'green' | 'amber' | 'red' | 'blue' | 'gray' | 'purple'

const badgeStyles: Record<BadgeVariant, string> = {
  green:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber:  'bg-amber-50 text-amber-700 border-amber-200',
  red:    'bg-red-50 text-red-700 border-red-200',
  blue:   'bg-blue-50 text-blue-700 border-blue-200',
  gray:   'bg-gray-100 text-gray-600 border-gray-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
}

export function Badge({ variant = 'gray', children }: { variant?: BadgeVariant; children: ReactNode }) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
      badgeStyles[variant]
    )}>
      {children}
    </span>
  )
}

// -------------------------------------------------------
// BUTTON
// -------------------------------------------------------
type ButtonVariant = 'default' | 'primary' | 'danger' | 'ghost'

const buttonVariants: Record<ButtonVariant, string> = {
  default: 'border border-gray-200 bg-white text-gray-800 hover:bg-gray-50',
  primary: 'border border-gray-900 bg-gray-900 text-white hover:bg-gray-800',
  danger:  'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
  ghost:   'border border-transparent bg-transparent text-gray-600 hover:bg-gray-100',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'sm' | 'md'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'md', loading, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        size === 'sm' ? 'text-xs px-3 py-1.5' : 'text-sm px-4 py-2',
        buttonVariants[variant],
        className
      )}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
)
Button.displayName = 'Button'

// -------------------------------------------------------
// INPUT
// -------------------------------------------------------
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-gray-600">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={clsx(
          'w-full px-3 py-2 text-sm rounded-lg border bg-white text-gray-900 placeholder-gray-400',
          'focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-0',
          error ? 'border-red-400' : 'border-gray-200',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
)
Input.displayName = 'Input'

// -------------------------------------------------------
// TEXTAREA
// -------------------------------------------------------
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, id, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-gray-600">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={id}
        className={clsx(
          'w-full px-3 py-2 text-sm rounded-lg border bg-white text-gray-900 placeholder-gray-400 resize-none',
          'focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-0',
          error ? 'border-red-400' : 'border-gray-200',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
)
Textarea.displayName = 'Textarea'

// -------------------------------------------------------
// SELECT
// -------------------------------------------------------
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className, id, children, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-gray-600">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={id}
        className={clsx(
          'w-full px-3 py-2 text-sm rounded-lg border bg-white text-gray-900',
          'focus:outline-none focus:ring-2 focus:ring-gray-900',
          error ? 'border-red-400' : 'border-gray-200',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
)
Select.displayName = 'Select'

// -------------------------------------------------------
// MODAL
// -------------------------------------------------------
export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
}) {
  if (!open) return null

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={clsx('w-full bg-white rounded-xl shadow-xl', widths[size])}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

// -------------------------------------------------------
// CARD
// -------------------------------------------------------
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx('bg-white border border-gray-200 rounded-xl', className)}>
      {children}
    </div>
  )
}

// -------------------------------------------------------
// MÉTRICA
// -------------------------------------------------------
export function Metric({ label, value, delta, deltaType }: {
  label: string
  value: string
  delta?: string
  deltaType?: 'up' | 'down' | 'neutral'
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <p className="text-xs text-gray-500 mb-1.5">{label}</p>
      <p className="text-2xl font-medium text-gray-900">{value}</p>
      {delta && (
        <p className={clsx('text-xs mt-1', {
          'text-emerald-600': deltaType === 'up',
          'text-red-500': deltaType === 'down',
          'text-gray-500': deltaType === 'neutral' || !deltaType,
        })}>
          {delta}
        </p>
      )}
    </div>
  )
}

// -------------------------------------------------------
// AVATAR
// -------------------------------------------------------
export function Avatar({ nome, size = 'md' }: { nome: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
  const colors = ['bg-teal-100 text-teal-700', 'bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700']
  const color = colors[nome.charCodeAt(0) % colors.length]
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base' }

  return (
    <div className={clsx('rounded-full flex items-center justify-center font-medium flex-shrink-0', color, sizes[size])}>
      {initials}
    </div>
  )
}

// -------------------------------------------------------
// EMPTY STATE
// -------------------------------------------------------
export function EmptyState({ icon, title, description, action }: {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="text-gray-300 mb-4">{icon}</div>
      <p className="text-sm font-medium text-gray-700 mb-1">{title}</p>
      <p className="text-xs text-gray-400 mb-4">{description}</p>
      {action}
    </div>
  )
}
