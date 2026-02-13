/**
 * EggExplainerModal
 * Explains the Spectre Egg concept. Opens when user clicks the egg.
 * Premium dark glassmorphic design.
 */
import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import './EggExplainerModal.css'

const EggExplainerModal = ({ open, onClose, onStartHatching }) => {
  const overlayRef = useRef(null)

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [open, onClose])

  // Close on overlay click
  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose()
  }

  if (!open) return null

  return createPortal(
    <div className="egg-explainer-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="egg-explainer-modal" role="dialog" aria-modal="true" aria-labelledby="egg-explainer-title">
        <button className="egg-explainer-close" onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <h2 id="egg-explainer-title" className="egg-explainer-title">This is your AI agent.</h2>

        <div className="egg-explainer-body">
          <p>
            Every Spectre user gets one. Inside this egg is an AI that will learn
            how you think, trade, and research.
          </p>
          <p>
            It starts knowing nothing — just like you're new here.
          </p>
          <p>
            Use the platform. Search for tokens. Read research. Check charts.
            Your egg absorbs everything.
          </p>
          <p>
            After a few sessions, it hatches.
          </p>
          <p>
            What comes out is unique to you — an AI agent shaped by YOUR brain.
            It knows your style, your interests, your risk tolerance.
            No two agents are the same.
          </p>
          <p className="egg-explainer-emphasis">
            The more you use Spectre, the smarter it gets.
          </p>
        </div>

        <div className="egg-explainer-steps">
          <div className="egg-explainer-step">
            <div className="egg-explainer-step-icon">
              {/* Egg icon */}
              <svg viewBox="0 0 48 60" width="36" height="45">
                <ellipse cx="24" cy="32" rx="18" ry="24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
                <circle cx="24" cy="30" r="3" fill="currentColor" opacity="0.3" />
              </svg>
            </div>
            <span className="egg-explainer-step-label">You get an egg</span>
          </div>
          <div className="egg-explainer-step-arrow" aria-hidden>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
          <div className="egg-explainer-step">
            <div className="egg-explainer-step-icon egg-explainer-step-icon--cracking">
              {/* Cracking egg with nodes */}
              <svg viewBox="0 0 48 60" width="36" height="45">
                <ellipse cx="24" cy="32" rx="18" ry="24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
                <path d="M 22 14 L 26 22 L 23 28" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.8" />
                <circle cx="20" cy="28" r="2" fill="currentColor" opacity="0.6" />
                <circle cx="28" cy="30" r="2" fill="currentColor" opacity="0.6" />
                <circle cx="24" cy="36" r="2" fill="currentColor" opacity="0.6" />
                <line x1="20" y1="28" x2="28" y2="30" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
                <line x1="28" y1="30" x2="24" y2="36" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
                <line x1="20" y1="28" x2="24" y2="36" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
              </svg>
            </div>
            <span className="egg-explainer-step-label">It learns you</span>
          </div>
          <div className="egg-explainer-step-arrow" aria-hidden>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
          <div className="egg-explainer-step">
            <div className="egg-explainer-step-icon egg-explainer-step-icon--born">
              {/* Agent silhouette with glowing eyes */}
              <svg viewBox="0 0 48 60" width="36" height="45">
                <ellipse cx="24" cy="36" rx="14" ry="18" fill="currentColor" opacity="0.12" />
                <ellipse cx="24" cy="24" rx="10" ry="12" fill="currentColor" opacity="0.15" />
                <circle cx="20" cy="22" r="2" fill="currentColor" opacity="0.9" />
                <circle cx="28" cy="22" r="2" fill="currentColor" opacity="0.9" />
              </svg>
            </div>
            <span className="egg-explainer-step-label">Your agent is born</span>
          </div>
        </div>

        <button className="egg-explainer-cta" onClick={() => { onStartHatching(); onClose() }}>
          Start Hatching
        </button>
        <p className="egg-explainer-footnote">
          No account needed yet. Your egg starts learning the moment you explore.
        </p>
      </div>
    </div>,
    document.body
  )
}

export default EggExplainerModal
