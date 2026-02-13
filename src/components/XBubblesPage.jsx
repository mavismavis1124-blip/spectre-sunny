/**
 * XBubblesPage Component
 * Standalone page for X Bubbles visualization
 * Extracted from TradingChart.jsx
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import './XBubblesPage.css'

const XBubblesPage = () => {
  // X Bubbles initial data - KOL network connections
  // Categories: 'main' (green), 'project' (pink), 'top5' (yellow), 'kol100k' (orange), 'kolUnder100k' (purple)
  const initialBubblesData = [
    { id: 0, user: 'Spectre AI', handle: '@Spectre__AI', avatar: '/logo.png', followers: '125K', followersNum: 125000, size: 'center', x: 50, y: 50, category: 'main', timestamp: Date.now() - 3600000 },
    { id: 1, user: 'Crypto Banter', handle: '@CryptoBanter', avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=CryptoBanter&backgroundColor=ff6b35', followers: '892K', followersNum: 892000, size: 'large', x: 75, y: 25, category: 'top5', timestamp: Date.now() - 7200000 },
    { id: 2, user: 'Lark Davis', handle: '@TheCryptoLark', avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=LarkDavis&backgroundColor=2563eb', followers: '456K', followersNum: 456000, size: 'large', x: 85, y: 55, category: 'top5', timestamp: Date.now() - 1800000 },
    { id: 3, user: 'Altcoin Daily', handle: '@AltcoinDailyio', avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=AltcoinDaily&backgroundColor=dc2626', followers: '1.2M', followersNum: 1200000, size: 'xlarge', x: 70, y: 75, category: 'top5', timestamp: Date.now() - 86400000 },
    { id: 4, user: 'Coin Bureau', handle: '@coinbureau', avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=CoinBureau&backgroundColor=0ea5e9', followers: '2.1M', followersNum: 2100000, size: 'xlarge', x: 25, y: 70, category: 'top5', timestamp: Date.now() - 172800000 },
    { id: 5, user: 'CryptoWhale', handle: '@cryptowhale_io', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=whale&backgroundColor=6366f1', followers: '234K', followersNum: 234000, size: 'medium', x: 15, y: 40, category: 'kol100k', timestamp: Date.now() - 3600000 },
    { id: 6, user: 'DeFi Marcus', handle: '@defi_marcus', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=marcus&backgroundColor=8b5cf6', followers: '87K', followersNum: 87000, size: 'small', x: 20, y: 15, category: 'kolUnder100k', timestamp: Date.now() - 300000 },
    { id: 7, user: 'AlphaSeeker', handle: '@alpha_seeker', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alpha&backgroundColor=06b6d4', followers: '156K', followersNum: 156000, size: 'medium', x: 40, y: 20, category: 'kol100k', timestamp: Date.now() - 600000 },
    { id: 8, user: 'Trader Joe', handle: '@traderjoe_eth', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=joe&backgroundColor=10b981', followers: '45K', followersNum: 45000, size: 'small', x: 90, y: 80, category: 'kolUnder100k', timestamp: Date.now() - 1800000 },
    { id: 9, user: 'Wizz', handle: '@WizzCrypto', avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Wizz&backgroundColor=f59e0b', followers: '14.1K', followersNum: 14100, size: 'small', x: 60, y: 85, category: 'kolUnder100k', timestamp: Date.now() - 2592000000 },
    { id: 10, user: 'Palm AI', handle: '@PalmAI_', avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=PalmAI&backgroundColor=22c55e', followers: '67K', followersNum: 67000, size: 'medium', x: 35, y: 80, category: 'project', timestamp: Date.now() - 604800000 },
  ]
  
  // X Bubbles Filter State
  const [legendFilter, setLegendFilter] = useState({
    main: true,
    project: true,
    top5: true,
    kol100k: true,
    kolUnder100k: true
  })
  const [timeFilter, setTimeFilter] = useState('all')
  const [followersRange, setFollowersRange] = useState({ min: '', max: '' })
  const [legendDropdownOpen, setLegendDropdownOpen] = useState(false)
  const [timeDropdownOpen, setTimeDropdownOpen] = useState(false)
  const [followersDropdownOpen, setFollowersDropdownOpen] = useState(false)
  
  // Time filter options
  const timeFilterOptions = [
    { value: 'all', label: 'All time', ms: null },
    { value: '5m', label: 'Last 5 minutes', ms: 5 * 60 * 1000 },
    { value: '30m', label: 'Last 30 minutes', ms: 30 * 60 * 1000 },
    { value: '1h', label: 'Last 1 hour', ms: 60 * 60 * 1000 },
    { value: '6h', label: 'Last 6 hours', ms: 6 * 60 * 60 * 1000 },
    { value: '24h', label: 'Last 24 hours', ms: 24 * 60 * 60 * 1000 },
    { value: '1w', label: 'Last 1 week', ms: 7 * 24 * 60 * 60 * 1000 },
    { value: '1M', label: 'Last 1 month', ms: 30 * 24 * 60 * 60 * 1000 },
    { value: '3M', label: 'Last 3 month', ms: 90 * 24 * 60 * 60 * 1000 },
    { value: '6M', label: 'Last 6 month', ms: 180 * 24 * 60 * 60 * 1000 },
    { value: '1y', label: 'Last 1 year', ms: 365 * 24 * 60 * 60 * 1000 },
  ]

  // Connections between bubbles [from, to]
  const bubbleConnections = [
    [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8], [0, 9], [0, 10], // All connect to center
    [1, 2], // Crypto Banter <-> Lark Davis
    [1, 7], // Crypto Banter <-> AlphaSeeker
    [2, 3], // Lark Davis <-> Altcoin Daily
    [3, 4], // Altcoin Daily <-> Coin Bureau
    [4, 5], // Coin Bureau <-> CryptoWhale
    [5, 6], // CryptoWhale <-> DeFi Marcus
    [6, 7], // DeFi Marcus <-> AlphaSeeker
    [8, 9], // Trader Joe <-> Wizz
    [9, 10], // Wizz <-> Palm AI
    [3, 9], // Altcoin Daily <-> Wizz
    [4, 10], // Coin Bureau <-> Palm AI
  ]

  // Physics simulation state - bubbles are stable by default
  // Spread bubbles across a larger 3D space for space flight experience
  const [bubblePhysics, setBubblePhysics] = useState(() => 
    initialBubblesData.map((b, index) => ({
      ...b,
      vx: 0, // velocity x - starts at 0 (stable)
      vy: 0, // velocity y - starts at 0 (stable)
      vz: 0, // velocity z - for 3D mode
      // Spread bubbles in a sphere around center, with center bubble at origin
      z: b.size === 'center' ? 0 : (Math.random() - 0.5) * 800,
      // Also randomize x/y slightly for 3D mode
      x3d: b.x + (b.size === 'center' ? 0 : (Math.random() - 0.5) * 20),
      y3d: b.y + (b.size === 'center' ? 0 : (Math.random() - 0.5) * 20),
    }))
  )
  
  // Interaction states
  const [selectedBubble, setSelectedBubble] = useState(null)
  const [draggingBubble, setDraggingBubble] = useState(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [viewMode, setViewMode] = useState('3D') // '2D' or '3D'
  
  // 3D Camera state - expanded range for space flight
  const [camera, setCamera] = useState({ x: 0, y: 0, z: 800, rotX: 0, rotY: 0 })
  const [isNavigating, setIsNavigating] = useState(false)
  const [navigationMode, setNavigationMode] = useState(null) // 'pan', 'rotate', 'forward'
  const [flightSpeed, setFlightSpeed] = useState(0) // Current forward velocity for smooth flight
  const [isWarpSpeed, setIsWarpSpeed] = useState(false) // Warp drive effect
  const [flightControlsCollapsed, setFlightControlsCollapsed] = useState(false)
  
  // Zoom and fullscreen
  const [zoomLevel, setZoomLevel] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  // Refs
  const bubblesContainerRef = useRef(null)
  const animationRef = useRef(null)
  const mousePos = useRef({ x: 0, y: 0 })
  const lastMousePos = useRef({ x: 0, y: 0 })
  const keysPressed = useRef(new Set())
  
  // Physics constants - tuned to match Bubblemaps feel
  const SPRING_STRENGTH = 0.008    // How strongly connected bubbles pull together
  const SPRING_LENGTH = 120        // Ideal distance between connected bubbles
  const REPULSION_STRENGTH = 800   // How strongly bubbles push apart
  const DAMPING = 0.92             // Friction (0.9 = bouncy, 0.99 = sluggish)
  const CENTER_GRAVITY = 0.0005    // Gentle pull toward center
  const MAX_VELOCITY = 8           // Speed limit

  // Filter bubbles based on all filters
  const getFilteredBubbles = useCallback(() => {
    if (!bubblePhysics || bubblePhysics.length === 0) return []
    
    return bubblePhysics.filter(bubble => {
      // Category filter - if category doesn't exist, show the bubble
      const category = bubble.category || 'kolUnder100k'
      if (legendFilter[category] === false) return false
      
      // Time filter - skip if 'all' time selected
      if (timeFilter && timeFilter !== 'all') {
        const timeOption = timeFilterOptions.find(t => t.value === timeFilter)
        if (timeOption && timeOption.ms && bubble.timestamp) {
          const now = Date.now()
          if (now - bubble.timestamp > timeOption.ms) return false
        }
      }
      
      // Followers range filter - skip if not set
      if (followersRange.min !== '' || followersRange.max !== '') {
        const followerCount = bubble.followersNum || 0
        const minFollowers = followersRange.min !== '' ? parseInt(followersRange.min) : 0
        const maxFollowers = followersRange.max !== '' ? parseInt(followersRange.max) : Infinity
        if (followerCount < minFollowers || followerCount > maxFollowers) return false
      }
      
      return true
    })
  }, [bubblePhysics, legendFilter, timeFilter, followersRange, timeFilterOptions])
  
  // Get category color for bubble border
  const getCategoryColor = (category) => {
    const colors = {
      main: '#22c55e',      // Green
      project: '#ec4899',   // Pink
      top5: '#eab308',      // Yellow
      kol100k: '#f97316',   // Orange
      kolUnder100k: '#a855f7' // Purple
    }
    return colors[category] || '#8b5cf6'
  }

  // Get connected bubble IDs for styling
  const getConnectedBubbles = (bubbleId) => {
    const connected = new Set()
    bubbleConnections.forEach(([from, to]) => {
      if (from === bubbleId) connected.add(to)
      if (to === bubbleId) connected.add(from)
    })
    return connected
  }

  // Handle bubble drag start
  const handleBubbleMouseDown = (e, bubbleId) => {
    e.preventDefault()
    e.stopPropagation()
    
    const bubble = bubblePhysics.find(b => b.id === bubbleId)
    if (!bubble || !bubblesContainerRef.current) return

    const rect = bubblesContainerRef.current.getBoundingClientRect()
    const mouseX = ((e.clientX - rect.left) / rect.width) * 100
    const mouseY = ((e.clientY - rect.top) / rect.height) * 100
    
    mousePos.current = { x: mouseX, y: mouseY }
    setDraggingBubble(bubbleId)
    setDragOffset({ x: mouseX - bubble.x, y: mouseY - bubble.y })
  }

  // Track mouse movement globally
  const handleGlobalMouseMove = (e) => {
    if (!bubblesContainerRef.current) return
    const rect = bubblesContainerRef.current.getBoundingClientRect()
    mousePos.current = {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    }
  }

  const handleBubbleDragEnd = () => {
    setDraggingBubble(null)
  }

  // 3D Mouse navigation handlers
  const handle3DMouseDown = (e) => {
    if (viewMode !== '3D') return
    
    e.preventDefault()
    lastMousePos.current = { x: e.clientX, y: e.clientY }
    
    if (e.button === 0) { // Left click - rotate
      setNavigationMode('rotate')
    } else if (e.button === 2) { // Right click - pan
      setNavigationMode('pan')
    } else if (e.button === 1) { // Middle click - forward/back
      setNavigationMode('forward')
    }
    setIsNavigating(true)
  }
  
  const handle3DMouseMove = (e) => {
    if (!isNavigating || viewMode !== '3D') return
    
    const dx = e.clientX - lastMousePos.current.x
    const dy = e.clientY - lastMousePos.current.y
    lastMousePos.current = { x: e.clientX, y: e.clientY }
    
    setCamera(prev => {
      let { x, y, z, rotX, rotY } = prev
      
      if (navigationMode === 'rotate') {
        // Intuitive: drag right = look right, drag up = look up
        rotY -= dx * 0.3
        rotX += dy * 0.3
        rotX = Math.max(-60, Math.min(60, rotX))
        rotY = Math.max(-60, Math.min(60, rotY))
      } else if (navigationMode === 'pan') {
        x -= dx * 0.5
        y -= dy * 0.5
      } else if (navigationMode === 'forward') {
        z -= dy * 2
        z = Math.max(100, Math.min(1500, z))
      }
      
      return { x, y, z, rotX, rotY }
    })
  }
  
  const handle3DMouseUp = () => {
    setIsNavigating(false)
    setNavigationMode(null)
  }
  
  const handle3DWheel = useCallback((e) => {
    if (viewMode !== '3D') return
    
    e.preventDefault()
    e.stopPropagation()
    setCamera(prev => {
      let z = prev.z + e.deltaY * 1.5
      z = Math.max(-500, Math.min(2000, z))
      return { ...prev, z }
    })
  }, [viewMode])
  
  // Reset 3D camera - return to starting position
  const resetCamera = () => {
    setCamera({ x: 0, y: 0, z: 800, rotX: 0, rotY: 0 })
    setFlightSpeed(0)
  }

  // Close filter dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.bubble-filter-dropdown')) {
        setLegendDropdownOpen(false)
        setTimeDropdownOpen(false)
        setFollowersDropdownOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  // Global mouse listeners for dragging
  useEffect(() => {
    if (draggingBubble !== null) {
      window.addEventListener('mousemove', handleGlobalMouseMove)
      window.addEventListener('mouseup', handleBubbleDragEnd)
      return () => {
        window.removeEventListener('mousemove', handleGlobalMouseMove)
        window.removeEventListener('mouseup', handleBubbleDragEnd)
      }
    }
  }, [draggingBubble])

  // Physics simulation - runs when dragging or settling
  useEffect(() => {
    // When not dragging, gently settle any remaining movement
    if (draggingBubble === null) {
      // Check if any bubbles are still moving
      const stillMoving = bubblePhysics.some(b => Math.abs(b.vx) > 0.01 || Math.abs(b.vy) > 0.01)
      
      if (stillMoving) {
        // Smooth settle animation
        const settleFrame = () => {
          setBubblePhysics(prev => {
            const hasMotion = prev.some(b => Math.abs(b.vx) > 0.01 || Math.abs(b.vy) > 0.01)
            if (!hasMotion) return prev
            
            return prev.map(b => ({
              ...b,
              vx: b.vx * 0.88, // Gradual slowdown
              vy: b.vy * 0.88,
              x: b.x + b.vx * 0.6,
              y: b.y + b.vy * 0.6,
            }))
          })
        }
        
        // Run settle animation for a few frames
        const settleInterval = setInterval(settleFrame, 16)
        setTimeout(() => clearInterval(settleInterval), 500)
      }
      return
    }

    const simulate = () => {
      setBubblePhysics(prev => {
        const newState = prev.map(bubble => {
          // If being dragged, follow mouse with smooth easing
          if (draggingBubble === bubble.id) {
            const targetX = mousePos.current.x - dragOffset.x
            const targetY = mousePos.current.y - dragOffset.y
            
            // Smooth easing - slower, more organic follow (0.12 = very smooth)
            const easing = 0.12
            const newX = bubble.x + (targetX - bubble.x) * easing
            const newY = bubble.y + (targetY - bubble.y) * easing
            
            return {
              ...bubble,
              x: newX,
              y: newY,
              vx: (newX - bubble.x) * 0.8, // Gentle momentum transfer
              vy: (newY - bubble.y) * 0.8,
            }
          }

          let fx = 0, fy = 0 // Forces

          // 1. Spring forces - gentle pull toward connected bubbles
          bubbleConnections.forEach(([from, to]) => {
            let other = null
            if (from === bubble.id) other = prev.find(b => b.id === to)
            else if (to === bubble.id) other = prev.find(b => b.id === from)
            
            if (other) {
              const dx = other.x - bubble.x
              const dy = other.y - bubble.y
              const dist = Math.sqrt(dx * dx + dy * dy) || 1
              
              // Gentler spring force for organic movement
              const isConnectedToDragged = other.id === draggingBubble
              const springMult = isConnectedToDragged ? 1.5 : 0.5
              const force = (dist - SPRING_LENGTH / 5) * SPRING_STRENGTH * 0.5 * springMult
              
              fx += (dx / dist) * force
              fy += (dy / dist) * force
            }
          })

          // 2. Soft repulsion - very gentle push apart
          prev.forEach(other => {
            if (other.id === bubble.id) return
            const dx = bubble.x - other.x
            const dy = bubble.y - other.y
            const distSq = dx * dx + dy * dy || 1
            const dist = Math.sqrt(distSq)
            const minDist = 6
            
            if (dist < minDist * 2) {
              const force = (REPULSION_STRENGTH * 0.15) / distSq
              fx += (dx / dist) * force
              fy += (dy / dist) * force
            }
          })

          // 3. Apply forces with heavy damping for smooth movement
          let vx = (bubble.vx * 0.92 + fx * 0.5) // Blend velocity with force
          let vy = (bubble.vy * 0.92 + fy * 0.5)

          // 4. Lower max velocity for slower movement
          const maxSpeed = 3
          const speed = Math.sqrt(vx * vx + vy * vy)
          if (speed > maxSpeed) {
            vx = (vx / speed) * maxSpeed
            vy = (vy / speed) * maxSpeed
          }
          
          // Stop tiny movements
          if (Math.abs(vx) < 0.005) vx = 0
          if (Math.abs(vy) < 0.005) vy = 0

          // 5. Update position smoothly
          let newX = bubble.x + vx
          let newY = bubble.y + vy

          // 6. Soft bounds (ease back instead of hard clamp)
          if (newX < 8) newX = newX + (8 - newX) * 0.1
          if (newX > 92) newX = newX - (newX - 92) * 0.1
          if (newY < 10) newY = newY + (10 - newY) * 0.1
          if (newY > 90) newY = newY - (newY - 90) * 0.1

          return { ...bubble, x: newX, y: newY, vx, vy }
        })

        return newState
      })

      animationRef.current = requestAnimationFrame(simulate)
    }

    animationRef.current = requestAnimationFrame(simulate)
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [draggingBubble, dragOffset])

  // Handle keyboard navigation for 3D mode + ESC for fullscreen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
        return
      }
      
      // 3D Navigation keys (only in 3D mode)
      if (viewMode === '3D') {
        keysPressed.current.add(e.key.toLowerCase())
      }
    }
    
    const handleKeyUp = (e) => {
      keysPressed.current.delete(e.key.toLowerCase())
    }
    
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isFullscreen, viewMode])
  
  // 3D Space Flight animation loop
  useEffect(() => {
    if (viewMode !== '3D') return
    
    let animId
    const baseSpeed = 2
    const rotSpeed = 0.4
    const acceleration = 0.3
    const deceleration = 0.95
    const maxSpeed = 25
    const warpMultiplier = 4
    
    let currentVelocity = { x: 0, y: 0, z: 0 }
    
    const animate = () => {
      const keys = keysPressed.current
      const isWarp = keys.has('shift')
      setIsWarpSpeed(isWarp)
      
      const speedMult = isWarp ? warpMultiplier : 1
      
      // Target velocities based on input
      let targetVx = 0, targetVy = 0, targetVz = 0
      
      // Forward/Back (W/S) - main flight controls
      if (keys.has('w')) targetVz = baseSpeed * speedMult * 3
      if (keys.has('s')) targetVz = -baseSpeed * speedMult * 2
      
      // Strafe (A/D)
      if (keys.has('a')) targetVx = -baseSpeed * speedMult
      if (keys.has('d')) targetVx = baseSpeed * speedMult
      
      // Up/Down (Q/E) 
      if (keys.has('q')) targetVy = -baseSpeed * speedMult
      if (keys.has('e')) targetVy = baseSpeed * speedMult
      
      // Boost forward/backward (R/F)
      if (keys.has('r')) targetVz = baseSpeed * speedMult * 5
      if (keys.has('f')) targetVz = -baseSpeed * speedMult * 3
      
      // Smooth acceleration toward target
      currentVelocity.x += (targetVx - currentVelocity.x) * acceleration
      currentVelocity.y += (targetVy - currentVelocity.y) * acceleration
      currentVelocity.z += (targetVz - currentVelocity.z) * acceleration
      
      // Decelerate when no input
      if (targetVx === 0) currentVelocity.x *= deceleration
      if (targetVy === 0) currentVelocity.y *= deceleration
      if (targetVz === 0) currentVelocity.z *= deceleration
      
      // Clamp velocity
      currentVelocity.x = Math.max(-maxSpeed, Math.min(maxSpeed, currentVelocity.x))
      currentVelocity.y = Math.max(-maxSpeed, Math.min(maxSpeed, currentVelocity.y))
      currentVelocity.z = Math.max(-maxSpeed * 2, Math.min(maxSpeed * 2, currentVelocity.z))
      
      // Update flight speed for UI
      setFlightSpeed(Math.abs(currentVelocity.z))
      
      // Apply velocity and rotation
      const hasMovement = Math.abs(currentVelocity.x) > 0.01 || 
                          Math.abs(currentVelocity.y) > 0.01 || 
                          Math.abs(currentVelocity.z) > 0.01 ||
                          keys.size > 0
      
      if (hasMovement) {
        setCamera(prev => {
          let { x, y, z, rotX, rotY } = prev
          
          // Rotation with arrow keys (intuitive: arrow direction = look direction)
          if (keys.has('arrowleft')) rotY += rotSpeed
          if (keys.has('arrowright')) rotY -= rotSpeed
          if (keys.has('arrowup')) rotX -= rotSpeed
          if (keys.has('arrowdown')) rotX += rotSpeed
          
          // Clamp rotation (allow more freedom for space feel)
          rotX = Math.max(-80, Math.min(80, rotX))
          rotY = Math.max(-80, Math.min(80, rotY))
          
          // Convert rotation to radians for direction calculation
          const radX = (rotX * Math.PI) / 180
          const radY = (rotY * Math.PI) / 180
          
          // Transform velocity based on camera rotation (fly where you're looking)
          // W = fly toward center of screen, S = fly backward
          const forwardX = Math.sin(radY) * currentVelocity.z
          const forwardY = -Math.sin(radX) * currentVelocity.z
          const forwardZ = -Math.cos(radY) * Math.cos(radX) * currentVelocity.z
          
          // Strafe (X velocity) moves perpendicular to camera facing
          const strafeX = Math.cos(radY) * currentVelocity.x
          const strafeZ = Math.sin(radY) * currentVelocity.x
          
          // Up/down (Y velocity) stays in world space
          const verticalY = currentVelocity.y
          
          // Apply transformed velocity
          x += forwardX + strafeX
          y += forwardY + verticalY
          z += forwardZ + strafeZ
          
          // Extended Z range for deep space exploration
          z = Math.max(-500, Math.min(2000, z))
          
          // Extended X/Y range
          x = Math.max(-500, Math.min(500, x))
          y = Math.max(-500, Math.min(500, y))
          
          return { x, y, z, rotX, rotY }
        })
      }
      
      animId = requestAnimationFrame(animate)
    }
    
    animate()
    return () => cancelAnimationFrame(animId)
  }, [viewMode])
  
  // Attach wheel event to X Bubbles container
  useEffect(() => {
    const container = bubblesContainerRef.current
    if (!container) return
    
    container.addEventListener('wheel', handle3DWheel, { passive: false })
    return () => {
      container.removeEventListener('wheel', handle3DWheel)
    }
  }, [handle3DWheel])

  // Add/remove body class for fullscreen mode
  useEffect(() => {
    if (isFullscreen) {
      document.body.classList.add('x-bubbles-fullscreen')
    } else {
      document.body.classList.remove('x-bubbles-fullscreen')
    }
    return () => {
      document.body.classList.remove('x-bubbles-fullscreen')
    }
  }, [isFullscreen])

  return (
    <div className="xbubbles-page">
      <div 
        className={`x-bubbles-container ${isDarkMode ? 'dark-theme' : 'light-theme'} ${isFullscreen ? 'fullscreen-bubbles' : ''} mode-${viewMode.toLowerCase()} ${isNavigating ? 'navigating' : ''}`} 
        ref={bubblesContainerRef}
        onMouseDown={viewMode === '3D' ? handle3DMouseDown : undefined}
        onMouseMove={viewMode === '3D' ? handle3DMouseMove : undefined}
        onMouseUp={viewMode === '3D' ? handle3DMouseUp : undefined}
        onMouseLeave={viewMode === '3D' ? handle3DMouseUp : undefined}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Space environment - particles and stars */}
        {viewMode === '3D' && (
          <>
            {/* Floating orbs - reduced count */}
            <div className="space-particles">
              {[...Array(6)].map((_, i) => (
                <div 
                  key={i} 
                  className={`space-particle sp-${(i % 4) + 1}`}
                  style={{
                    left: `${10 + (i * 15)}%`,
                    top: `${15 + (i * 12)}%`,
                    animationDelay: `${-i * 8}s`,
                  }}
                />
              ))}
            </div>
            
            {/* Subtle stars */}
            <div className="space-stars-subtle">
              {[...Array(15)].map((_, i) => (
                <div 
                  key={i} 
                  className="subtle-star"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${-Math.random() * 20}s`,
                    width: `${2 + Math.random() * 2}px`,
                    height: `${2 + Math.random() * 2}px`,
                  }}
                />
              ))}
            </div>
          </>
        )}
        
        {/* Warp speed effect */}
        {isWarpSpeed && viewMode === '3D' && (
          <div className="warp-effect">
            {[...Array(30)].map((_, i) => (
              <div 
                key={i} 
                className="warp-line"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDuration: `${0.3 + Math.random() * 0.3}s`,
                  animationDelay: `${Math.random() * 0.2}s`
                }}
              />
            ))}
          </div>
        )}
        
        {/* 3D Scene wrapper */}
        <div 
          className="scene-3d"
          style={viewMode === '3D' ? {
            transform: `
              perspective(2000px)
              rotateX(${camera.rotX}deg)
              rotateY(${camera.rotY}deg)
              translateX(${-camera.x}px)
              translateY(${-camera.y}px)
              translateZ(${800 - camera.z}px)
            `,
            transformStyle: 'preserve-3d'
          } : {}}
        >
        
          {/* Floating energy particles */}
          <div className="energy-particles">
            <div className="energy-particle" />
            <div className="energy-particle" />
            <div className="energy-particle" />
            <div className="energy-particle" />
            <div className="energy-particle" />
            <div className="energy-particle" />
            <div className="energy-particle" />
          </div>
          
          {/* Zoomable content area */}
          <div 
            className="bubbles-zoom-area"
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
          >
            {/* Background ambient bubbles - static positions for smooth effect */}
            <div className={`ambient-bubbles ${draggingBubble !== null ? 'is-dragging' : ''}`}>
              <div className="ambient-bubble ab-1" style={{ left: '8%', top: '15%', width: '80px', height: '80px' }} />
              <div className="ambient-bubble ab-2" style={{ left: '85%', top: '20%', width: '60px', height: '60px' }} />
              <div className="ambient-bubble ab-3" style={{ left: '75%', top: '70%', width: '100px', height: '100px' }} />
              <div className="ambient-bubble ab-4" style={{ left: '10%', top: '75%', width: '70px', height: '70px' }} />
              <div className="ambient-bubble ab-5" style={{ left: '45%', top: '5%', width: '50px', height: '50px' }} />
              <div className="ambient-bubble ab-6" style={{ left: '92%', top: '50%', width: '55px', height: '55px' }} />
              <div className="ambient-bubble ab-7" style={{ left: '5%', top: '45%', width: '45px', height: '45px' }} />
              <div className="ambient-bubble ab-8" style={{ left: '60%', top: '90%', width: '65px', height: '65px' }} />
            </div>
          
            {/* Drag trail effect */}
            {draggingBubble !== null && (
              <div className="drag-trail-container">
                <div className="drag-ripple ripple-1" style={{ 
                  left: `${bubblePhysics.find(b => b.id === draggingBubble)?.x || 50}%`,
                  top: `${bubblePhysics.find(b => b.id === draggingBubble)?.y || 50}%`
                }} />
                <div className="drag-ripple ripple-2" style={{ 
                  left: `${bubblePhysics.find(b => b.id === draggingBubble)?.x || 50}%`,
                  top: `${bubblePhysics.find(b => b.id === draggingBubble)?.y || 50}%`
                }} />
                <div className="drag-ripple ripple-3" style={{ 
                  left: `${bubblePhysics.find(b => b.id === draggingBubble)?.x || 50}%`,
                  top: `${bubblePhysics.find(b => b.id === draggingBubble)?.y || 50}%`
                }} />
              </div>
            )}

            {/* Connection lines (SVG) */}
            <svg className="bubble-connections" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                {/* Arrow marker - compact */}
                <marker
                  id="arrowhead"
                  markerWidth="2.5"
                  markerHeight="2"
                  refX="2"
                  refY="1"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <polygon points="0 0, 2.5 1, 0 2" fill="url(#arrowGradient)" />
                </marker>
                <marker
                  id="arrowheadLight"
                  markerWidth="2.5"
                  markerHeight="2"
                  refX="2"
                  refY="1"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <polygon points="0 0, 2.5 1, 0 2" fill="url(#arrowGradientLight)" />
                </marker>
                
                {/* Gradients */}
                <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#A855F7" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#EC4899" stopOpacity="0.4" />
                </linearGradient>
                <linearGradient id="arrowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#A855F7" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#EC4899" stopOpacity="0.7" />
                </linearGradient>
                <linearGradient id="connectionGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#EC4899" stopOpacity="0.15" />
                </linearGradient>
                
                {/* Light theme gradients */}
                <linearGradient id="connectionGradientLight" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.7" />
                  <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#A855F7" stopOpacity="0.4" />
                </linearGradient>
                <linearGradient id="arrowGradientLight" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#A855F7" stopOpacity="0.6" />
                </linearGradient>
                
                {/* Glow filter */}
                <filter id="connectionGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="0.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              
              {(() => {
                const visibleBubbles = getFilteredBubbles()
                const visibleIds = new Set(visibleBubbles.map(b => b.id))
                return bubbleConnections.map(([fromId, toId], index) => {
                // Only show connection if both bubbles are visible
                if (!visibleIds.has(fromId) || !visibleIds.has(toId)) return null
                const fromBubble = visibleBubbles.find(b => b.id === fromId)
                const toBubble = visibleBubbles.find(b => b.id === toId)
                if (!fromBubble || !toBubble) return null
                
                // Calculate direction and shorten line for arrow
                const dx = toBubble.x - fromBubble.x
                const dy = toBubble.y - fromBubble.y
                const length = Math.sqrt(dx * dx + dy * dy)
                const offsetRatio = 2.5 / length // Stop before bubble edge
                const endX = toBubble.x - dx * offsetRatio
                const endY = toBubble.y - dy * offsetRatio
                
                // Theme-based styles
                const gradientId = isDarkMode ? 'connectionGradient' : 'connectionGradientLight'
                const arrowId = isDarkMode ? 'arrowhead' : 'arrowheadLight'
                
                return (
                  <g key={index} className="connection-group">
                    {/* Glow line (behind) */}
                    <line
                      x1={fromBubble.x}
                      y1={fromBubble.y}
                      x2={endX}
                      y2={endY}
                      stroke="url(#connectionGlow)"
                      strokeWidth="1.5"
                      className="connection-glow"
                    />
                    {/* Main connection line with arrow */}
                    <line
                      x1={fromBubble.x}
                      y1={fromBubble.y}
                      x2={endX}
                      y2={endY}
                      stroke={`url(#${gradientId})`}
                      strokeWidth="0.4"
                      strokeDasharray="1.5 0.8"
                      markerEnd={`url(#${arrowId})`}
                      className="connection-line"
                      filter="url(#connectionGlowFilter)"
                    />
                    {/* Animated particle along line */}
                    <circle r="0.4" fill={isDarkMode ? "#A855F7" : "#7C3AED"} className="connection-particle">
                      <animateMotion
                        dur={`${3 + index * 0.5}s`}
                        repeatCount="indefinite"
                        path={`M${fromBubble.x},${fromBubble.y} L${endX},${endY}`}
                      />
                    </circle>
                  </g>
                )
              })
              })()}
            </svg>

            {/* All bubbles (including center) - rendered as planets in space */}
            {getFilteredBubbles().map(bubble => {
              const isCenter = bubble.size === 'center'
              const isDragging = draggingBubble === bubble.id
              const isConnectedToDragging = draggingBubble !== null && getConnectedBubbles(draggingBubble).has(bubble.id)
              const isMoving = Math.abs(bubble.vx) > 0.1 || Math.abs(bubble.vy) > 0.1
              const categoryColor = getCategoryColor(bubble.category)
              
              // 3D Space depth calculations - relative to camera
              const bubbleZ = bubble.z || 0
              const relativeZ = bubbleZ - (800 - camera.z) // Distance from camera
              
              // More dramatic scaling based on distance (like real perspective)
              const perspectiveScale = viewMode === '3D' 
                ? Math.max(0.1, Math.min(4, 400 / Math.max(100, 400 + relativeZ)))
                : 1
              
              // Opacity based on distance (far objects fade)
              const depthOpacity = viewMode === '3D' 
                ? Math.max(0.2, Math.min(1, 1 - Math.abs(relativeZ) / 1200))
                : 1
              
              // Blur only for very far objects (not close ones)
              const depthBlur = viewMode === '3D' && relativeZ < -200
                ? Math.max(0, Math.min(4, (-relativeZ - 200) / 200))
                : 0
              
              // Check if bubble is "behind" camera (don't render)
              if (viewMode === '3D' && relativeZ > 600) return null
              
              // Determine if this planet is close (for "passing by" effect)
              const isClose = viewMode === '3D' && Math.abs(relativeZ) < 150
              
              return (
                <div
                  key={bubble.id}
                  className={`kol-bubble ${bubble.size} ${selectedBubble === bubble.id ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${isConnectedToDragging ? 'following' : ''} ${isMoving ? 'in-motion' : ''} ${isClose ? 'planet-close' : ''}`}
                  data-category={bubble.category}
                  style={{
                    left: `${viewMode === '3D' ? (bubble.x3d || bubble.x) : bubble.x}%`,
                    top: `${viewMode === '3D' ? (bubble.y3d || bubble.y) : bubble.y}%`,
                    cursor: isDragging ? 'grabbing' : (viewMode === '3D' ? 'default' : 'grab'),
                    zIndex: isDragging ? 100 : (isCenter ? 50 : (selectedBubble === bubble.id ? 60 : Math.round(500 - relativeZ))),
                    transition: isDragging ? 'none' : 'opacity 0.3s ease',
                    transform: viewMode === '3D' 
                      ? `translateZ(${bubbleZ}px) scale(${perspectiveScale})`
                      : undefined,
                    opacity: depthOpacity,
                    filter: depthBlur > 0.5 ? `blur(${depthBlur}px)` : undefined,
                    '--category-color': categoryColor,
                    pointerEvents: viewMode === '3D' ? 'none' : 'auto', // Disable drag in 3D flight mode
                  }}
                  onMouseDown={(e) => viewMode !== '3D' && handleBubbleMouseDown(e, bubble.id)}
                  onClick={() => viewMode !== '3D' && !isDragging && setSelectedBubble(selectedBubble === bubble.id ? null : bubble.id)}
                >
                  {/* Title above bubble */}
                  <span className="kol-bubble-title">{bubble.user}</span>
                  
                  <div className="kol-bubble-glow" />
                  <div className="kol-bubble-ring" />
                  <div className="kol-bubble-inner">
                    <img src={bubble.avatar} alt={bubble.user} />
                  </div>
                  
                  {selectedBubble === bubble.id && !isCenter && (
                    <div className="kol-bubble-tooltip">
                      <button className="tooltip-close" onClick={(e) => { e.stopPropagation(); setSelectedBubble(null); }}>×</button>
                      <div className="tooltip-header">
                        <img src={bubble.avatar} alt={bubble.user} className="tooltip-avatar" />
                        <div className="tooltip-info">
                          <span className="tooltip-name">{bubble.user}</span>
                          <span className="tooltip-followers">{bubble.followers} followers</span>
                        </div>
                      </div>
                      <div className="tooltip-socials">
                        <button className="social-btn">𝕏</button>
                        <button className="social-btn">
                          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                        </button>
                        <button className="social-btn">
                          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                        </button>
                        <button className="social-btn">🌐</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div> {/* End bubbles-zoom-area */}
        </div> {/* End scene-3d */}
        
        {/* Flight HUD */}
        {viewMode === '3D' && (
          <div className="flight-hud">
            {/* Crosshair */}
            <div className="hud-crosshair">
              <div className="crosshair-ring" />
              <div className="crosshair-dot" />
              <div className="crosshair-line crosshair-h" />
              <div className="crosshair-line crosshair-v" />
            </div>
            
            {/* Speed indicator - bottom center */}
            <div className="hud-speed-bottom">
              <div className={`speed-display ${isWarpSpeed ? 'warp' : ''}`}>
                <span className="speed-value">{Math.round(flightSpeed * 10)}</span>
                <span className="speed-unit">m/s</span>
                {isWarpSpeed && <span className="warp-badge">WARP</span>}
              </div>
            </div>
            
            {/* Position indicator */}
            <div className="hud-position">
              <div className="pos-label">POSITION</div>
              <div className="pos-coords">
                <span>X: {Math.round(camera.x)}</span>
                <span>Y: {Math.round(camera.y)}</span>
                <span>Z: {Math.round(camera.z)}</span>
              </div>
            </div>
            
            {/* Compass */}
            <div className="hud-compass">
              <div 
                className="compass-ring"
                style={{ transform: `rotate(${-camera.rotY}deg)` }}
              >
                <span className="compass-n">N</span>
                <span className="compass-e">E</span>
                <span className="compass-s">S</span>
                <span className="compass-w">W</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Flight Controls Help - Collapsible */}
        {viewMode === '3D' && (
          <div className={`nav-help-3d ${flightControlsCollapsed ? 'collapsed' : ''}`}>
            <div className="nav-help-header">
              <div className="nav-help-title">🚀 Flight Controls</div>
              <button 
                className="nav-collapse-btn"
                onClick={() => setFlightControlsCollapsed(!flightControlsCollapsed)}
              >
                {flightControlsCollapsed ? '▶' : '◀'}
              </button>
            </div>
            {!flightControlsCollapsed && (
              <div className="nav-help-content">
                <div className="nav-help-item"><kbd>W</kbd> Fly Forward</div>
                <div className="nav-help-item"><kbd>S</kbd> Fly Backward</div>
                <div className="nav-help-item"><kbd>A</kbd><kbd>D</kbd> Strafe</div>
                <div className="nav-help-item"><kbd>Q</kbd><kbd>E</kbd> Up / Down</div>
                <div className="nav-help-item"><kbd>R</kbd> Boost Forward</div>
                <div className="nav-help-item"><kbd>Shift</kbd> Warp Speed</div>
                <div className="nav-help-divider" />
                <div className="nav-help-item"><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> Look Around</div>
                <div className="nav-help-divider" />
                <div className="nav-help-item">🖱️ Drag to look</div>
                <div className="nav-help-item">🖱️ Scroll to zoom</div>
                <button className="nav-reset-btn" onClick={resetCamera}>
                  🏠 Return to Base
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* 3D Depth Indicator */}
        {viewMode === '3D' && (
          <div className="depth-indicator">
            <div className="depth-label">DEPTH</div>
            <div className="depth-bar">
              <div 
                className="depth-marker" 
                style={{ bottom: `${Math.max(0, Math.min(100, ((2000 - camera.z) / 2500) * 100))}%` }}
              />
              {/* Planet markers on depth bar */}
              {bubblePhysics.slice(0, 5).map((bubble, i) => (
                <div 
                  key={i}
                  className="depth-planet-marker"
                  style={{ 
                    bottom: `${Math.max(0, Math.min(100, ((2000 - (bubble.z || 0)) / 2500) * 100))}%`,
                    opacity: 0.6
                  }}
                  title={bubble.user}
                />
              ))}
            </div>
            <div className="depth-value">{Math.round(camera.z)}m</div>
          </div>
        )}

        {/* Top Left Controls */}
        <div className="bubbles-controls-top">
          {/* Legend Filter Dropdown */}
          <div className="bubble-filter-dropdown">
            <button 
              className={`bubble-control-btn legend ${legendDropdownOpen ? 'active' : ''}`}
              onClick={() => {
                setLegendDropdownOpen(!legendDropdownOpen)
                setTimeDropdownOpen(false)
                setFollowersDropdownOpen(false)
              }}
            >
              <span>🎨</span> X Bubbles Legend
              <svg viewBox="0 0 20 20" fill="currentColor" className={legendDropdownOpen ? 'rotated' : ''}>
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
          </button>
            {legendDropdownOpen && (
              <div className="filter-dropdown-menu legend-menu">
                <div className="filter-legend-item">
                  <label className="toggle-switch-label">
                    <input 
                      type="checkbox" 
                      checked={legendFilter.main}
                      onChange={() => setLegendFilter(prev => ({ ...prev, main: !prev.main }))}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  <span className="legend-color" style={{ background: '#22c55e' }}></span>
                  <span className="legend-label"><strong>Green</strong> Main Project</span>
                </div>
                <div className="filter-legend-item">
                  <label className="toggle-switch-label">
                    <input 
                      type="checkbox" 
                      checked={legendFilter.project}
                      onChange={() => setLegendFilter(prev => ({ ...prev, project: !prev.project }))}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  <span className="legend-color" style={{ background: '#ec4899' }}></span>
                  <span className="legend-label"><strong>Pink</strong> Projects</span>
                </div>
                <div className="filter-legend-item">
                  <label className="toggle-switch-label">
                    <input 
                      type="checkbox" 
                      checked={legendFilter.top5}
                      onChange={() => setLegendFilter(prev => ({ ...prev, top5: !prev.top5 }))}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  <span className="legend-color" style={{ background: '#eab308' }}></span>
                  <span className="legend-label"><strong>Yellow</strong> TOP 5 KOLs by followers</span>
                </div>
                <div className="filter-legend-item">
                  <label className="toggle-switch-label">
                    <input 
                      type="checkbox" 
                      checked={legendFilter.kol100k}
                      onChange={() => setLegendFilter(prev => ({ ...prev, kol100k: !prev.kol100k }))}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  <span className="legend-color" style={{ background: '#f97316' }}></span>
                  <span className="legend-label"><strong>Orange</strong> KOLs with 100k+ followers</span>
                </div>
                <div className="filter-legend-item">
                  <label className="toggle-switch-label">
                    <input 
                      type="checkbox" 
                      checked={legendFilter.kolUnder100k}
                      onChange={() => setLegendFilter(prev => ({ ...prev, kolUnder100k: !prev.kolUnder100k }))}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  <span className="legend-color" style={{ background: '#a855f7' }}></span>
                  <span className="legend-label"><strong>Purple</strong> KOLs with less than 100k followers</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Time Filter Dropdown */}
          <div className="bubble-filter-dropdown">
            <button 
              className={`bubble-control-btn ${timeDropdownOpen ? 'active' : ''}`}
              onClick={() => {
                setTimeDropdownOpen(!timeDropdownOpen)
                setLegendDropdownOpen(false)
                setFollowersDropdownOpen(false)
              }}
            >
              <span>🕐</span> {timeFilterOptions.find(t => t.value === timeFilter)?.label || 'All time'}
              <svg viewBox="0 0 20 20" fill="currentColor" className={timeDropdownOpen ? 'rotated' : ''}>
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
          </button>
            {timeDropdownOpen && (
              <div className="filter-dropdown-menu time-menu">
                {timeFilterOptions.map(option => (
                  <div 
                    key={option.value}
                    className={`filter-time-item ${timeFilter === option.value ? 'active' : ''}`}
                    onClick={() => {
                      setTimeFilter(option.value)
                      setTimeDropdownOpen(false)
                    }}
                  >
                    {timeFilter === option.value && <span className="check-mark">✓</span>}
                    {option.label}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Followers Range Filter Dropdown */}
          <div className="bubble-filter-dropdown">
            <button 
              className={`bubble-control-btn ${followersDropdownOpen ? 'active' : ''}`}
              onClick={() => {
                setFollowersDropdownOpen(!followersDropdownOpen)
                setLegendDropdownOpen(false)
                setTimeDropdownOpen(false)
              }}
            >
              <span>≡</span> Followers range
              <svg viewBox="0 0 20 20" fill="currentColor" className={followersDropdownOpen ? 'rotated' : ''}>
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
          </button>
            {followersDropdownOpen && (
              <div className="filter-dropdown-menu followers-menu">
                <div className="filter-followers-title">Filtering by followers range</div>
                <div className="filter-followers-inputs">
                  <div className="follower-input-group">
                    <span className="input-icon">👤</span>
                    <input 
                      type="text" 
                      placeholder="Min"
                      value={followersRange.min}
                      onChange={(e) => setFollowersRange(prev => ({ ...prev, min: e.target.value.replace(/\D/g, '') }))}
                    />
                  </div>
                  <div className="follower-input-group">
                    <span className="input-icon">👤</span>
                    <input 
                      type="text" 
                      placeholder="Max"
                      value={followersRange.max}
                      onChange={(e) => setFollowersRange(prev => ({ ...prev, max: e.target.value.replace(/\D/g, '') }))}
                    />
                  </div>
                </div>
                <button 
                  className="filter-apply-btn"
                  onClick={() => setFollowersDropdownOpen(false)}
                >
                  ✓ Apply
            </button>
              </div>
            )}
          </div>
        </div>

        {/* Top Right - Theme Toggle + Close (in fullscreen) */}
        <div className="bubbles-controls-top-right">
          {isFullscreen && (
            <button 
              className="close-fullscreen-btn"
              onClick={() => setIsFullscreen(false)}
              title="Exit Fullscreen"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
          {/* View Mode Toggle */}
          <div className="view-mode-toggle">
            <button 
              className={`view-mode-btn ${viewMode === '2D' ? 'active' : ''}`}
              onClick={() => setViewMode('2D')}
            >
              2D
            </button>
            <button 
              className={`view-mode-btn ${viewMode === '3D' ? 'active' : ''}`}
              onClick={() => setViewMode('3D')}
            >
              3D
            </button>
          </div>
          
          <div className="theme-toggle" onClick={() => setIsDarkMode(!isDarkMode)}>
            <span className={isDarkMode ? 'active' : ''}>dark</span>
            <div className={`toggle-switch ${isDarkMode ? '' : 'light-mode'}`}>
              <span className="toggle-dot" />
            </div>
            <span className={!isDarkMode ? 'active' : ''}>light</span>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="bubbles-controls-bottom">
          <div className="bubbles-branding">
            <span>X Bubbles for <strong>Spectre</strong></span>
            <span className="divider">|</span>
            <span>powered by <strong>Spectre AI</strong></span>
          </div>
          <div className="zoom-controls">
            {viewMode === '2D' ? (
              <>
                <button 
                  className="zoom-btn" 
                  onClick={() => setZoomLevel(prev => Math.min(prev * 1.3, 5))}
                  title="Zoom In"
                >+</button>
                <span className="zoom-level">{Math.round(zoomLevel * 100)}%</span>
                <button 
                  className="zoom-btn" 
                  onClick={() => setZoomLevel(prev => Math.max(prev * 0.7, 0.5))}
                  title="Zoom Out"
                >−</button>
                <button 
                  className="fit-btn"
                  onClick={() => { 
                    setZoomLevel(1)
                  }}
                  title="Reset Zoom"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 01-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 011.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  All
                </button>
              </>
            ) : (
              <>
                <button 
                  className="zoom-btn" 
                  onClick={() => setCamera(prev => ({ ...prev, z: Math.max(-500, prev.z - 100) }))}
                  title="Fly Forward"
                >🚀</button>
                <span className="zoom-level" style={{ minWidth: '80px' }}>
                  {Math.round(flightSpeed * 10)}m/s
                </span>
                <button 
                  className="zoom-btn" 
                  onClick={() => setCamera(prev => ({ ...prev, z: Math.min(2000, prev.z + 100) }))}
                  title="Fly Back"
                >⬅️</button>
                <button 
                  className="fit-btn"
                  onClick={resetCamera}
                  title="Return to Base"
                >
                  🏠 Base
                </button>
              </>
            )}
            <button 
              className="fullscreen-btn"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default XBubblesPage
