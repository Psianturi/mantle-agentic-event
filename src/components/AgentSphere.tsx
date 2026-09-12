import { useEffect, useRef } from 'react'

interface AgentSphereProps {
  className?: string
}

/**
 * 3D visualization of agent architecture.
 *
 * Renders an animated SVG fallback when WebGL is unavailable so the page
 * degrades gracefully (rather than crashing into ErrorBoundary) on devices
 * without WebGL, in headless crawlers, or in environments where the context
 * is blocked. Also respects prefers-reduced-motion.
 */

const FALLBACK_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
  <defs>
    <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#00F3FF" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#00F3FF" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="ringGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#9D00FF" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#9D00FF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="200" cy="200" r="170" fill="url(#ringGlow)"/>
  <circle cx="200" cy="200" r="110" fill="url(#coreGlow)"/>
  <polygon points="200,118 252,154 252,226 200,262 148,226 148,154"
           fill="none" stroke="#00F3FF" stroke-width="1.5" stroke-opacity="0.7"/>
  <polygon points="200,140 234,165 234,215 200,240 166,215 166,165"
           fill="none" stroke="#00F3FF" stroke-width="1" stroke-opacity="0.35"/>
  <circle cx="200" cy="200" r="32" fill="#00F3FF" fill-opacity="0.1"/>
  <circle cx="200" cy="200" r="8" fill="#00F3FF"/>
  <circle cx="338" cy="200" r="9" fill="#9D00FF"/>
  <circle cx="62"  cy="200" r="9" fill="#9D00FF"/>
  <circle cx="200" cy="338" r="9" fill="#00F3FF"/>
  <circle cx="200" cy="62"  r="9" fill="#9D00FF"/>
  <line x1="200" y1="200" x2="338" y2="200" stroke="#00F3FF" stroke-opacity="0.35"/>
  <line x1="200" y1="200" x2="62"  y2="200" stroke="#9D00FF" stroke-opacity="0.35"/>
  <line x1="200" y1="200" x2="200" y2="338" stroke="#00F3FF" stroke-opacity="0.35"/>
  <line x1="200" y1="200" x2="200" y2="62"  stroke="#9D00FF" stroke-opacity="0.35"/>
</svg>`.trim()

const REDUCED_MOTION_HTML = `
<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;
            background:radial-gradient(circle,rgba(0,243,255,0.15),transparent 60%);
            border-radius:50%"></div>`.trim()

function mountFallback(container: HTMLElement, html: string) {
  container.innerHTML = html
}

export function AgentSphere({ className }: AgentSphereProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // 1. Reduced-motion → static CSS gradient (no animation, no WebGL).
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      mountFallback(container, REDUCED_MOTION_HTML)
      return
    }

    let mounted = true
    let cleanupFn: (() => void) | null = null

    ;(async () => {
      // 2. Load three.js lazily — skip if it isn't installed or fails to import.
      let THREE: typeof import('three') | null = null
      try {
        const mod = await import('three')
        THREE = mod
      } catch (impErr) {
        console.warn('AgentSphere: three.js import failed, using SVG fallback.', impErr)
        if (mounted) mountFallback(container, FALLBACK_SVG)
        return
      }
      if (!THREE || !mounted) {
        if (mounted) mountFallback(container, FALLBACK_SVG)
        return
      }

      // 3. Build scene inside try so WebGL failures degrade to SVG.
      let renderer: import('three').WebGLRenderer | null = null

      try {
        const width = container.clientWidth
        const height = container.clientHeight

        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100)
        camera.position.set(0, 0, 11)

        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
        renderer.setSize(width, height)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        container.appendChild(renderer.domElement)

        const coreGeo = new THREE.IcosahedronGeometry(1.6, 1)
        const coreMat = new THREE.MeshBasicMaterial({
          color: 0x00f3ff, transparent: true, opacity: 0.15, wireframe: true,
        })
        const core = new THREE.Mesh(coreGeo, coreMat)
        scene.add(core)

        const innerGeo = new THREE.SphereGeometry(1.1, 32, 32)
        const innerMat = new THREE.MeshBasicMaterial({
          color: 0x00f3ff, transparent: true, opacity: 0.08,
        })
        const inner = new THREE.Mesh(innerGeo, innerMat)
        scene.add(inner)

        const subAgentColors = [0x00f3ff, 0x9d00ff, 0x00f3ff, 0x9d00ff]
        const subAgents: import('three').Mesh[] = []
        const lines: import('three').Line[] = []
        const orbitRadius = 3.2
        for (let i = 0; i < 4; i++) {
          const nodeGeo = new THREE.SphereGeometry(0.22, 16, 16)
          const nodeMat = new THREE.MeshBasicMaterial({
            color: subAgentColors[i], transparent: true, opacity: 0.9,
          })
          const node = new THREE.Mesh(nodeGeo, nodeMat)
          scene.add(node)
          subAgents.push(node)

          const linePositions = new Float32Array(6)
          const lineGeo = new THREE.BufferGeometry()
          lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))
          const lineMat = new THREE.LineBasicMaterial({
            color: subAgentColors[i], transparent: true, opacity: 0.35,
          })
          const line = new THREE.Line(lineGeo, lineMat)
          scene.add(line)
          lines.push(line)
          ;(node as any).userData.line = line
        }

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
          size: 0.07, vertexColors: true, transparent: true, opacity: 0.65,
          blending: THREE.AdditiveBlending,
        })
        const particles = new THREE.Points(particleGeo, particleMat)
        scene.add(particles)

        const chainNodeCount = 8
        const chainNodes: import('three').Mesh[] = []
        const chainOrbitRadius = 5.4
        for (let i = 0; i < chainNodeCount; i++) {
          const cGeo = new THREE.OctahedronGeometry(0.14, 0)
          const isMantle = i % 2 === 0
          const color = isMantle ? 0x00f3ff : 0x9d00ff
          const cMat = new THREE.MeshBasicMaterial({
            color, transparent: true, opacity: 0.5, wireframe: true,
          })
          const node = new THREE.Mesh(cGeo, cMat)
          scene.add(node)
          chainNodes.push(node)
        }

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

        const onResize = () => {
          if (!renderer || !container) return
          const w = container.clientWidth
          const h = container.clientHeight
          camera.aspect = w / h
          camera.updateProjectionMatrix()
          renderer.setSize(w, h)
        }
        window.addEventListener('resize', onResize)

        let frameId = 0
        const clock = new THREE.Clock()

        const animate = () => {
          const elapsed = clock.getElapsedTime()
          scene.rotation.x += (targetRotX - scene.rotation.x) * 0.04
          scene.rotation.y += (targetRotY - scene.rotation.y) * 0.04
          scene.rotation.y += 0.002

          const pulse = 1 + Math.sin(elapsed * 1.5) * 0.06
          core.scale.setScalar(pulse)
          inner.scale.setScalar(pulse)
          core.rotation.x = elapsed * 0.25
          core.rotation.y = elapsed * 0.18

          subAgents.forEach((node, i) => {
            const angle = elapsed * 0.35 + (i / 4) * Math.PI * 2
            node.position.x = Math.cos(angle) * orbitRadius
            node.position.z = Math.sin(angle) * orbitRadius
            node.position.y = Math.sin(elapsed * 1.2 + i) * 0.4

            const line = (node as any).userData.line
            if (line) {
              const arr = line.geometry.attributes.position.array as Float32Array
              arr[0] = 0; arr[1] = 0; arr[2] = 0
              arr[3] = node.position.x
              arr[4] = node.position.y
              arr[5] = node.position.z
              line.geometry.attributes.position.needsUpdate = true
            }
          })

          particles.rotation.y = -elapsed * 0.1
          particles.rotation.x = Math.sin(elapsed * 0.3) * 0.1

          chainNodes.forEach((node, i) => {
            const angle = -elapsed * 0.08 + (i / chainNodeCount) * Math.PI * 2
            node.position.x = Math.cos(angle) * chainOrbitRadius
            node.position.z = Math.sin(angle) * chainOrbitRadius
            node.position.y = Math.cos(angle * 2) * 0.6
            node.rotation.y = elapsed * 0.5
          })

          if (renderer) renderer.render(scene, camera)
          frameId = requestAnimationFrame(animate)
        }
        animate()

        cleanupFn = () => {
          cancelAnimationFrame(frameId)
          window.removeEventListener('mousemove', onMouseMove)
          window.removeEventListener('resize', onResize)
          if (renderer) {
            renderer.dispose()
            if (container.contains(renderer.domElement)) {
              container.removeChild(renderer.domElement)
            }
          }
          coreGeo.dispose(); coreMat.dispose()
          innerGeo.dispose(); innerMat.dispose()
          particleGeo.dispose(); particleMat.dispose()
          subAgents.forEach(n => { n.geometry.dispose(); (n.material as import('three').Material).dispose() })
          lines.forEach(l => { l.geometry.dispose(); (l.material as import('three').Material).dispose() })
          chainNodes.forEach(n => { n.geometry.dispose(); (n.material as import('three').Material).dispose() })
        }
      } catch (err) {
        console.warn('AgentSphere: 3D scene failed, using SVG fallback.', err)
        if (renderer) {
          try { renderer.dispose() } catch { /* ignore */ }
          if (container.contains(renderer.domElement)) {
            container.removeChild(renderer.domElement)
          }
        }
        if (mounted) mountFallback(container, FALLBACK_SVG)
      }
    })()

    return () => {
      mounted = false
      if (cleanupFn) cleanupFn()
    }
  }, [])

  return <div ref={containerRef} className={className} style={{ width: '100%', height: '100%' }} />
}