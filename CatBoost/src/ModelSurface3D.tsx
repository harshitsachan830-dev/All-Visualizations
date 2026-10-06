import { useEffect, useRef, useState } from 'react'
import { Maximize2, RotateCcw } from 'lucide-react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import './ModelSurface3D.css'

type NumericFeature = { name: string; type: string }
type SurfaceResult = {
  feature_x: string
  feature_y: string
  x: number[]
  y: number[]
  predictions: number[]
  samples: Record<string, number | null>[]
  iteration: number
}

type SurfaceScene = {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  controls: OrbitControls
  surface: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> | null
  points: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> | null
  frame: number
  animation: { started: number; from: Float32Array; to: Float32Array; geometry: THREE.BufferGeometry } | null
}

const PURPLE_LOW = new THREE.Color('#d08453')
const PURPLE_HIGH = new THREE.Color('#9b7af7')

function getWebglError() {
  if (typeof document === 'undefined') return '3D rendering requires a browser with WebGL support.'
  try {
    const canvas = document.createElement('canvas')
    return canvas.getContext('webgl2') || canvas.getContext('webgl')
      ? ''
      : 'WebGL is not available in this browser. Enable hardware acceleration to use the 3D view.'
  } catch {
    return 'WebGL is not available in this browser. Enable hardware acceleration to use the 3D view.'
  }
}

export function ModelSurface3D({
  features,
  target,
  task,
  iteration,
  setIteration,
  trainedIterations,
}: {
  features: NumericFeature[]
  target: string
  task: string
  iteration: number
  setIteration: (value: number) => void
  trainedIterations: number
}) {
  const numeric = features.filter((feature) => feature.type === 'Numerical' && feature.name !== target)
  const firstFeature = numeric[0]?.name ?? ''
  const secondFeature = numeric.find((feature) => feature.name !== firstFeature)?.name ?? ''
  const [featureX, setFeatureX] = useState(firstFeature)
  const [featureY, setFeatureY] = useState(secondFeature)
  const [result, setResult] = useState<SurfaceResult | null>(null)
  const [error, setError] = useState('')
  const [sceneError] = useState(getWebglError)
  const hostRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<SurfaceScene | null>(null)
  const activeX = numeric.some((feature) => feature.name === featureX) ? featureX : firstFeature
  const activeY = numeric.some((feature) => feature.name === featureY && feature.name !== activeX)
    ? featureY
    : numeric.find((feature) => feature.name !== activeX)?.name ?? ''
  const maxTrees = Math.max(1, trainedIterations)
  const selectedTrees = Math.min(iteration, maxTrees)
  const readyResult = trainedIterations > 0 && activeX && activeY && result?.feature_x === activeX
    && result.feature_y === activeY
    && result.iteration === selectedTrees
    ? result
    : null

  useEffect(() => {
    if (!activeX || !activeY || trainedIterations < 1) return
    const controller = new AbortController()
    fetch(`/api/boundary?feature_x=${encodeURIComponent(activeX)}&feature_y=${encodeURIComponent(activeY)}&iteration=${selectedTrees}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.detail || 'Could not calculate the model surface.')
        return payload as SurfaceResult
      })
      .then((payload) => { setResult(payload); setError('') })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setResult(null)
          setError(reason instanceof Error ? reason.message : 'Could not calculate the model surface.')
        }
      })
    return () => controller.abort()
  }, [activeX, activeY, selectedTrees, trainedIterations])

  useEffect(() => {
    const host = hostRef.current
    if (!host || sceneError) return
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
    } catch {
      return
    }

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#0f1218')
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
    camera.position.set(9, 8, 11)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    host.appendChild(renderer.domElement)
    renderer.domElement.setAttribute('aria-label', 'Interactive three-dimensional CatBoost prediction surface')
    renderer.domElement.setAttribute('role', 'img')

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.075
    controls.enablePan = true
    controls.minDistance = 7
    controls.maxDistance = 23
    controls.maxPolarAngle = Math.PI * 0.48
    controls.target.set(0, 0.6, 0)

    const ambient = new THREE.HemisphereLight('#e9e4ff', '#20232d', 2.2)
    const keyLight = new THREE.DirectionalLight('#ffffff', 2.1)
    keyLight.position.set(-5, 10, 7)
    const fillLight = new THREE.DirectionalLight('#9875ec', 1.2)
    fillLight.position.set(7, 4, -6)
    scene.add(ambient, keyLight, fillLight)

    const grid = new THREE.GridHelper(10, 20, '#45404f', '#282b35')
    grid.position.y = -0.82
    scene.add(grid)

    const axes = new THREE.AxesHelper(0.65)
    axes.position.set(-5, -0.8, 5)
    scene.add(axes)

    const resize = () => {
      const width = Math.max(1, host.clientWidth)
      const height = Math.max(1, host.clientHeight)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()

    const state: SurfaceScene = { scene, camera, renderer, controls, surface: null, points: null, frame: 0, animation: null }
    sceneRef.current = state
    const tick = (time: number) => {
      state.frame = requestAnimationFrame(tick)
      controls.update()
      if (state.animation) {
        const { started, from, to, geometry } = state.animation
        const progress = Math.min(1, (time - started) / 260)
        const eased = 1 - Math.pow(1 - progress, 3)
        const current = geometry.getAttribute('position') as THREE.BufferAttribute
        for (let index = 0; index < to.length; index += 1) {
          current.array[index] = from[index] + (to[index] - from[index]) * eased
        }
        current.needsUpdate = true
        geometry.computeVertexNormals()
        if (progress >= 1) state.animation = null
      }
      renderer.render(scene, camera)
    }
    state.frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(state.frame)
      observer.disconnect()
      controls.dispose()
      if (state.surface) {
        state.surface.geometry.dispose()
        state.surface.material.dispose()
      }
      if (state.points) {
        state.points.geometry.dispose()
        state.points.material.dispose()
      }
      renderer.dispose()
      renderer.domElement.remove()
      sceneRef.current = null
    }
  }, [sceneError])

  useEffect(() => {
    const state = sceneRef.current
    if (!state || !readyResult || readyResult.x.length < 2 || readyResult.y.length < 2) return
    const columns = readyResult.x.length
    const rows = readyResult.y.length
    const count = columns * rows
    const low = Math.min(...readyResult.predictions)
    const high = Math.max(...readyResult.predictions)
    const span = high - low || 1
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const color = new THREE.Color()
    const predictionHeight = (prediction: number) => ((prediction - low) / span) * 2.35 - 0.35

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const index = row * columns + column
        const prediction = readyResult.predictions[index]
        const ratio = Math.max(0, Math.min(1, (prediction - low) / span))
        positions[index * 3] = -5 + (column / (columns - 1)) * 10
        positions[index * 3 + 1] = predictionHeight(prediction)
        positions[index * 3 + 2] = 5 - (row / (rows - 1)) * 10
        color.copy(PURPLE_LOW).lerp(PURPLE_HIGH, ratio)
        colors[index * 3] = color.r
        colors[index * 3 + 1] = color.g
        colors[index * 3 + 2] = color.b
      }
    }

    const indices: number[] = []
    for (let row = 0; row < rows - 1; row += 1) {
      for (let column = 0; column < columns - 1; column += 1) {
        const topLeft = row * columns + column
        const topRight = topLeft + 1
        const bottomLeft = topLeft + columns
        const bottomRight = bottomLeft + 1
        indices.push(topLeft, bottomLeft, topRight, topRight, bottomLeft, bottomRight)
      }
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.54,
      metalness: 0.03,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.94,
    })
    const nextSurface = new THREE.Mesh(geometry, material)
    nextSurface.position.y = 0.02

    const samplePositions: number[] = []
    readyResult.samples.forEach((sample) => {
      const xValue = sample[activeX]
      const yValue = sample[activeY]
      if (xValue === null || yValue === null || xValue === undefined || yValue === undefined) return
      const xRatio = (xValue - readyResult.x[0]) / (readyResult.x[columns - 1] - readyResult.x[0] || 1)
      const yRatio = (yValue - readyResult.y[0]) / (readyResult.y[rows - 1] - readyResult.y[0] || 1)
      if (xRatio < -0.08 || xRatio > 1.08 || yRatio < -0.08 || yRatio > 1.08) return
      const column = Math.max(0, Math.min(columns - 1, Math.round(xRatio * (columns - 1))))
      const row = Math.max(0, Math.min(rows - 1, Math.round(yRatio * (rows - 1))))
      const nearestPrediction = readyResult.predictions[row * columns + column]
      samplePositions.push(
        -5 + Math.max(0, Math.min(1, xRatio)) * 10,
        predictionHeight(nearestPrediction) + 0.08,
        5 - Math.max(0, Math.min(1, yRatio)) * 10,
      )
    })

    const pointGeometry = new THREE.BufferGeometry()
    pointGeometry.setAttribute('position', new THREE.Float32BufferAttribute(samplePositions, 3))
    const pointMaterial = new THREE.PointsMaterial({ color: '#f5f0ff', size: 0.085, sizeAttenuation: true, transparent: true, opacity: 0.92 })
    const nextPoints = new THREE.Points(pointGeometry, pointMaterial)

    if (state.surface) {
      const oldPositions = (state.surface.geometry.getAttribute('position') as THREE.BufferAttribute).array
      const from = oldPositions.length === positions.length ? Float32Array.from(oldPositions) : Float32Array.from(positions, (_, index) => index % 3 === 1 ? -0.7 : positions[index])
      state.animation = { started: performance.now(), from, to: positions, geometry }
      nextSurface.geometry.getAttribute('position').array.set(from)
      nextSurface.geometry.computeVertexNormals()
      state.scene.remove(state.surface)
      state.surface.geometry.dispose()
      state.surface.material.dispose()
    } else {
      state.animation = { started: performance.now(), from: Float32Array.from(positions, (_, index) => index % 3 === 1 ? -0.7 : positions[index]), to: positions, geometry }
      nextSurface.geometry.getAttribute('position').array.set(state.animation.from)
    }
    if (state.points) {
      state.scene.remove(state.points)
      state.points.geometry.dispose()
      state.points.material.dispose()
    }
    state.surface = nextSurface
    state.points = nextPoints
    state.scene.add(nextSurface, nextPoints)
  }, [readyResult, activeX, activeY])

  function resetView() {
    const state = sceneRef.current
    if (!state) return
    state.camera.position.set(9, 8, 11)
    state.controls.target.set(0, 0.6, 0)
    state.controls.update()
  }

  return <section className="model-surface-page">
    <div className="surface-toolbar">
      <label>Feature X<select value={activeX} onChange={(event) => setFeatureX(event.target.value)}>{numeric.map((feature) => <option key={feature.name}>{feature.name}</option>)}</select></label>
      <label>Feature Y<select value={activeY} onChange={(event) => setFeatureY(event.target.value)}>{numeric.filter((feature) => feature.name !== activeX).map((feature) => <option key={feature.name}>{feature.name}</option>)}</select></label>
      <div className="surface-iterations" aria-label="Tree checkpoints">{trainedIterations ? [10, 50, 100, maxTrees].filter((value, index, values) => value <= maxTrees && values.indexOf(value) === index).map((value) => <button key={value} className={selectedTrees === value ? 'active' : ''} onClick={() => setIteration(value)}>{value}</button>) : <span className="surface-no-model">Train first</span>}</div>
      <button className="surface-reset" onClick={resetView} disabled={Boolean(sceneError)} title="Reset camera view"><RotateCcw size={15} /><span>Reset view</span></button>
    </div>
    <div className="surface-stage">
      {sceneError ? <div className="surface-empty"><strong>3D rendering unavailable</strong><span>{sceneError}</span></div> : <>
        <div className="surface-canvas" ref={hostRef} />
        {!trainedIterations && <div className="surface-overlay"><strong>Train a model to view its response surface</strong><span>The 3D surface needs a fitted model and two numeric features.</span></div>}
        {trainedIterations > 0 && error && !readyResult && <div className="surface-overlay"><strong>Surface unavailable</strong><span>{error}</span></div>}
        {trainedIterations > 0 && (!activeX || !activeY) && <div className="surface-overlay"><strong>Two numeric features required</strong><span>Choose a dataset with at least two numeric features to build a 3D model view.</span></div>}
        {trainedIterations > 0 && activeX && activeY && !error && !readyResult && <div className="surface-overlay"><strong>Updating surface</strong><span>Calculating model confidence at {selectedTrees} trees…</span></div>}
        <div className="surface-z-label">{task === 'regression' ? 'PREDICTED VALUE' : 'PREDICTED PROBABILITY'}</div>
        <div className="surface-axis-labels"><span>{activeX || 'Feature X'}</span><span>{activeY || 'Feature Y'}</span></div>
        <div className="surface-legend"><span>Lower response</span><i /><span>Higher response</span><b>{readyResult?.samples.length ?? 0} samples</b></div>
        <div className="surface-hint"><Maximize2 size={13} /> Drag to orbit <i /> Scroll to zoom <i /> Right-drag to pan</div>
      </>}
    </div>
    <div className="surface-iteration-control"><span>Tree count <b>{trainedIterations ? selectedTrees : '—'}</b>{trainedIterations ? ` / ${maxTrees}` : ' · no fitted model'}</span><input aria-label="Tree count" type="range" min="1" max={maxTrees} value={selectedTrees} disabled={!trainedIterations} onChange={(event) => setIteration(Number(event.target.value))} /></div>
  </section>
}
