import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import {
  Play,
  Pause,
  RotateCw,
  Camera,
  Layers,
  Sparkles,
  Maximize2,
  Sliders,
  Rotate3d,
  Compass
} from 'lucide-react';
import { PCADataPoint, PCAResult } from '../types/pca';

interface PCA3DPlotProps {
  pcaResult: PCAResult;
  datasetName: string;
}

const PALETTE = [
  '#00f0ff', // Cyan
  '#ff007f', // Magenta
  '#00ff88', // Lime
  '#ffb700', // Gold
  '#a855f7', // Purple
  '#3b82f6', // Blue
  '#f97316', // Orange
];

export const PCA3DPlot: React.FC<PCA3DPlotProps> = ({ pcaResult, datasetName }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Auto-rotate state (critical requirement!)
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [rotationSpeed, setRotationSpeed] = useState(0.8);
  const [showLoadings3D, setShowLoadings3D] = useState(true);
  const [showFloorGrid, setShowFloorGrid] = useState(true);
  const [pointScale, setPointScale] = useState(1.0);

  // Hover state
  const [hoveredData, setHoveredData] = useState<PCADataPoint | null>(null);
  const [mouseScreenPos, setMouseScreenPos] = useState({ x: 0, y: 0 });

  // Map labels to hex colors
  const labelColorMap = useMemo(() => {
    const map = new Map<string, string>();
    let idx = 0;
    for (const pt of pcaResult.transformedData) {
      if (!map.has(pt.label)) {
        map.set(pt.label, PALETTE[idx % PALETTE.length]);
        idx++;
      }
    }
    return map;
  }, [pcaResult]);

  // Three.js instances refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const pointsGroupRef = useRef<THREE.Group | null>(null);
  const loadingsGroupRef = useRef<THREE.Group | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);

  // Manual rotation & drag interaction tracking
  const isDraggingRef = useRef(false);
  const prevMousePosRef = useRef({ x: 0, y: 0 });
  const cameraDistanceRef = useRef(35);
  const cameraSphericalRef = useRef({ radius: 35, theta: Math.PI / 4, phi: Math.PI / 3 });

  // Retained variance for 3D
  const var1 = (pcaResult.explainedVariance[0] || 0) * 100;
  const var2 = (pcaResult.explainedVariance[1] || 0) * 100;
  const var3 = (pcaResult.explainedVariance[2] || 0) * 100;
  const total3DVar = (var1 + var2 + var3).toFixed(2);

  // Initialize Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene & Pure Black Background
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // Deep Obsidian Black
    scene.fog = new THREE.FogExp2(0x000000, 0.015);
    sceneRef.current = scene;

    // 2. Camera
    const aspect = container.clientWidth / container.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    cameraRef.current = camera;

    // Set initial camera position from spherical coords
    const updateCameraPos = () => {
      const { radius, theta, phi } = cameraSphericalRef.current;
      camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
      camera.position.y = radius * Math.cos(phi);
      camera.position.z = radius * Math.sin(phi) * Math.cos(theta);
      camera.lookAt(0, 0, 0);
    };
    updateCameraPos();

    // 3. Renderer with antialiasing
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x00f0ff, 2, 80);
    pointLight1.position.set(20, 20, 20);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff007f, 2, 80);
    pointLight2.position.set(-20, -10, -20);
    scene.add(pointLight2);

    // 5. Floor Grid
    const gridHelper = new THREE.GridHelper(30, 20, 0x00f0ff, 0x1e293b);
    gridHelper.position.y = -12;
    scene.add(gridHelper);
    gridHelperRef.current = gridHelper;

    // 6. 3D Principal Coordinate Axes with glowing lines
    const axisGroup = new THREE.Group();

    // PC1 Axis (X - Cyan)
    const pc1Geom = new THREE.CylinderGeometry(0.08, 0.08, 26, 16);
    pc1Geom.rotateZ(-Math.PI / 2);
    const pc1Mat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    axisGroup.add(new THREE.Mesh(pc1Geom, pc1Mat));

    // PC2 Axis (Y - Magenta)
    const pc2Geom = new THREE.CylinderGeometry(0.08, 0.08, 26, 16);
    const pc2Mat = new THREE.MeshBasicMaterial({ color: 0xff007f });
    axisGroup.add(new THREE.Mesh(pc2Geom, pc2Mat));

    // PC3 Axis (Z - Lime)
    const pc3Geom = new THREE.CylinderGeometry(0.08, 0.08, 26, 16);
    pc3Geom.rotateX(Math.PI / 2);
    const pc3Mat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
    axisGroup.add(new THREE.Mesh(pc3Geom, pc3Mat));

    scene.add(axisGroup);

    // 7. Data Points Group
    const pointsGroup = new THREE.Group();
    scene.add(pointsGroup);
    pointsGroupRef.current = pointsGroup;

    // Scale factors to fit in -10 to +10 box
    let maxCoord = 1;
    for (const pt of pcaResult.transformedData) {
      maxCoord = Math.max(
        maxCoord,
        Math.abs(pt.coords[0] || 0),
        Math.abs(pt.coords[1] || 0),
        Math.abs(pt.coords[2] || 0)
      );
    }
    const normFactor = 9.0 / maxCoord;

    const sphereGeom = new THREE.SphereGeometry(0.38, 20, 20);

    pcaResult.transformedData.forEach((pt) => {
      const hex = labelColorMap.get(pt.label) || '#00f0ff';
      const color = new THREE.Color(hex);

      const sphereMat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.45,
        roughness: 0.2,
        metalness: 0.8
      });

      const sphere = new THREE.Mesh(sphereGeom, sphereMat);
      sphere.position.set(
        (pt.coords[0] || 0) * normFactor,
        (pt.coords[1] || 0) * normFactor,
        (pt.coords[2] || 0) * normFactor
      );
      sphere.userData = { pt };
      pointsGroup.add(sphere);
    });

    // 8. 3D Loading Vectors Group
    const loadingsGroup = new THREE.Group();
    scene.add(loadingsGroup);
    loadingsGroupRef.current = loadingsGroup;

    if (pcaResult.loadings.length > 0) {
      const maxLoading = Math.max(...pcaResult.loadings.map(l => l.importance)) || 1;
      const loadingMult = 9.0 / maxLoading;

      pcaResult.loadings.forEach(loading => {
        const target = new THREE.Vector3(
          (loading.vector[0] || 0) * loadingMult,
          (loading.vector[1] || 0) * loadingMult,
          (loading.vector[2] || 0) * loadingMult
        );

        if (target.length() > 0.5) {
          const dir = target.clone().normalize();
          const arrow = new THREE.ArrowHelper(
            dir,
            new THREE.Vector3(0, 0, 0),
            target.length(),
            0xffcf00, // Gold Loading arrow
            0.6,
            0.3
          );
          loadingsGroup.add(arrow);
        }
      });
    }

    // 9. Animation Loop with Auto-Rotation
    let clock = new THREE.Clock();

    const animate = () => {
      const delta = clock.getDelta();

      // Smooth Auto-Rotate around Y-axis
      if (isAutoRotating) {
        cameraSphericalRef.current.theta += delta * rotationSpeed * 0.5;
        updateCameraPos();
      }

      renderer.render(scene, camera);
      animationFrameIdRef.current = requestAnimationFrame(animate);
    };

    animate();

    // 10. Resize handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      renderer.dispose();
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [pcaResult, labelColorMap]);

  // Handle auto-rotate state changes dynamically without recreating scene
  useEffect(() => {
    // Handled directly via isAutoRotating and rotationSpeed state references in animation loop
  }, [isAutoRotating, rotationSpeed]);

  // Handle visibility of 3D loadings & floor
  useEffect(() => {
    if (loadingsGroupRef.current) {
      loadingsGroupRef.current.visible = showLoadings3D;
    }
    if (gridHelperRef.current) {
      gridHelperRef.current.visible = showFloorGrid;
    }
  }, [showLoadings3D, showFloorGrid]);

  // Handle point scale
  useEffect(() => {
    if (pointsGroupRef.current) {
      pointsGroupRef.current.scale.set(pointScale, pointScale, pointScale);
    }
  }, [pointScale]);

  // Mouse interaction: Drag to orbit camera & Wheel to zoom
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    prevMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const container = mountRef.current;
    if (!container || !cameraRef.current || !sceneRef.current) return;

    if (isDraggingRef.current) {
      const deltaX = e.clientX - prevMousePosRef.current.x;
      const deltaY = e.clientY - prevMousePosRef.current.y;
      prevMousePosRef.current = { x: e.clientX, y: e.clientY };

      cameraSphericalRef.current.theta -= deltaX * 0.008;
      cameraSphericalRef.current.phi = Math.max(
        0.1,
        Math.min(Math.PI - 0.1, cameraSphericalRef.current.phi - deltaY * 0.008)
      );

      // Manual drag updates camera immediately
      const { radius, theta, phi } = cameraSphericalRef.current;
      cameraRef.current.position.x = radius * Math.sin(phi) * Math.sin(theta);
      cameraRef.current.position.y = radius * Math.cos(phi);
      cameraRef.current.position.z = radius * Math.sin(phi) * Math.cos(theta);
      cameraRef.current.lookAt(0, 0, 0);
      return;
    }

    // 3D Raycasting for hover tooltip
    const rect = container.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / container.clientWidth) * 2 - 1,
      -((e.clientY - rect.top) / container.clientHeight) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);

    if (pointsGroupRef.current) {
      const intersects = raycaster.intersectObjects(pointsGroupRef.current.children);
      if (intersects.length > 0) {
        const hit = intersects[0].object;
        if (hit.userData && hit.userData.pt) {
          setHoveredData(hit.userData.pt);
          setMouseScreenPos({ x: e.clientX, y: e.clientY });
        }
      } else {
        setHoveredData(null);
      }
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!cameraRef.current) return;
    const zoomFactor = e.deltaY > 0 ? 1.08 : 0.92;
    cameraSphericalRef.current.radius = Math.max(10, Math.min(80, cameraSphericalRef.current.radius * zoomFactor));

    const { radius, theta, phi } = cameraSphericalRef.current;
    cameraRef.current.position.x = radius * Math.sin(phi) * Math.sin(theta);
    cameraRef.current.position.y = radius * Math.cos(phi);
    cameraRef.current.position.z = radius * Math.sin(phi) * Math.cos(theta);
    cameraRef.current.lookAt(0, 0, 0);
  };

  // Camera presets
  const setCameraView = (type: 'iso' | 'pc1_pc2' | 'pc1_pc3' | 'pc2_pc3') => {
    if (!cameraRef.current) return;
    if (type === 'iso') {
      cameraSphericalRef.current = { radius: 35, theta: Math.PI / 4, phi: Math.PI / 3 };
    } else if (type === 'pc1_pc2') {
      // Top view
      cameraSphericalRef.current = { radius: 35, theta: 0, phi: 0.05 };
    } else if (type === 'pc1_pc3') {
      // Side view
      cameraSphericalRef.current = { radius: 35, theta: 0, phi: Math.PI / 2 };
    } else if (type === 'pc2_pc3') {
      // Front view
      cameraSphericalRef.current = { radius: 35, theta: Math.PI / 2, phi: Math.PI / 2 };
    }

    const { radius, theta, phi } = cameraSphericalRef.current;
    cameraRef.current.position.x = radius * Math.sin(phi) * Math.sin(theta);
    cameraRef.current.position.y = radius * Math.cos(phi);
    cameraRef.current.position.z = radius * Math.sin(phi) * Math.cos(theta);
    cameraRef.current.lookAt(0, 0, 0);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 3D Controls Toolbar */}
      <div className="glass-panel" style={{
        padding: '12px 20px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16
      }}>
        {/* Left: 3D Metrics */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div>
            <span style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              3D Space Variance
            </span>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent-cyan)' }}>
              {total3DVar}% Retained
            </div>
          </div>

          <div style={{ width: 1, height: 28, background: 'var(--border-subtle)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="badge badge-cyan" style={{ fontSize: 11 }}>
              PC1: {var1.toFixed(1)}%
            </span>
            <span className="badge badge-magenta" style={{ fontSize: 11 }}>
              PC2: {var2.toFixed(1)}%
            </span>
            <span className="badge badge-lime" style={{ fontSize: 11 }}>
              PC3: {var3.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Center: THE CRITICAL AUTO-ROTATE BUTTON & Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'rgba(0, 240, 255, 0.06)',
          border: '1px solid rgba(0, 240, 255, 0.3)',
          padding: '6px 14px',
          borderRadius: 12,
          boxShadow: isAutoRotating ? '0 0 20px rgba(0, 240, 255, 0.25)' : 'none'
        }}>
          {/* Main Auto Rotate Toggle Button */}
          <button
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            style={{
              background: isAutoRotating
                ? 'linear-gradient(135deg, #00f0ff 0%, #00a8ff 100%)'
                : 'rgba(255, 255, 255, 0.08)',
              color: isAutoRotating ? '#000000' : '#ffffff',
              fontWeight: 800,
              padding: '8px 16px',
              borderRadius: 8,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: isAutoRotating ? '0 0 16px rgba(0, 240, 255, 0.6)' : 'none',
              transform: isAutoRotating ? 'scale(1.02)' : 'none'
            }}
          >
            {isAutoRotating ? <Pause size={15} /> : <Play size={15} />}
            <span>{isAutoRotating ? 'PAUSE AUTO-ROTATE' : 'START AUTO-ROTATE'}</span>
          </button>

          {/* Speed Slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RotateCw size={13} color="var(--accent-cyan)" />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Speed:</span>
            <input
              type="range"
              min="0.2"
              max="2.5"
              step="0.1"
              value={rotationSpeed}
              onChange={(e) => setRotationSpeed(parseFloat(e.target.value))}
              style={{ width: 70, accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
            />
            <span style={{ fontSize: 11, color: 'var(--accent-cyan)', fontWeight: 700, width: 28 }}>
              {rotationSpeed}x
            </span>
          </div>
        </div>

        {/* Right: Camera Views & Visual Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255, 255, 255, 0.04)', padding: '3px 6px', borderRadius: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-dim)', marginRight: 4 }}>Views:</span>
            <button
              onClick={() => setCameraView('iso')}
              className="btn-secondary"
              style={{ padding: '4px 8px', fontSize: 11 }}
            >
              3D Iso
            </button>
            <button
              onClick={() => setCameraView('pc1_pc2')}
              className="btn-secondary"
              style={{ padding: '4px 8px', fontSize: 11 }}
            >
              Top (1-2)
            </button>
            <button
              onClick={() => setCameraView('pc1_pc3')}
              className="btn-secondary"
              style={{ padding: '4px 8px', fontSize: 11 }}
            >
              Side (1-3)
            </button>
          </div>

          <button
            onClick={() => setShowLoadings3D(!showLoadings3D)}
            className={`btn-secondary ${showLoadings3D ? 'btn-active' : ''}`}
            style={{ padding: '6px 10px', fontSize: 12 }}
            title="Toggle 3D Feature Loading Rays (Gold Vectors)"
          >
            <Layers size={13} />
            <span>Loadings</span>
          </button>

          <button
            onClick={() => setShowFloorGrid(!showFloorGrid)}
            className={`btn-secondary ${showFloorGrid ? 'btn-active' : ''}`}
            style={{ padding: '6px 10px', fontSize: 12 }}
            title="Toggle 3D Floor Reference Grid"
          >
            <Compass size={13} />
            <span>Grid</span>
          </button>
        </div>
      </div>

      {/* Main 3D Viewport */}
      <div
        className="glass-panel"
        style={{
          position: 'relative',
          width: '100%',
          height: 640,
          borderRadius: 18,
          overflow: 'hidden',
          border: '1px solid rgba(0, 240, 255, 0.2)',
          boxShadow: '0 0 35px rgba(0, 0, 0, 0.9)',
          cursor: isDraggingRef.current ? 'grabbing' : 'grab'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      >
        <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

        {/* 3D Coordinate Axis HUD Overlay */}
        <div style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          background: 'rgba(6, 9, 14, 0.88)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 12,
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          pointerEvents: 'none'
        }}>
          <span style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            3D Spatial Axes
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 12, height: 3, background: 'var(--accent-cyan)', borderRadius: 2 }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-cyan)' }}>
              PC1 (X-Axis): {var1.toFixed(1)}%
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 12, height: 3, background: 'var(--accent-magenta)', borderRadius: 2 }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-magenta)' }}>
              PC2 (Y-Axis): {var2.toFixed(1)}%
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 12, height: 3, background: 'var(--accent-lime)', borderRadius: 2 }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-lime)' }}>
              PC3 (Z-Axis): {var3.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Auto-Rotate Floating Status Indicator */}
        <div style={{
          position: 'absolute',
          top: 16,
          left: 16,
          background: isAutoRotating ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(12px)',
          border: isAutoRotating ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
          borderRadius: 20,
          padding: '5px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          pointerEvents: 'none'
        }}>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: isAutoRotating ? 'var(--accent-cyan)' : 'var(--text-dim)',
            boxShadow: isAutoRotating ? '0 0 10px var(--accent-cyan)' : 'none'
          }} />
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            color: isAutoRotating ? 'var(--accent-cyan)' : 'var(--text-dim)'
          }}>
            {isAutoRotating ? `AUTO-ROTATING (${rotationSpeed}x)` : 'ORBIT PAUSED (DRAG TO ROTATE)'}
          </span>
        </div>

        {/* Cluster Legend in 3D */}
        <div style={{
          position: 'absolute',
          top: 16,
          right: 16,
          background: 'rgba(6, 9, 14, 0.88)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 12,
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          pointerEvents: 'none'
        }}>
          <span style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            Classes
          </span>
          {Array.from(labelColorMap.entries()).map(([label, color]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#f1f5f9' }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Interactive Hover Tooltip for 3D Raycasting */}
        {hoveredData && (
          <div
            style={{
              position: 'fixed',
              left: Math.min(mouseScreenPos.x + 16, window.innerWidth - 300),
              top: Math.min(mouseScreenPos.y + 16, window.innerHeight - 240),
              background: 'rgba(10, 13, 20, 0.95)',
              backdropFilter: 'blur(16px)',
              border: '1px solid var(--accent-cyan)',
              borderRadius: 12,
              padding: '12px 16px',
              color: '#ffffff',
              boxShadow: '0 0 25px rgba(0, 240, 255, 0.4)',
              zIndex: 1000,
              pointerEvents: 'none',
              maxWidth: 280
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent-cyan)' }}>
                Sample #{hoveredData.id + 1}
              </span>
              <span className="badge" style={{
                background: `${labelColorMap.get(hoveredData.label)}20`,
                color: labelColorMap.get(hoveredData.label),
                borderColor: `${labelColorMap.get(hoveredData.label)}40`
              }}>
                {hoveredData.label}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <span style={{ fontSize: 9, color: 'var(--accent-cyan)' }}>PC1:</span>
                <div style={{ fontSize: 11, fontWeight: 700 }}>{(hoveredData.coords[0] || 0).toFixed(2)}</div>
              </div>
              <div>
                <span style={{ fontSize: 9, color: 'var(--accent-magenta)' }}>PC2:</span>
                <div style={{ fontSize: 11, fontWeight: 700 }}>{(hoveredData.coords[1] || 0).toFixed(2)}</div>
              </div>
              <div>
                <span style={{ fontSize: 9, color: 'var(--accent-lime)' }}>PC3:</span>
                <div style={{ fontSize: 11, fontWeight: 700 }}>{(hoveredData.coords[2] || 0).toFixed(2)}</div>
              </div>
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>RAW VALUES:</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
                {Object.entries(hoveredData.original).slice(0, 4).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-dim)' }}>{k}:</span>
                    <span style={{ fontWeight: 600 }}>{Number(v).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
