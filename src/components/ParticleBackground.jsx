/**
 * Subtle floating particles for ambient atmosphere
 * Creates a Silicon Valley premium feel
 */
import React, { useEffect, useRef } from 'react'
import './ParticleBackground.css'

const ParticleBackground = () => {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let animationFrameId

    // Set canvas size
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Particle settings - lightweight ambient effect for performance
    const particles = []
    const particleCount = 20
    const colors = [
      'rgba(139, 92, 246, 0.35)',  // Purple
      'rgba(99, 102, 241, 0.3)',   // Indigo
      'rgba(6, 182, 212, 0.25)',   // Cyan
      'rgba(167, 139, 250, 0.32)', // Light purple
    ]

    // Create particles - subtle background atmosphere
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1.5 + 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedX: (Math.random() - 0.5) * 0.25,
        speedY: (Math.random() - 0.5) * 0.2,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.01 + Math.random() * 0.015
      })
    }

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach(p => {
        // Update position
        p.x += p.speedX
        p.y += p.speedY
        p.pulse += p.pulseSpeed

        // Wrap around edges
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0

        // Subtle pulsing effect
        const scale = 1 + Math.sin(p.pulse) * 0.25
        const radius = p.radius * scale

        // Draw simple particle (no gradient for performance)
        ctx.beginPath()
        ctx.fillStyle = p.color
        ctx.arc(p.x, p.y, radius * 2, 0, Math.PI * 2)
        ctx.fill()
      })

      animationFrameId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return <canvas ref={canvasRef} className="particle-background" />
}

export default ParticleBackground
