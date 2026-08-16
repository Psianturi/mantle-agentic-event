import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface AgentSphereProps {
  className?: string
}

/**
 * 3D visualization of agent architecture.
 *
 * Central glowing sphere = the agent (sovereign identity).
 * Orbiting smaller spheres = the 4 sub-agents (secretary, scribe, social-lite, mint-master).
 * Particle ring = the events/wisdom the agent accumulates.
 *
 * Mouse parallax: user moves mouse, the whole structure tilts slightly.
 * Auto-rotation: continuous slow rotation for liveliness.
 */
export function AgentSphere({ className }: AgentSphereProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Respect reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Render a static fallback glow
      container.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle,rgba(0,243,255,0.15),transparent 60%);border-radius:50%"></div>'
      return
    }

    const width = container.clientWidth
    const height = container.clientHeight

    // ── Scene setup ────────────────────────────────────────────────────────
    const scene = new THREE.Scene()

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
    camera.position.set(0, 0, 8)

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    // ── Core sphere (the agent) ────────────────────────────────────────────
    const coreGeo = new THREE.IcosahedronGeometry(1.2, 1)
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.15,
      wireframe: true,
    })
    const core = new THREE.Mesh(coreGeo, coreMat)
    scene.add(core)

    // Inner solid glow
    const innerGeo = new THREE.SphereGeometry(0.8, 32, 32)
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.08,
    })
    const inner = new THREE.Mesh(innerGeo, innerMat)
    scene.add(inner)

    // ── Sub-agent orbit nodes (4) ──────────────────────────────────────────
    const subAgentColors = [0x00f3ff, 0x9d00ff, 0x00f3ff, 0x9d00ff]
    const subAgents: THREE.Mesh[] = []
    const orbitRadius = 2.6

    for (let i = 0; i < 4; i++) {
      const geo = new THREE.SphereGeometry(0.18, 16, 16)
      const mat = new THREE.MeshBasicMaterial({
        color: subAgentColors[i],
        transparent: true,
        opacity: 0.9,
      })
      const node = new THREE.Mesh(geo, mat)
      scene.add(node)
      subAgents.push(node)

      // Connection line from core to sub-agent
      const lineGeo = new THREE.BufferGeometry()
      const lineMat = new THREE.LineBasicMaterial({
        color: subAgentColors[i],
        transparent: true,
        opacity: 0.3,
      })
      const line = new THREE.Line(lineGeo, lineMat)
      scene.add(line)
      ;(node as any).userData.line = line
    }

    // ── Particle ring (events/wisdom) ──────────────────────────────────────
    const particleCount = 120
    const particleGeo = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const particleColors = new Float32Array(particleCount * 3)

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2
      const r = 3.8 + Math.random() * 0.6
      const y = (Math.random() - 0.5) * 0.8
      positions[i * 3] = Math.cos(angle) * r
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = Math.sin(angle) * r

      const isCyan = Math.random() > 0.4
      particleColors[i * 3] = isCyan ? 0 : 0.6
      particleColors[i * 3 + 1] = isCyan ? 0.95 : 0
      particleColors[i * 3 + 2] = isCyan ? 1 : 1
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3))

    const particleMat = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    })
    const particles = new THREE.Points(particleGeo, particleMat)
    scene.add(particles)

    // ── Mouse parallax ─────────────────────────────────────────────────────
    let mouseX = 0
    let mouseY = 0
    let targetRotX = 0
    let targetRotY = 0

    const onMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2
      targetRotX = mouseY * 0.3
      targetRotY = mouseX * 0.5
    }
    window.addEventListener('mousemove', onMouseMove)

    // ── Resize handler ─────────────────────────────────────────────────────
    const onResize = () => {
      if (!container) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    // ── Animation loop ─────────────────────────────────────────────────────
    let frameId: number
    const clock = new THREE.Clock()

    const animate = () => {
      const elapsed = clock.getElapsedTime()

      // Smooth parallax
      scene.rotation.x += (targetRotX - scene.rotation.x) * 0.04
      scene.rotation.y += (targetRotY - scene.rotation.y) * 0.04

      // Auto rotation
      scene.rotation.y += 0.0025

      // Core pulse
      const pulse = 1 + Math.sin(elapsed * 2) * 0.05
      core.scale.setScalar(pulse)
      inner.scale.setScalar(pulse)
      core.rotation.x = elapsed * 0.3
      core.rotation.y = elapsed * 0.2

      // Sub-agents orbit
      subAgents.forEach((node, i) => {
        const angle = elapsed * 0.4 + (i / 4) * Math.PI * 2
        node.position.x = Math.cos(angle) * orbitRadius
        node.position.z = Math.sin(angle) * orbitRadius
        node.position.y = Math.sin(elapsed * 1.5 + i) * 0.3

        // Update connection line
        const line = (node as any).userData.line as THREE.Line
        if (line) {
          const positions = line.geometry.attributes.position.array as Float32Array
          positions[0] = 0; positions[1] = 0; positions[2] = 0
          positions[3] = node.position.x
          positions[4] = node.position.y
          positions[5] = node.position.z
          line.geometry.attributes.position.needsUpdate = true
        }
      })

      // Particle ring rotation
      particles.rotation.y = elapsed * 0.15

      renderer.render(scene, camera)
      frameId = requestAnimationFrame(animate)
    }
    animate()

    // ── Cleanup ────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      coreGeo.dispose()
      coreMat.dispose()
      innerGeo.dispose()
      innerMat.dispose()
      particleGeo.dispose()
      particleMat.dispose()
      subAgents.forEach(n => { n.geometry.dispose(); (n.material as THREE.Material).dispose() })
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return <div ref={containerRef} className={className} style={{ width: '100%', height: '100%' }} />
}