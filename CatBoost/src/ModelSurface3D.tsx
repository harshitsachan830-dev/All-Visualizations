import { useEffect, useRef, useState } from 'react'
import { Maximize2, RotateCcw } from 'lucide-react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { apiUrl } from './api'
import { addLabeledAxis, disposeAnnotationGroup } from './threeAnnotations'
import './ModelSurface3D.css'

type NumericFeature = { name: string; type: string }
type RegressionView = 'overview' | 'polynomial' | 'scatter' | 'catboost'
type SurfaceResult = {
  feature_x: string
  feature_y: string
  x: number[]
  y: number[]
  predictions: number[]
  samples: Array<Record<string, number | string | null> & { target: number | string | null; prediction: number | string | null; row: number }>
  iteration: number
}

type SurfaceScene = {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  controls: OrbitControls
  surface: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> | null
  wireframe: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> | null
  points: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> | null
  connectors: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial> | null
  annotations: THREE.Group | null
  frame: number
  animation: { started: number; from: Float32Array; to: Float32Array; geometry: THREE.BufferGeometry } | null
}

const RESPONSE_PALETTES: Record<RegressionView, [THREE.Color, THREE.Color, THREE.Color]> = {
  overview: [new THREE.Color('#2864d7'), new THREE.Color('#e7edf7'), new THREE.Color('#e15d5b')],
  polynomial: [new THREE.Color('#424bc7'), new THREE.Color('#31b8c5'), new THREE.Color('#f2cb57')],
  scatter: [new THREE.Color('#3269d5'), new THREE.Color('#a9dce8'), new THREE.Color('#f18a46')],
  catboost: [new THREE.Color('#2864d7'), new THREE.Color('#e7edf7'), new THREE.Color('#1bb8a5')],
}

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

function plottedSampleCount(result: SurfaceResult | null) {
  return `${result?.samples.filter((sample) => typeof sample.target === 'number' && typeof sample.prediction === 'number').length ?? 0} observed rows`
}

export function ModelSurface3D({
  features,
  target,
  task,
  iteration,
  setIteration,
  trainedIterations,
  darkMode,
}: {
  features: NumericFeature[]
  target: string
  task: string
  iteration: number
  setIteration: (value: number) => void
  trainedIterations: number
  darkMode: boolean
}) {
  const numeric = features.filter((feature) => feature.type === 'Numerical' && feature.name !== target)
  const firstFeature = numeric[0]?.name ?? ''
  const secondFeature = numeric.find((feature) => feature.name !== firstFeature)?.name ?? ''
  const [featureX, setFeatureX] = useState(firstFeature)
  const [featureY, setFeatureY] = useState(secondFeature)
  const [viewMode, setViewMode] = useState<RegressionView>('overview')
  const [result, setResult] = useState<SurfaceResult | null>(null)
  const [hovered, setHovered] = useState<{ x: number; y: number; response: number; label: string; detail?: string; screenX: number; screenY: number } | null>(null)
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
  const activeViewMode = task === 'regression' ? viewMode : 'overview'
  const readyResult = trainedIterations > 0 && activeX && activeY && result?.feature_x === activeX
    && result.feature_y === activeY
    && result.iteration === selectedTrees
    ? result
    : null

  useEffect(() => {
    if (!activeX || !activeY || trainedIterations < 1) return
    const controller = new AbortController()
    fetch(apiUrl(`/api/boundary?feature_x=${encodeURIComponent(activeX)}&feature_y=${encodeURIComponent(activeY)}&iteration=${selectedTrees}`), { signal: controller.signal })
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
    scene.background = new THREE.Color(darkMode ? '#0d121b' : '#f4f7fc')
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
    camera.position.set(9, 8, 11)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
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

    const ambient = new THREE.HemisphereLight('#f6f9ff', darkMode ? '#263246' : '#9ca9bb', darkMode ? 1.6 : 2)
    const keyLight = new THREE.DirectionalLight('#ffffff', 2.1)
    keyLight.position.set(-5, 10, 7)
    const fillLight = new THREE.DirectionalLight('#8dbbff', 1.35)
    fillLight.position.set(7, 4, -6)
    scene.add(ambient, keyLight, fillLight)

    const grid = new THREE.GridHelper(10, 20, darkMode ? '#45536b' : '#9eabc0', darkMode ? '#273246' : '#d7dfeb')
    grid.position.y = -0.82
    scene.add(grid)

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

    const state: SurfaceScene = { scene, camera, renderer, controls, surface: null, wireframe: null, points: null, connectors: null, annotations: null, frame: 0, animation: null }
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
        geometry.computeBoundingSphere()
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
      if (state.wireframe) state.wireframe.material.dispose()
      if (state.points) {
        state.points.geometry.dispose()
        state.points.material.dispose()
      }
      if (state.connectors) {
        state.connectors.geometry.dispose()
        state.connectors.material.dispose()
      }
      if (state.annotations) disposeAnnotationGroup(state.annotations)
      renderer.dispose()
      renderer.domElement.remove()
      sceneRef.current = null
    }
  }, [darkMode, sceneError])

  useEffect(() => {
    const state = sceneRef.current
    if (!state || !readyResult || readyResult.x.length < 2 || readyResult.y.length < 2) return
    const columns = readyResult.x.length
    const rows = readyResult.y.length
    const count = columns * rows
    const predictionLow = Math.min(...readyResult.predictions)
    const predictionHigh = Math.max(...readyResult.predictions)
    const plottedSamples = task === 'regression' ? readyResult.samples.filter((sample) =>
      typeof sample[activeX] === 'number'
      && typeof sample[activeY] === 'number'
      && typeof sample.target === 'number'
      && typeof sample.prediction === 'number'
      && Number.isFinite(sample.target)
      && Number.isFinite(sample.prediction)
      && (sample[activeX] as number) >= readyResult.x[0]
      && (sample[activeX] as number) <= readyResult.x[columns - 1]
      && (sample[activeY] as number) >= readyResult.y[0]
      && (sample[activeY] as number) <= readyResult.y[rows - 1],
    ) : []
    const showObserved = activeViewMode !== 'overview'
    const comparePredictions = activeViewMode === 'catboost'
    const responseValues = showObserved
      ? [...readyResult.predictions, ...plottedSamples.flatMap((sample) => [Number(sample.target), Number(sample.prediction)])]
      : readyResult.predictions
    const low = Math.min(...responseValues)
    const high = Math.max(...responseValues)
    const span = high - low || 1
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const color = new THREE.Color()
    const [responseLow, responseMid, responseHigh] = RESPONSE_PALETTES[activeViewMode]
    const heightAt = (value: number) => ((value - low) / span) * 2.35 - 0.35

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const index = row * columns + column
        const prediction = readyResult.predictions[index]
        const ratio = Math.max(0, Math.min(1, (prediction - predictionLow) / (predictionHigh - predictionLow || 1)))
        positions[index * 3] = -5 + (column / (columns - 1)) * 10
        positions[index * 3 + 1] = heightAt(prediction)
        positions[index * 3 + 2] = 5 - (row / (rows - 1)) * 10
        if (ratio < 0.5) color.copy(responseLow).lerp(responseMid, ratio * 2)
        else color.copy(responseMid).lerp(responseHigh, (ratio - 0.5) * 2)
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
      roughness: 0.42,
      metalness: 0.06,
      emissive: darkMode ? '#071b39' : '#000000',
      emissiveIntensity: darkMode ? 0.18 : 0,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: activeViewMode === 'scatter' ? 0.78 : 0.94,
    })
    const nextSurface = new THREE.Mesh(geometry, material)
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: darkMode ? '#d5e4ff' : '#2d496e',
      wireframe: true,
      transparent: true,
      opacity: activeViewMode === 'polynomial' ? 0.32 : activeViewMode === 'catboost' ? 0.24 : 0.12,
      depthWrite: false,
    })
    const nextWireframe = new THREE.Mesh(geometry, wireframeMaterial)
    nextWireframe.renderOrder = 1
    const pointGeometry = new THREE.BufferGeometry()
    const samplePositions: number[] = []
    const sampleColors: number[] = []
    const pointSampleIndexes: number[] = []
    const connectors: number[] = []
    const actualColor = new THREE.Color(darkMode ? '#ff9b9b' : '#e54364')
    const predictionColor = new THREE.Color(darkMode ? '#78a8ff' : '#2463d3')
    plottedSamples.forEach((sample, sampleIndex) => {
      const xRatio = (Number(sample[activeX]) - readyResult.x[0]) / (readyResult.x[columns - 1] - readyResult.x[0] || 1)
      const yRatio = (Number(sample[activeY]) - readyResult.y[0]) / (readyResult.y[rows - 1] - readyResult.y[0] || 1)
      const xPosition = -5 + xRatio * 10
      const zPosition = 5 - yRatio * 10
      const actualHeight = heightAt(Number(sample.target))
      const predictedHeight = heightAt(Number(sample.prediction))
      if (!comparePredictions) {
        samplePositions.push(xPosition, actualHeight, zPosition)
        sampleColors.push(actualColor.r, actualColor.g, actualColor.b)
        pointSampleIndexes.push(sampleIndex)
      } else {
        samplePositions.push(xPosition, actualHeight, zPosition, xPosition, predictedHeight, zPosition)
        sampleColors.push(actualColor.r, actualColor.g, actualColor.b, predictionColor.r, predictionColor.g, predictionColor.b)
        pointSampleIndexes.push(sampleIndex, sampleIndex)
        connectors.push(xPosition, actualHeight, zPosition, xPosition, predictedHeight, zPosition)
      }
    })
    pointGeometry.setAttribute('position', new THREE.Float32BufferAttribute(samplePositions, 3))
    pointGeometry.setAttribute('color', new THREE.Float32BufferAttribute(sampleColors, 3))
    const pointMaterial = new THREE.PointsMaterial({ vertexColors: true, size: 0.17, sizeAttenuation: true, transparent: true, opacity: 1, depthTest: false, depthWrite: false })
    const nextPoints = new THREE.Points(pointGeometry, pointMaterial)
    nextPoints.renderOrder = 2
    const connectorGeometry = new THREE.BufferGeometry()
    connectorGeometry.setAttribute('position', new THREE.Float32BufferAttribute(connectors, 3))
    const connectorMaterial = new THREE.LineBasicMaterial({ color: darkMode ? '#d6e0f0' : '#52647d', transparent: true, opacity: 0.68, depthTest: false })
    const nextConnectors = new THREE.LineSegments(connectorGeometry, connectorMaterial)
    nextConnectors.renderOrder = 1

    if (state.surface) {
      const oldPositions = (state.surface.geometry.getAttribute('position') as THREE.BufferAttribute).array
      const from = oldPositions.length === positions.length ? Float32Array.from(oldPositions) : Float32Array.from(positions, (_, index) => index % 3 === 1 ? -0.7 : positions[index])
      state.animation = { started: performance.now(), from, to: positions, geometry }
      nextSurface.geometry.getAttribute('position').array.set(from)
      nextSurface.geometry.computeVertexNormals()
      state.scene.remove(state.surface)
      state.surface.geometry.dispose()
      state.surface.material.dispose()
      if (state.wireframe) {
        state.scene.remove(state.wireframe)
        state.wireframe.material.dispose()
      }
    } else {
      state.animation = { started: performance.now(), from: Float32Array.from(positions, (_, index) => index % 3 === 1 ? -0.7 : positions[index]), to: positions, geometry }
      nextSurface.geometry.getAttribute('position').array.set(state.animation.from)
    }
    if (state.points) {
      state.scene.remove(state.points)
      state.points.geometry.dispose()
      state.points.material.dispose()
    }
    if (state.connectors) {
      state.scene.remove(state.connectors)
      state.connectors.geometry.dispose()
      state.connectors.material.dispose()
    }
    if (state.annotations) {
      state.scene.remove(state.annotations)
      disposeAnnotationGroup(state.annotations)
    }
    const annotations = new THREE.Group()
    const surfaceStart = new THREE.Vector3(-5, -0.35, 5)
    const addTicks = (axis: 'x' | 'featureY' | 'response') => [0, .5, 1].map((fraction) => ({
      position: axis === 'x'
        ? new THREE.Vector3(-5 + 10 * fraction, -0.35, 5)
        : axis === 'featureY'
          ? new THREE.Vector3(-5, -0.35, 5 - 10 * fraction)
          : new THREE.Vector3(-5, -0.35 + fraction * 2.35, 5),
      offset: axis === 'x' ? new THREE.Vector3(0, 0, .22) : axis === 'featureY' ? new THREE.Vector3(-.22, 0, 0) : new THREE.Vector3(-.22, 0, 0),
      label: axis === 'x'
        ? readyResult.x[Math.round(fraction * (columns - 1))].toPrecision(3)
        : axis === 'featureY'
          ? readyResult.y[Math.round(fraction * (rows - 1))].toPrecision(3)
          : (low + fraction * span).toPrecision(3),
    }))
    addLabeledAxis(annotations, {
      darkMode,
      start: surfaceStart,
      end: new THREE.Vector3(5, -0.35, 5),
      label: `X · ${activeX}`,
      labelPosition: new THREE.Vector3(0, -0.95, 6),
      ticks: addTicks('x'),
    })
    addLabeledAxis(annotations, {
      darkMode,
      start: surfaceStart,
      end: new THREE.Vector3(-5, -0.35, -5),
      label: `Y · ${activeY}`,
      labelPosition: new THREE.Vector3(-6.3, -0.95, 0),
      ticks: addTicks('featureY'),
    })
    addLabeledAxis(annotations, {
      darkMode,
      start: surfaceStart,
      end: new THREE.Vector3(-5, 2, 5),
      label: `Z · ${task === 'regression' ? (activeViewMode === 'overview' ? `${target} prediction` : target) : 'predicted probability'}`,
      labelPosition: new THREE.Vector3(-6.3, .9, 6),
      ticks: addTicks('response'),
    })
    state.annotations = annotations
    state.surface = nextSurface
    state.wireframe = nextWireframe
    state.points = nextPoints
    state.connectors = nextConnectors
    state.scene.add(nextSurface)
    if (activeViewMode === 'polynomial' || activeViewMode === 'catboost') state.scene.add(nextWireframe)
    state.scene.add(nextPoints, annotations)
    if (comparePredictions) state.scene.add(nextConnectors)
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    const handlePointerMove = (event: PointerEvent) => {
      const rect = state.renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, state.camera)
      raycaster.params.Points.threshold = 0.2
      const pointIntersection = showObserved ? raycaster.intersectObject(nextPoints)[0] : undefined
      if (pointIntersection?.index !== undefined) {
        const sampleIndex = pointSampleIndexes[pointIntersection.index]
        const sample = plottedSamples[sampleIndex]
        if (sample) {
          const kind = comparePredictions && pointIntersection.index % 2 === 1 ? 'prediction' : 'actual'
          const actual = Number(sample.target)
          const predicted = Number(sample.prediction)
          setHovered({
            x: Number(sample[activeX]),
            y: Number(sample[activeY]),
            response: kind === 'prediction' ? predicted : actual,
            label: kind === 'prediction' ? 'CatBoost prediction' : 'Observed target',
            detail: `Actual ${actual.toPrecision(4)} · predicted ${predicted.toPrecision(4)}`,
            screenX: event.clientX - rect.left,
            screenY: event.clientY - rect.top,
          })
          return
        }
      }
      const intersection = raycaster.intersectObject(nextSurface)[0]
      if (!intersection) {
        setHovered(null)
        return
      }
      const column = Math.max(0, Math.min(columns - 1, Math.round((intersection.point.x + 5) / 10 * (columns - 1))))
      const row = Math.max(0, Math.min(rows - 1, Math.round((5 - intersection.point.z) / 10 * (rows - 1))))
      setHovered({
        x: readyResult.x[column],
        y: readyResult.y[row],
        response: readyResult.predictions[row * columns + column],
        label: task === 'regression' ? 'CatBoost prediction' : 'Predicted probability',
        screenX: event.clientX - rect.left,
        screenY: event.clientY - rect.top,
      })
    }
    const handlePointerLeave = () => setHovered(null)
    state.renderer.domElement.addEventListener('pointermove', handlePointerMove)
    state.renderer.domElement.addEventListener('pointerleave', handlePointerLeave)
    return () => {
      state.renderer.domElement.removeEventListener('pointermove', handlePointerMove)
      state.renderer.domElement.removeEventListener('pointerleave', handlePointerLeave)
    }
  }, [readyResult, activeX, activeY, darkMode, task, target, activeViewMode])

  function resetView() {
    const state = sceneRef.current
    if (!state) return
    state.camera.position.set(9, 8, 11)
    state.controls.target.set(0, 0.6, 0)
    state.controls.update()
  }

  return <section className="model-surface-page">
    {task === 'regression' && <div className="surface-view-tabs" role="tablist" aria-label="3D regression visualization">
      <button type="button" role="tab" aria-selected={activeViewMode === 'overview'} className={activeViewMode === 'overview' ? 'active' : ''} onClick={() => setViewMode('overview')}>Regression overview</button>
      <button type="button" role="tab" aria-selected={activeViewMode === 'polynomial'} className={activeViewMode === 'polynomial' ? 'active' : ''} onClick={() => setViewMode('polynomial')}>Polynomial-style surface</button>
      <button type="button" role="tab" aria-selected={activeViewMode === 'scatter'} className={activeViewMode === 'scatter' ? 'active' : ''} onClick={() => setViewMode('scatter')}>Scatter + regression surface</button>
      <button type="button" role="tab" aria-selected={activeViewMode === 'catboost'} className={activeViewMode === 'catboost' ? 'active' : ''} onClick={() => setViewMode('catboost')}>CatBoost nonlinear</button>
    </div>}
    <p className="surface-view-description">
      {activeViewMode === 'overview'
        ? 'Overview of CatBoost predictions across the selected features. The surface is model output, not a separately fitted linear-regression plane.'
        : activeViewMode === 'polynomial'
          ? 'A smooth, wireframed presentation of the CatBoost response with real observations. “Polynomial-style” describes the look only; no polynomial model is fitted.'
          : activeViewMode === 'scatter'
            ? 'Real dataset observations are layered over the CatBoost prediction surface at their actual target values.'
            : 'Inspect the CatBoost response mesh alongside observed and predicted values for the same rows; connectors show each prediction gap.'}
    </p>
    <div className="surface-toolbar">
      <label>Feature X<select value={activeX} onChange={(event) => setFeatureX(event.target.value)}>{numeric.map((feature) => <option key={feature.name}>{feature.name}</option>)}</select></label>
      <label>Feature Y<select value={activeY} onChange={(event) => setFeatureY(event.target.value)}>{numeric.filter((feature) => feature.name !== activeX).map((feature) => <option key={feature.name}>{feature.name}</option>)}</select></label>
      <div className="surface-iterations" aria-label="Tree checkpoints">{trainedIterations ? [10, 50, 100, maxTrees].filter((value, index, values) => value <= maxTrees && values.indexOf(value) === index).map((value) => <button key={value} className={selectedTrees === value ? 'active' : ''} onClick={() => setIteration(value)}>{value}</button>) : <span className="surface-no-model">Train first</span>}</div>
      <button className="surface-reset" onClick={resetView} disabled={Boolean(sceneError)} title="Reset camera view"><RotateCcw size={15} /><span>Reset view</span></button>
    </div>
    <div className="surface-stage">
      {sceneError ? <div className="surface-empty"><strong>3D rendering unavailable</strong><span>{sceneError}</span></div> : <>
        <div className="surface-canvas" ref={hostRef} />
        {hovered && <div className="surface-hover-tip" style={{ left: hovered.screenX, top: hovered.screenY }}>
          <b>{hovered.label}</b>
          <span>{activeX}: {hovered.x.toPrecision(4)}</span>
          <span>{activeY}: {hovered.y.toPrecision(4)}</span>
          <strong>{hovered.response.toPrecision(4)}</strong>
          {hovered.detail && <span>{hovered.detail}</span>}
        </div>}
        {!trainedIterations && <div className="surface-overlay"><strong>Train a model to view its response surface</strong><span>The 3D surface needs a fitted model and two numeric features.</span></div>}
        {trainedIterations > 0 && error && !readyResult && <div className="surface-overlay"><strong>Surface unavailable</strong><span>{error}</span></div>}
        {trainedIterations > 0 && (!activeX || !activeY) && <div className="surface-overlay"><strong>Two numeric features required</strong><span>Choose a dataset with at least two numeric features to build a 3D model view.</span></div>}
        {trainedIterations > 0 && activeX && activeY && !error && !readyResult && <div className="surface-overlay"><strong>Updating surface</strong><span>Calculating model confidence at {selectedTrees} trees…</span></div>}
        <div className="surface-z-label">{`Z · ${task === 'regression' ? (activeViewMode === 'overview' ? `${target.toUpperCase()} · PREDICTION` : `${target.toUpperCase()} · ACTUAL / PREDICTED`) : 'PREDICTED PROBABILITY'}`}</div>
        <div className="surface-axis-labels">
          <span>{readyResult ? `X · ${activeX}: ${readyResult.x[0].toPrecision(4)}–${readyResult.x.at(-1)?.toPrecision(4)}` : `X · ${activeX || 'Feature X'}`}</span>
          <span>{readyResult ? `Y · ${activeY}: ${readyResult.y[0].toPrecision(4)}–${readyResult.y.at(-1)?.toPrecision(4)}` : `Y · ${activeY || 'Feature Y'}`}</span>
        </div>
        <div className="surface-legend">
          {activeViewMode === 'overview' ? <>
            <span>Lower prediction</span><i /><span>Higher prediction</span>
          </> : <>
            <span>Lower prediction</span><i /><span>Higher prediction</span>
            {task === 'regression' && <b className="surface-observation-key">{plottedSampleCount(readyResult)}</b>}
            {activeViewMode === 'catboost' && <span className="surface-point-keys"><i className="actual-key" /> Actual <i className="predicted-key" /> Predicted</span>}
          </>}
        </div>
        <div className="surface-hint"><Maximize2 size={13} /> Drag to orbit <i /> Scroll to zoom <i /> Right-drag to pan</div>
      </>}
    </div>
    <div className="surface-iteration-control"><span>Tree count <b>{trainedIterations ? selectedTrees : '—'}</b>{trainedIterations ? ` / ${maxTrees}` : ' · no fitted model'}</span><input aria-label="Tree count" type="range" min="1" max={maxTrees} value={selectedTrees} disabled={!trainedIterations} onChange={(event) => setIteration(Number(event.target.value))} /></div>
  </section>
}
