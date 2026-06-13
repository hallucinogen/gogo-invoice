import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'

interface TextProps {
  value: string
  onChange: (v: string) => void
  onCommit?: (v: string) => void
  placeholder?: string
  className?: string
  style?: CSSProperties
  ariaLabel?: string
  /** id of a <datalist> to wire up native autocomplete suggestions. */
  list?: string
}

/** A single-line input styled to read as plain invoice text. */
export function EditableText({
  value,
  onChange,
  onCommit,
  placeholder,
  className,
  style,
  ariaLabel,
  list,
}: TextProps) {
  return (
    <input
      className={`editable ${className ?? ''}`}
      style={style}
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel ?? placeholder}
      list={list}
      onChange={(e) => onChange(e.target.value)}
      onBlur={(e) => onCommit?.(e.target.value)}
    />
  )
}

/** A multi-line auto-growing textarea styled to read as plain invoice text. */
export function EditableArea({
  value,
  onChange,
  onCommit,
  placeholder,
  className,
  style,
  ariaLabel,
}: TextProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const resize = () => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }
  useLayoutEffect(resize, [value])

  return (
    <textarea
      ref={ref}
      rows={1}
      className={`editable editable--area ${className ?? ''}`}
      style={style}
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel ?? placeholder}
      onChange={(e) => {
        onChange(e.target.value)
        resize()
      }}
      onBlur={(e) => onCommit?.(e.target.value)}
    />
  )
}

interface NumberProps {
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
  integer?: boolean
  placeholder?: string
  className?: string
  baseClass?: string
  style?: CSSProperties
  ariaLabel?: string
}

/**
 * A numeric field that keeps an in-progress string buffer so you can clear it
 * and type decimals like "0.05" without it snapping back to 0. It commits a
 * clamped number on every valid keystroke (for live totals) and normalises the
 * text on blur. Uses type=text + inputMode to avoid native spinners.
 */
export function EditableNumber({
  value,
  onChange,
  min = 0,
  max,
  integer = false,
  placeholder,
  className,
  baseClass = 'editable',
  style,
  ariaLabel,
}: NumberProps) {
  const [text, setText] = useState(() => numToText(value))
  const focused = useRef(false)

  // Reflect external value changes (e.g. switching company) when not editing.
  useEffect(() => {
    if (!focused.current) setText(numToText(value))
  }, [value])

  const clamp = (n: number): number => {
    let v = integer ? Math.round(n) : n
    v = Math.max(min, v)
    if (max != null) v = Math.min(max, v)
    return v
  }
  const commit = (raw: string): number => {
    const n = parseFloat(raw)
    return Number.isFinite(n) ? clamp(n) : min
  }

  return (
    <input
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      className={`${baseClass} ${className ?? ''}`}
      style={style}
      value={text}
      placeholder={placeholder}
      aria-label={ariaLabel ?? placeholder}
      onFocus={() => {
        focused.current = true
      }}
      onChange={(e) => {
        const raw = e.target.value
        if (raw !== '' && !/^\d*\.?\d*$/.test(raw)) return
        setText(raw)
        onChange(commit(raw))
      }}
      onBlur={(e) => {
        focused.current = false
        const c = commit(e.target.value)
        onChange(c)
        setText(numToText(c))
      }}
    />
  )
}

function numToText(n: number): string {
  return Number.isFinite(n) ? String(n) : ''
}
