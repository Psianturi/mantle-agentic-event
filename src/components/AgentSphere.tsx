import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface AgentSphereProps {
  className?: string
}

/**
 * 3D visualization of agent architecture.
 *
 * Core icosahedron = agent identity (sovereign, encrypted keys, wallet)
 * 4 orbiting spheres = sub-agents (secretary, scribe, social-lite, mint-master)
 * Inner particle ring = events/wisdom the agent has accumulated
 * Outer ring of nodes = the blockchain network (Mantle, ETH Sepolia, ...)
 * Connection lines = data/tx flow from agent to chain
 *
 * Mouse parallax + auto-rotation for liveliness.
 * Respects prefers-reduced-motion (static fallback).
 */
export function AgentSphere({ className }: AgentSphereProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Respect reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      container.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle,rgba(0,243,255,0.15),transparent 60%);border-radius:50%"></div>'
      return
    }

    const width = container.clientWidth
    const height = container.clientHeight

    // ── Scene setup ────────────────────────────────────────────────────────
    const scene = new THREE.Scene()

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100)
    camera.position.set(0, 0, 11)

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    // ── Core sphere (the agent) — larger now ───────────────────────────────
    const coreGeo = new THREE.IcosahedronGeometry(1.6, 1)
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.15,
      wireframe: true,
    })
    const core = new THREE.Mesh(coreGeo, coreMat)
    scene.add(core)

    // Inner solid glow
    const innerGeo = new THREE.SphereGeometry(1.1, 32, 32)
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
    const lines: THREE.Line[] = []  // track for cleanup
    const orbitRadius = 3.2

    for (let i = 0; i < 4; i++) {
      const geo = new THREE.SphereGeometry(0.22, 16, 16)
      const mat = new THREE.MeshBasicMaterial({
        color: subAgentColors[i],
        transparent: true,
        opacity: 0.9,
      })
      const node = new THREE.Mesh(geo, mat)
      scene.add(node)
      subAgents.push(node)

      // Connection line core → sub-agent (pre-allocated position attribute)
      const linePositions = new Float32Array(6)
      const lineGeo = new THREE.BufferGeometry()
      lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))
      const lineMat = new THREE.LineBasicMaterial({
        color: subAgentColors[i],
        transparent: true,
        opacity: 0.35,
      })
      const line = new THREE.Line(lineGeo, lineMat)
      scene.add(line)
      lines.push(line)
      ;(node as any).userData.line = line
    }

    // ── Particle ring (events/wisdom) — wider ──────────────────────────────
    const particleCount = 160
    const particleGeo = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const particleColors = new Float32Array(particleCount * 3)

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2
      const r = 4.6 + Math.random() * 0.8
      const y = (Math.random() - 0.5) * 1.0
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
      size: 0.07,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    })
    const particles = new THREE.Points(particleGeo, particleMat)
    scene.add(particles)

    // ── Blockchain network ring (outer layer) ──────────────────────────────
    // Represents the chains the agent lives on — Mantle, ETH Sepolia, ...
    const chainNodeCount = 8
    const chainNodes: THREE.Mesh[] = []
    const chainLines: THREE.Line[] = []  // track for cleanup
    const chainOrbitRadius = 5.4

    for (let i = 0; i < chainNodeCount; i++) {
      const geo = new THREE.OctahedronGeometry(0.14, 0)
      const isMantle = i % 2 === 0
      const color = isMantle ? 0x00f3ff : 0x9d00ff
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.5,
        wireframe: true,
      })
      const node = new THREE.Mesh(geo, mat)
      scene.add(node)
      chainNodes.push(node)
    }

    // ── Mouse parallax ─────────────────────────────────────────────────────
    let mouseX = 0
    let mouseY = 0
    let targetRotX = 0
    let targetRotY = 0

    const onMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2
      targetRotX = mouseY * 0.25
      targetRotY = mouseX * 0.4
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
      scene.rotation.y += 0.002

      // Core pulse
      const pulse = 1 + Math.sin(elapsed * 1.5) * 0.06
      core.scale.setScalar(pulse)
      inner.scale.setScalar(pulse)
      core.rotation.x = elapsed * 0.25
      core.rotation.y = elapsed * 0.18

      // Sub-agents orbit (tilted plane)
      subAgents.forEach((node, i) => {
        const angle = elapsed * 0.35 + (i / 4) * Math.PI * 2
        node.position.x = Math.cos(angle) * orbitRadius
        node.position.z = Math.sin(angle) * orbitRadius
        node.position.y = Math.sin(elapsed * 1.2 + i) * 0.4

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

      // Particle ring rotation (slow, opposite direction)
      particles.rotation.y = -elapsed * 0.1
      particles.rotation.x = Math.sin(elapsed * 0.3) * 0.1

      // Chain nodes orbit (outer ring, opposite tilt)
      chainNodes.forEach((node, i) => {
        const angle = -elapsed * 0.08 + (i / chainNodeCount) * Math.PI * 2
        node.position.x = Math.cos(angle) * chainOrbitRadius
        node.position.z = Math.sin(angle) * chainOrbitRadius
        node.position.y = Math.cos(angle * 2) * 0.6
        node.rotation.y = elapsed * 0.5
      })

      renderer.render(scene, camera)
      frameId = requestAnimationFrame(animate)
    }
    animate()

    // ── Cleanup ──────────────────────────────────────────────────────────────
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
      // Dispose connection lines (fix: previously leaked)
      lines.forEach(l => { l.geometry.dispose(); (l.material as THREE.Material).dispose() })
      chainNodes.forEach(n => { n.geometry.dispose(); (n.material as THREE.Material).dispose() })
      chainLines.forEach(l => { l.geometry.dispose(); (l.material as THREE.Material).dispose() })
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return <div ref={containerRef} className={className} style={{ width: '100%', height: '100%' }} />
}