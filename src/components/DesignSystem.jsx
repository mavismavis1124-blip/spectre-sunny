/**
 * Design System UI Component
 * Interactive documentation for developers
 * Accessible at: /#design-system or /design-system.html
 */
import React, { useState, useRef, useEffect } from 'react'
import './DesignSystem.css'

const DesignSystem = ({ onClose, isStandalone = false }) => {
  const [activeSection, setActiveSection] = useState('philosophy')
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedToken, setCopiedToken] = useState(null)

  const sections = [
    { id: 'philosophy', label: 'Philosophy', icon: '🎨' },
    { id: 'tokens', label: 'Design Tokens', icon: '🎯' },
    { id: 'typography', label: 'Typography', icon: '📝' },
    { id: 'colors', label: 'Colors', icon: '🎨' },
    { id: 'spacing', label: 'Spacing & Layout', icon: '📐' },
    { id: 'components', label: 'Components', icon: '🧩' },
    { id: 'animations', label: 'Animations', icon: '✨' },
    { id: 'glass', label: 'Glass Morphism', icon: '💎' },
    { id: 'glow', label: 'Glow Effects', icon: '🌟' },
    { id: 'guidelines', label: 'Guidelines', icon: '📋' },
  ]

  const copyToClipboard = (text, tokenName) => {
    navigator.clipboard.writeText(text)
    setCopiedToken(tokenName)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose && !isStandalone) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, isStandalone])

  // Handle hash routing for section navigation in standalone mode
  useEffect(() => {
    if (isStandalone) {
      // Check initial hash for section
      const hash = window.location.hash.replace('#', '')
      if (hash && sections.some(s => s.id === hash)) {
        setActiveSection(hash)
      }
      
      // Update section when hash changes
      const handleHashChange = () => {
        const newHash = window.location.hash.replace('#', '')
        if (newHash && sections.some(s => s.id === newHash)) {
          setActiveSection(newHash)
        }
      }
      window.addEventListener('hashchange', handleHashChange)
      return () => window.removeEventListener('hashchange', handleHashChange)
    }
  }, [isStandalone])

  // Update URL hash when section changes in standalone mode (for bookmarking sections)
  useEffect(() => {
    if (isStandalone && activeSection) {
      window.history.replaceState(null, '', `#${activeSection}`)
    }
  }, [activeSection, isStandalone])

  const filteredSections = sections.filter(section =>
    section.label.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const containerClass = isStandalone 
    ? 'design-system-standalone' 
    : 'design-system-overlay'

  return (
    <div className={containerClass}>
      <div className="design-system-container">
        {/* Header */}
        <div className="ds-header">
          <div className="ds-header-left">
            <h1 className="ds-title">
              <span className="ds-title-icon">🎨</span>
              Design System
            </h1>
            <p className="ds-subtitle">Spectre AI Trading Platform</p>
          </div>
          <div className="ds-header-right">
            <div className="ds-search">
              <svg className="ds-search-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              <input
                type="text"
                placeholder="Search design system..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ds-search-input"
              />
            </div>
            {isStandalone ? (
              <a 
                href="/"
                className="ds-back-btn"
                title="Back to App"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Back to App</span>
              </a>
            ) : onClose ? (
              <button 
                className="ds-close-btn" 
                onClick={onClose} 
                title="Close (Esc)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            ) : null}
          </div>
        </div>

        <div className="ds-content">
          {/* Sidebar Navigation */}
          <aside className="ds-sidebar">
            <nav className="ds-nav">
              {filteredSections.map((section) => (
                <button
                  key={section.id}
                  className={`ds-nav-item ${activeSection === section.id ? 'active' : ''}`}
                  onClick={() => {
                    setActiveSection(section.id)
                    if (isStandalone) {
                      window.location.hash = section.id
                    }
                  }}
                >
                  <span className="ds-nav-icon">{section.icon}</span>
                  <span className="ds-nav-label">{section.label}</span>
                </button>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="ds-main">
            {activeSection === 'philosophy' && <PhilosophySection />}
            {activeSection === 'tokens' && <TokensSection copyToClipboard={copyToClipboard} copiedToken={copiedToken} />}
            {activeSection === 'typography' && <TypographySection copyToClipboard={copyToClipboard} copiedToken={copiedToken} />}
            {activeSection === 'colors' && <ColorsSection copyToClipboard={copyToClipboard} copiedToken={copiedToken} />}
            {activeSection === 'spacing' && <SpacingSection copyToClipboard={copyToClipboard} copiedToken={copiedToken} />}
            {activeSection === 'components' && <ComponentsSection copyToClipboard={copyToClipboard} copiedToken={copiedToken} />}
            {activeSection === 'animations' && <AnimationsSection copyToClipboard={copyToClipboard} copiedToken={copiedToken} />}
            {activeSection === 'glass' && <GlassSection copyToClipboard={copyToClipboard} copiedToken={copiedToken} />}
            {activeSection === 'glow' && <GlowSection copyToClipboard={copyToClipboard} copiedToken={copiedToken} />}
            {activeSection === 'guidelines' && <GuidelinesSection />}
          </main>
        </div>
      </div>
    </div>
  )
}

// Section Components
const PhilosophySection = () => (
  <div className="ds-section">
    <h2 className="ds-section-title">Design Philosophy</h2>
    <div className="ds-card">
      <h3 className="ds-card-title">Core Principles</h3>
      <ul className="ds-list">
        <li><strong>Premium Dark Theme</strong> - Deep, rich blacks with subtle gradients</li>
        <li><strong>Glass Morphism</strong> - Frosted glass effects with backdrop blur</li>
        <li><strong>Smooth Animations</strong> - Apple-like transitions with cubic-bezier easing</li>
        <li><strong>Visual Hierarchy</strong> - Clear information architecture with proper contrast</li>
        <li><strong>WOW Effects</strong> - Subtle but impressive visual flourishes</li>
        <li><strong>Professional Polish</strong> - Institutional-grade trading platform aesthetic</li>
      </ul>
    </div>
    <div className="ds-card">
      <h3 className="ds-card-title">Design Language</h3>
      <ul className="ds-list">
        <li><strong>Minimal but Rich</strong> - Clean interfaces with depth and texture</li>
        <li><strong>Dark First</strong> - Optimized for dark mode with high contrast</li>
        <li><strong>Motion as Feedback</strong> - Animations provide context and delight</li>
        <li><strong>Glass & Glow</strong> - Modern frosted glass with accent glows</li>
        <li><strong>Gradient Accents</strong> - Purple/violet gradients for brand identity</li>
      </ul>
    </div>
  </div>
)

const TokensSection = ({ copyToClipboard, copiedToken }) => (
  <div className="ds-section">
    <h2 className="ds-section-title">Design Tokens</h2>
    <p className="ds-section-description">All design tokens are defined in <code>src/index.css</code> under <code>:root</code>.</p>
    
    <div className="ds-card">
      <h3 className="ds-card-title">CSS Variables Location</h3>
      <div className="ds-code-block">
        <code>src/index.css</code>
        <button 
          className="ds-copy-btn"
          onClick={() => copyToClipboard('src/index.css', 'path')}
          title="Copy path"
        >
          {copiedToken === 'path' ? '✓' : '📋'}
        </button>
      </div>
    </div>
  </div>
)

const TypographySection = ({ copyToClipboard, copiedToken }) => {
  const fonts = [
    { name: 'Display Font', value: '--font-display', example: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif", usage: 'Headings, hero text, brand elements' },
    { name: 'Body Font', value: '--font-body', example: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", usage: 'Body text, UI labels, descriptions' },
    { name: 'Mono Font', value: '--font-mono', example: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace", usage: 'Prices, addresses, code, numbers' },
  ]

  const typeScale = [
    { class: '.display-hero', size: 'clamp(2.5rem, 5vw, 4.5rem)', weight: '700', use: 'Hero headlines' },
    { class: '.display-xl', size: '3rem', weight: '700', use: 'Large headings' },
    { class: '.display-lg', size: '2.25rem', weight: '700', use: 'Section headings' },
    { class: '.display-md', size: '1.75rem', weight: '600', use: 'Subsection headings' },
    { class: '.display-sm', size: '1.375rem', weight: '600', use: 'Card titles' },
    { class: '.heading', size: '1.125rem', weight: '600', use: 'Component headings' },
    { class: '.body-lg', size: '1.0625rem', weight: '400', use: 'Large body text' },
    { class: '.body', size: '0.9375rem', weight: '400', use: 'Default body text' },
    { class: '.body-sm', size: '0.8125rem', weight: '400', use: 'Small body text' },
  ]

  return (
    <div className="ds-section">
      <h2 className="ds-section-title">Typography</h2>
      
      <div className="ds-card">
        <h3 className="ds-card-title">Font Families</h3>
        {fonts.map((font) => (
          <div key={font.value} className="ds-token-item">
            <div className="ds-token-header">
              <code className="ds-token-name">{font.value}</code>
              <button 
                className="ds-copy-btn"
                onClick={() => copyToClipboard(`var(${font.value})`, font.value)}
                title="Copy variable"
              >
                {copiedToken === font.value ? '✓' : '📋'}
              </button>
            </div>
            <div className="ds-token-value">{font.example}</div>
            <div className="ds-token-usage">{font.usage}</div>
          </div>
        ))}
      </div>

      <div className="ds-card">
        <h3 className="ds-card-title">Type Scale</h3>
        <div className="ds-table-container">
          <table className="ds-table">
            <thead>
              <tr>
                <th>Class</th>
                <th>Size</th>
                <th>Weight</th>
                <th>Use Case</th>
              </tr>
            </thead>
            <tbody>
              {typeScale.map((type, i) => (
                <tr key={i}>
                  <td><code>{type.class}</code></td>
                  <td>{type.size}</td>
                  <td>{type.weight}</td>
                  <td>{type.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const ColorsSection = ({ copyToClipboard, copiedToken }) => {
  const backgrounds = [
    { name: 'Void', value: '--bg-void', color: '#000000', usage: 'Deepest black - void space' },
    { name: 'Base', value: '--bg-base', color: '#030304', usage: 'Base background' },
    { name: 'Surface', value: '--bg-surface', color: '#0a0a0c', usage: 'Card surfaces' },
    { name: 'Elevated', value: '--bg-elevated', color: '#101012', usage: 'Elevated cards' },
    { name: 'Overlay', value: '--bg-overlay', color: '#161618', usage: 'Overlays, modals' },
    { name: 'Hover', value: '--bg-hover', color: '#1c1c20', usage: 'Hover states' },
  ]

  const textColors = [
    { name: 'Primary', value: '--text-primary', color: '#ffffff', usage: 'Main text' },
    { name: 'Secondary', value: '--text-secondary', color: 'rgba(255, 255, 255, 0.72)', usage: 'Secondary text' },
    { name: 'Tertiary', value: '--text-tertiary', color: 'rgba(255, 255, 255, 0.48)', usage: 'Tertiary text' },
    { name: 'Muted', value: '--text-muted', color: 'rgba(255, 255, 255, 0.32)', usage: 'Muted text' },
  ]

  const tradingColors = [
    { name: 'Bull', value: '--bull', color: '#10B981', usage: 'Positive, gains, buys' },
    { name: 'Bull Bright', value: '--bull-bright', color: '#34D399', usage: 'Bright green accent' },
    { name: 'Bear', value: '--bear', color: '#EF4444', usage: 'Negative, losses, sells' },
    { name: 'Bear Bright', value: '--bear-bright', color: '#F87171', usage: 'Bright red accent' },
  ]

  const accentColors = [
    { name: 'Accent', value: '--accent', color: '#8B5CF6', usage: 'Primary purple' },
    { name: 'Accent Secondary', value: '--accent-secondary', color: '#A78BFA', usage: 'Lighter purple' },
    { name: 'Cyan', value: '--cyan', color: '#06B6D4', usage: 'Cyan accent' },
    { name: 'Amber', value: '--amber', color: '#F59E0B', usage: 'Amber accent' },
  ]

  const ColorSwatch = ({ name, value, color, usage }) => (
    <div className="ds-color-item">
      <div className="ds-color-swatch" style={{ backgroundColor: color }}>
        <div className="ds-color-checkerboard"></div>
      </div>
      <div className="ds-color-info">
        <div className="ds-color-header">
          <code className="ds-color-name">{value}</code>
          <button 
            className="ds-copy-btn"
            onClick={() => copyToClipboard(`var(${value})`, value)}
            title="Copy variable"
          >
            {copiedToken === value ? '✓' : '📋'}
          </button>
        </div>
        <div className="ds-color-label">{name}</div>
        <div className="ds-color-value">{color}</div>
        <div className="ds-color-usage">{usage}</div>
      </div>
    </div>
  )

  return (
    <div className="ds-section">
      <h2 className="ds-section-title">Color System</h2>
      
      <div className="ds-card">
        <h3 className="ds-card-title">Background Hierarchy</h3>
        <div className="ds-color-grid">
          {backgrounds.map((bg) => (
            <ColorSwatch key={bg.value} {...bg} />
          ))}
        </div>
      </div>

      <div className="ds-card">
        <h3 className="ds-card-title">Text Hierarchy</h3>
        <div className="ds-color-grid">
          {textColors.map((text) => (
            <ColorSwatch key={text.value} {...text} />
          ))}
        </div>
      </div>

      <div className="ds-card">
        <h3 className="ds-card-title">Trading Colors</h3>
        <div className="ds-color-grid">
          {tradingColors.map((color) => (
            <ColorSwatch key={color.value} {...color} />
          ))}
        </div>
      </div>

      <div className="ds-card">
        <h3 className="ds-card-title">Brand Accent Colors</h3>
        <div className="ds-color-grid">
          {accentColors.map((color) => (
            <ColorSwatch key={color.value} {...color} />
          ))}
        </div>
      </div>
    </div>
  )
}

const SpacingSection = ({ copyToClipboard, copiedToken }) => {
  const spacing = [
    { name: '0', value: '--sp-0', size: '0', rem: '0' },
    { name: '1', value: '--sp-1', size: '4px', rem: '0.25rem' },
    { name: '2', value: '--sp-2', size: '8px', rem: '0.5rem' },
    { name: '3', value: '--sp-3', size: '12px', rem: '0.75rem' },
    { name: '4', value: '--sp-4', size: '16px', rem: '1rem' },
    { name: '5', value: '--sp-5', size: '20px', rem: '1.25rem' },
    { name: '6', value: '--sp-6', size: '24px', rem: '1.5rem' },
    { name: '8', value: '--sp-8', size: '32px', rem: '2rem' },
    { name: '10', value: '--sp-10', size: '40px', rem: '2.5rem' },
    { name: '12', value: '--sp-12', size: '48px', rem: '3rem' },
    { name: '16', value: '--sp-16', size: '64px', rem: '4rem' },
  ]

  const radius = [
    { name: 'XS', value: '--radius-xs', size: '4px' },
    { name: 'SM', value: '--radius-sm', size: '8px' },
    { name: 'MD', value: '--radius-md', size: '12px' },
    { name: 'LG', value: '--radius-lg', size: '16px' },
    { name: 'XL', value: '--radius-xl', size: '24px' },
    { name: '2XL', value: '--radius-2xl', size: '32px' },
    { name: 'Full', value: '--radius-full', size: '9999px' },
  ]

  return (
    <div className="ds-section">
      <h2 className="ds-section-title">Spacing & Layout</h2>
      
      <div className="ds-card">
        <h3 className="ds-card-title">Spacing Scale (4px base)</h3>
        <div className="ds-spacing-grid">
          {spacing.map((sp) => (
            <div key={sp.value} className="ds-spacing-item">
              <div className="ds-spacing-visual" style={{ width: sp.size, height: sp.size, backgroundColor: 'var(--accent)', borderRadius: '2px' }}></div>
              <div className="ds-spacing-info">
                <code className="ds-spacing-name">{sp.value}</code>
                <div className="ds-spacing-size">{sp.size} / {sp.rem}</div>
              </div>
              <button 
                className="ds-copy-btn"
                onClick={() => copyToClipboard(`var(${sp.value})`, sp.value)}
                title="Copy variable"
              >
                {copiedToken === sp.value ? '✓' : '📋'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="ds-card">
        <h3 className="ds-card-title">Border Radius</h3>
        <div className="ds-radius-grid">
          {radius.map((r) => (
            <div key={r.value} className="ds-radius-item">
              <div className="ds-radius-visual" style={{ borderRadius: r.size, width: '60px', height: '60px', backgroundColor: 'var(--accent)', border: '2px solid var(--border-default)' }}></div>
              <div className="ds-radius-info">
                <code className="ds-radius-name">{r.value}</code>
                <div className="ds-radius-size">{r.size}</div>
              </div>
              <button 
                className="ds-copy-btn"
                onClick={() => copyToClipboard(`var(${r.value})`, r.value)}
                title="Copy variable"
              >
                {copiedToken === r.value ? '✓' : '📋'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const ComponentsSection = ({ copyToClipboard, copiedToken }) => {
  const components = [
    {
      name: 'Primary Button',
      code: `<button className="btn-primary">
  <span>Connect Wallet</span>
</button>`,
      description: 'Primary CTAs, main actions'
    },
    {
      name: 'Secondary Button',
      code: `<button className="btn-secondary">
  <span>Cancel</span>
</button>`,
      description: 'Secondary actions, alternative CTAs'
    },
    {
      name: 'Ghost Button',
      code: `<button className="btn-ghost">
  <span>Learn More</span>
</button>`,
      description: 'Tertiary actions, icon buttons'
    },
    {
      name: 'Glass Card',
      code: `<div className="glass-card">
  <h3 className="heading">Token Stats</h3>
  <p className="body">Market cap and volume data</p>
</div>`,
      description: 'Content cards, panels, containers'
    },
    {
      name: 'Input',
      code: `<input 
  type="text" 
  className="input" 
  placeholder="Search tokens..."
/>`,
      description: 'Text inputs, search bars, form fields'
    },
  ]

  return (
    <div className="ds-section">
      <h2 className="ds-section-title">Component Patterns</h2>
      
      {components.map((comp, i) => (
        <div key={i} className="ds-card">
          <h3 className="ds-card-title">{comp.name}</h3>
          <p className="ds-card-description">{comp.description}</p>
          <div className="ds-code-block">
            <pre><code>{comp.code}</code></pre>
            <button 
              className="ds-copy-btn"
              onClick={() => copyToClipboard(comp.code, `comp-${i}`)}
              title="Copy code"
            >
              {copiedToken === `comp-${i}` ? '✓ Copied' : '📋 Copy'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

const AnimationsSection = ({ copyToClipboard, copiedToken }) => {
  const easings = [
    { name: 'Ease Out', value: '--ease-out', func: 'cubic-bezier(0.16, 1, 0.3, 1)', usage: 'Most UI transitions' },
    { name: 'Ease In Out', value: '--ease-in-out', func: 'cubic-bezier(0.4, 0, 0.2, 1)', usage: 'Standard animations' },
    { name: 'Spring', value: '--ease-spring', func: 'cubic-bezier(0.34, 1.56, 0.64, 1)', usage: 'Bouncy effects' },
  ]

  const durations = [
    { name: 'Instant', value: '--duration-instant', time: '100ms', usage: 'Instant feedback' },
    { name: 'Fast', value: '--duration-fast', time: '150ms', usage: 'Quick transitions' },
    { name: 'Base', value: '--duration-base', time: '250ms', usage: 'Standard transitions' },
    { name: 'Slow', value: '--duration-slow', time: '400ms', usage: 'Slow, deliberate' },
  ]

  return (
    <div className="ds-section">
      <h2 className="ds-section-title">Animations & Transitions</h2>
      
      <div className="ds-card">
        <h3 className="ds-card-title">Easing Functions</h3>
        {easings.map((easing) => (
          <div key={easing.value} className="ds-token-item">
            <div className="ds-token-header">
              <code className="ds-token-name">{easing.value}</code>
              <button 
                className="ds-copy-btn"
                onClick={() => copyToClipboard(`var(${easing.value})`, easing.value)}
                title="Copy variable"
              >
                {copiedToken === easing.value ? '✓' : '📋'}
              </button>
            </div>
            <div className="ds-token-value">{easing.func}</div>
            <div className="ds-token-usage">{easing.usage}</div>
          </div>
        ))}
      </div>

      <div className="ds-card">
        <h3 className="ds-card-title">Duration Scale</h3>
        {durations.map((duration) => (
          <div key={duration.value} className="ds-token-item">
            <div className="ds-token-header">
              <code className="ds-token-name">{duration.value}</code>
              <button 
                className="ds-copy-btn"
                onClick={() => copyToClipboard(`var(${duration.value})`, duration.value)}
                title="Copy variable"
              >
                {copiedToken === duration.value ? '✓' : '📋'}
              </button>
            </div>
            <div className="ds-token-value">{duration.time}</div>
            <div className="ds-token-usage">{duration.usage}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

const GlassSection = ({ copyToClipboard, copiedToken }) => (
  <div className="ds-section">
    <h2 className="ds-section-title">Glass Morphism</h2>
    
    <div className="ds-card">
      <h3 className="ds-card-title">Glass Variables</h3>
      <div className="ds-code-block">
        <pre><code>{`--glass-bg: rgba(16, 16, 20, 0.75);
--glass-bg-light: rgba(255, 255, 255, 0.03);
--glass-border: rgba(255, 255, 255, 0.08);
--glass-border-light: rgba(255, 255, 255, 0.12);
--glass-glow: rgba(139, 92, 246, 0.15);`}</code></pre>
        <button 
          className="ds-copy-btn"
          onClick={() => copyToClipboard('--glass-bg, --glass-border', 'glass')}
          title="Copy variables"
        >
          {copiedToken === 'glass' ? '✓' : '📋'}
        </button>
      </div>
    </div>

    <div className="ds-card">
      <h3 className="ds-card-title">Usage Example</h3>
      <div className="ds-code-block">
        <pre><code>{`.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-inner), var(--shadow-lg);
}`}</code></pre>
        <button 
          className="ds-copy-btn"
          onClick={() => copyToClipboard('.glass { ... }', 'glass-example')}
          title="Copy code"
        >
          {copiedToken === 'glass-example' ? '✓' : '📋'}
        </button>
      </div>
    </div>
  </div>
)

const GlowSection = ({ copyToClipboard, copiedToken }) => (
  <div className="ds-section">
    <h2 className="ds-section-title">Glow Effects</h2>
    
    <div className="ds-card">
      <h3 className="ds-card-title">Glow Classes</h3>
      <div className="ds-code-block">
        <pre><code>{`.glow {
  box-shadow: var(--shadow-glow);
}

.glow-sm {
  box-shadow: var(--shadow-glow-sm);
}

.glow-text {
  text-shadow: 0 0 20px var(--accent-glow);
}

.glow-border {
  border: 1px solid var(--border-accent);
  box-shadow: 0 0 20px rgba(139, 92, 246, 0.15);
}`}</code></pre>
        <button 
          className="ds-copy-btn"
          onClick={() => copyToClipboard('.glow, .glow-sm, .glow-text', 'glow')}
          title="Copy classes"
        >
          {copiedToken === 'glow' ? '✓' : '📋'}
        </button>
      </div>
    </div>
  </div>
)

const GuidelinesSection = () => (
  <div className="ds-section">
    <h2 className="ds-section-title">Usage Guidelines</h2>
    
    <div className="ds-card">
      <h3 className="ds-card-title">Do's ✅</h3>
      <ul className="ds-list">
        <li><strong>Use Design Tokens</strong> - Always use CSS variables, never hardcode values</li>
        <li><strong>Consistent Spacing</strong> - Use the spacing scale (<code>--sp-*</code>)</li>
        <li><strong>Proper Typography</strong> - Use the type scale classes</li>
        <li><strong>Smooth Animations</strong> - Use provided easing functions</li>
        <li><strong>Glass Effects</strong> - Use glass morphism for modern depth</li>
        <li><strong>Accessibility</strong> - Maintain proper contrast ratios</li>
        <li><strong>Responsive</strong> - Test on multiple screen sizes</li>
      </ul>
    </div>

    <div className="ds-card">
      <h3 className="ds-card-title">Don'ts ❌</h3>
      <ul className="ds-list">
        <li><strong>Don't Hardcode Colors</strong> - Always use CSS variables</li>
        <li><strong>Don't Skip Transitions</strong> - All interactive elements should animate</li>
        <li><strong>Don't Overuse Glow</strong> - Use glow effects sparingly</li>
        <li><strong>Don't Mix Fonts</strong> - Stick to the defined font families</li>
        <li><strong>Don't Ignore Hierarchy</strong> - Use proper text opacity levels</li>
        <li><strong>Don't Break Glass</strong> - Maintain backdrop-filter consistency</li>
      </ul>
    </div>

    <div className="ds-card">
      <h3 className="ds-card-title">Component Checklist</h3>
      <p>When creating a new component:</p>
      <ul className="ds-checklist">
        <li>Uses design tokens (colors, spacing, typography)</li>
        <li>Has proper hover states with transitions</li>
        <li>Includes glass morphism if appropriate</li>
        <li>Uses correct border radius scale</li>
        <li>Has proper text hierarchy</li>
        <li>Includes smooth animations</li>
        <li>Is responsive</li>
        <li>Has proper focus states for accessibility</li>
      </ul>
    </div>
  </div>
)

export default DesignSystem
