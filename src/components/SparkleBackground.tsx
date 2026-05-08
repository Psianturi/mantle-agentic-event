import { useEffect, useRef } from 'react'

interface Sparkle {
  x: number
  y: number
  size: number
  delay: number
  duration: number
  color: string
}

export function SparkleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const sparkles: Sparkle[] = []
    const sparkleCount = 50
    const colors = [
      'rgba(0, 243, 255, ',
      'rgba(157, 0, 255, ',
      'rgba(255, 215, 0, ',
    ]

    for (let i = 0; i < sparkleCount; i++) {
      sparkles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 1,
        delay: Math.random() * 2000,
        duration: Math.random() * 2000 + 2000,
        color: colors[Math.floor(Math.random() * colors.length)]
      })
    }

    let animationFrameId: number
    let startTime: number | null = null

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      sparkles.forEach(sparkle => {
        const elapsed = timestamp - startTime! - sparkle.delay
        if (elapsed < 0) return

        const progress = (elapsed % sparkle.duration) / sparkle.duration
        let opacity = 0

        if (progress < 0.5) {
          opacity = progress * 2
        } else {
          opacity = (1 - progress) * 2
        }

        const gradient = ctx.createRadialGradient(
          sparkle.x, sparkle.y, 0,
          sparkle.x, sparkle.y, sparkle.size * 4
        )
        gradient.addColorStop(0, sparkle.color + opacity + ')')
        gradient.addColorStop(0.5, sparkle.color + (opacity * 0.5) + ')')
        gradient.addColorStop(1, sparkle.color + '0)')

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(sparkle.x, sparkle.y, sparkle.size * 4, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = sparkle.color + opacity + ')'
        ctx.beginPath()
        ctx.arc(sparkle.x, sparkle.y, sparkle.size, 0, Math.PI * 2)
        ctx.fill()
      })

      animationFrameId = requestAnimationFrame(animate)
    }

    animationFrameId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ mixBlendMode: 'screen' }}
    />
  )
}
