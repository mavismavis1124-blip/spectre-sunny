/**
 * SwipeableRow - Swipe-to-reveal actions pattern
 * iOS-style swipe left to reveal delete/pin actions
 */
import React, { useState, useRef } from 'react'
import './SwipeableRow.css'

const SwipeableRow = ({
  children,
  leftActions = [], // [{icon, label, color, onClick}]
  rightActions = [], // [{icon, label, color, onClick}]
  onSwipeStart,
  onSwipeEnd,
  threshold = 80, // Pixels to reveal actions
  className = '',
}) => {
  const rowRef = useRef(null)
  const [offsetX, setOffsetX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [isRevealed, setIsRevealed] = useState(null) // 'left' | 'right' | null

  const handleTouchStart = (e) => {
    // Don't start swipe if touching action buttons
    if (e.target.closest('.swipeable-row-actions')) return

    setIsDragging(true)
    setStartX(e.touches[0].clientX)
    onSwipeStart?.()
  }

  const handleTouchMove = (e) => {
    if (!isDragging) return

    const deltaX = e.touches[0].clientX - startX

    // Limit swipe distance
    const maxSwipe = Math.max(leftActions.length, rightActions.length) * 80
    const limitedDelta = Math.max(-maxSwipe, Math.min(maxSwipe, deltaX))

    // Add resistance at edges
    const resistance = 0.5
    let finalDelta = limitedDelta
    if (leftActions.length === 0 && limitedDelta > 0) {
      finalDelta = limitedDelta * resistance
    }
    if (rightActions.length === 0 && limitedDelta < 0) {
      finalDelta = limitedDelta * resistance
    }

    setOffsetX(finalDelta)
  }

  const handleTouchEnd = () => {
    setIsDragging(false)

    // Determine if we should reveal or hide actions
    if (offsetX > threshold && leftActions.length > 0) {
      setOffsetX(leftActions.length * 72)
      setIsRevealed('left')
    } else if (offsetX < -threshold && rightActions.length > 0) {
      setOffsetX(-rightActions.length * 72)
      setIsRevealed('right')
    } else {
      setOffsetX(0)
      setIsRevealed(null)
    }

    onSwipeEnd?.()
  }

  const handleActionClick = (action) => {
    action.onClick?.()
    // Reset after action
    setOffsetX(0)
    setIsRevealed(null)
  }

  const handleReset = () => {
    setOffsetX(0)
    setIsRevealed(null)
  }

  return (
    <div
      ref={rowRef}
      className={`swipeable-row ${isDragging ? 'dragging' : ''} ${isRevealed ? 'revealed' : ''} ${className}`}
    >
      {/* Left actions (swipe right to reveal) */}
      {leftActions.length > 0 && (
        <div className="swipeable-row-actions swipeable-row-actions-left">
          {leftActions.map((action, i) => (
            <button
              key={i}
              type="button"
              className="swipeable-row-action"
              style={{ backgroundColor: action.color || 'rgba(59, 130, 246, 0.9)' }}
              onClick={() => handleActionClick(action)}
              aria-label={action.label}
            >
              {action.icon && <span className="swipeable-row-action-icon">{action.icon}</span>}
              <span className="swipeable-row-action-label">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div
        className="swipeable-row-content"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={isRevealed ? handleReset : undefined}
      >
        {children}
      </div>

      {/* Right actions (swipe left to reveal) */}
      {rightActions.length > 0 && (
        <div className="swipeable-row-actions swipeable-row-actions-right">
          {rightActions.map((action, i) => (
            <button
              key={i}
              type="button"
              className="swipeable-row-action"
              style={{ backgroundColor: action.color || 'rgba(239, 68, 68, 0.9)' }}
              onClick={() => handleActionClick(action)}
              aria-label={action.label}
            >
              {action.icon && <span className="swipeable-row-action-icon">{action.icon}</span>}
              <span className="swipeable-row-action-label">{action.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default SwipeableRow
