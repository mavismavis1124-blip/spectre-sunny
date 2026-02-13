/**
 * GlassSelect – Mobile-native dropdown for filter/timeframe selectors
 * Clean trigger → bottom-sheet style options list on tap
 * No backdrop overlay — uses portal-free inline approach
 */
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import './GlassSelect.css'

const GlassSelect = ({ value, onChange, options, ariaLabel, className = '' }) => {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)
  const dropdownRef = useRef(null)

  const selected = options.find(o => o.value === value)

  // Close on any tap/click outside the dropdown OR trigger
  const handleDocTap = useCallback((e) => {
    if (!open) return
    // If tap is inside trigger or dropdown, let those handlers deal with it
    if (triggerRef.current?.contains(e.target)) return
    if (dropdownRef.current?.contains(e.target)) return
    setOpen(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    // Use a small delay so the opening tap doesn't immediately close
    const timer = setTimeout(() => {
      document.addEventListener('touchstart', handleDocTap, { passive: true, capture: true })
      document.addEventListener('mousedown', handleDocTap, { capture: true })
    }, 50)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('touchstart', handleDocTap, { capture: true })
      document.removeEventListener('mousedown', handleDocTap, { capture: true })
    }
  }, [open, handleDocTap])

  // Scroll active item into view when opened
  useEffect(() => {
    if (open && dropdownRef.current) {
      const active = dropdownRef.current.querySelector('.glass-select-option.active')
      if (active) active.scrollIntoView({ block: 'nearest' })
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handleEsc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [open])

  const handleSelect = (val) => {
    onChange({ target: { value: val } }) // mimic native select onChange
    setOpen(false)
  }

  const toggleOpen = (e) => {
    e.stopPropagation()
    setOpen(prev => !prev)
  }

  return (
    <div className={`glass-select ${open ? 'open' : ''} ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        className="glass-select-trigger"
        onClick={toggleOpen}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="glass-select-value">{selected?.label || '—'}</span>
        <svg className="glass-select-chevron" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 4l4 4 4-4" />
        </svg>
      </button>

      {open && createPortal(
        <>
          {/* Transparent backdrop — just catches taps, no visible overlay */}
          <div
            className="glass-select-backdrop"
            onClick={() => setOpen(false)}
            onTouchStart={(e) => { e.preventDefault(); setOpen(false) }}
          />
          <div className="glass-select-dropdown" ref={dropdownRef} role="listbox">
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={opt.value === value}
                className={`glass-select-option ${opt.value === value ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); handleSelect(opt.value) }}
              >
                <span className="glass-select-option-label">{opt.label}</span>
                {opt.value === value && (
                  <svg className="glass-select-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

export default GlassSelect
