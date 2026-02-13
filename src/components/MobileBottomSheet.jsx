/**
 * MobileBottomSheet - iOS-style bottom sheet for mobile actions
 * Used for options menus, confirmations, token details
 */
import React, { useEffect, useRef, useState } from 'react'
import './MobileBottomSheet.css'

const MobileBottomSheet = ({
  isOpen,
  onClose,
  title,
  children,
  showHandle = true,
  snapPoints = ['50%', '90%'], // Heights the sheet can snap to
}) => {
  const sheetRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  const [currentY, setCurrentY] = useState(0)

  // Close on escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) onClose?.()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleTouchStart = (e) => {
    setIsDragging(true)
    setStartY(e.touches[0].clientY)
    setCurrentY(0)
  }

  const handleTouchMove = (e) => {
    if (!isDragging) return
    const deltaY = e.touches[0].clientY - startY
    if (deltaY > 0) { // Only allow dragging down
      setCurrentY(deltaY)
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    if (currentY > 100) { // Threshold to close
      onClose?.()
    }
    setCurrentY(0)
  }

  if (!isOpen) return null

  return (
    <div className="mobile-bottom-sheet-overlay" onClick={onClose}>
      <div
        ref={sheetRef}
        className={`mobile-bottom-sheet ${isDragging ? 'dragging' : ''}`}
        style={{ transform: currentY > 0 ? `translateY(${currentY}px)` : undefined }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'sheet-title' : undefined}
      >
        {/* Drag handle */}
        {showHandle && (
          <div
            className="mobile-bottom-sheet-handle-area"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="mobile-bottom-sheet-handle" />
          </div>
        )}

        {/* Header */}
        {title && (
          <div className="mobile-bottom-sheet-header">
            <h2 id="sheet-title" className="mobile-bottom-sheet-title">{title}</h2>
            <button
              type="button"
              className="mobile-bottom-sheet-close"
              onClick={onClose}
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="mobile-bottom-sheet-content">
          {children}
        </div>
      </div>
    </div>
  )
}

// Action list item for bottom sheet
export const BottomSheetAction = ({
  icon,
  label,
  description,
  onClick,
  destructive = false,
  disabled = false,
}) => (
  <button
    type="button"
    className={`mobile-bottom-sheet-action ${destructive ? 'destructive' : ''}`}
    onClick={onClick}
    disabled={disabled}
  >
    {icon && <span className="mobile-bottom-sheet-action-icon">{icon}</span>}
    <div className="mobile-bottom-sheet-action-text">
      <span className="mobile-bottom-sheet-action-label">{label}</span>
      {description && (
        <span className="mobile-bottom-sheet-action-desc">{description}</span>
      )}
    </div>
  </button>
)

export default MobileBottomSheet
