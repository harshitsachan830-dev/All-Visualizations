import * as THREE from 'three'

export type AxisTick = {
  position: THREE.Vector3
  offset: THREE.Vector3
  label: string
}

function textSprite(text: string, color: string, width: number, height: number): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 96
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not create a canvas for 3D axis labels.')
  context.font = '600 30px system-ui, sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillStyle = color
  context.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width - 20)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(width, height, 1)
  sprite.renderOrder = 3
  return sprite
}

export function addLabeledAxis(
  group: THREE.Group,
  options: {
    darkMode: boolean
    start: THREE.Vector3
    end: THREE.Vector3
    label: string
    labelPosition: THREE.Vector3
    ticks: AxisTick[]
  },
) {
  const axisColor = options.darkMode ? '#a9bad5' : '#73839a'
  const textColor = options.darkMode ? '#e0e9f7' : '#465671'
  const lineMaterial = new THREE.LineBasicMaterial({ color: axisColor, transparent: true, opacity: 0.88 })
  const addLine = (start: THREE.Vector3, end: THREE.Vector3) => {
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end])
    group.add(new THREE.Line(geometry, lineMaterial))
  }
  addLine(options.start, options.end)
  options.ticks.forEach((tick) => {
    addLine(tick.position.clone().sub(tick.offset.clone().multiplyScalar(0.5)), tick.position.clone().add(tick.offset.clone().multiplyScalar(0.5)))
    const label = textSprite(tick.label, textColor, 0.85, 0.19)
    label.position.copy(tick.position.clone().add(tick.offset.clone().multiplyScalar(1.5)))
    group.add(label)
  })
  const title = textSprite(options.label, textColor, 2.65, 0.34)
  title.position.copy(options.labelPosition)
  group.add(title)
}

export function disposeAnnotationGroup(group: THREE.Group) {
  group.traverse((object) => {
    if (object instanceof THREE.Line) object.geometry.dispose()
    if (object instanceof THREE.Sprite) {
      object.material.map?.dispose()
      object.material.dispose()
    }
  })
}
