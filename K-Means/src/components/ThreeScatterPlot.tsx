import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Centroid3D,
  getClusterColor,
  IterationSnapshot,
  euclideanDistance,
} from '../utils/kmeans';

export interface ThreeScatterPlotProps {
  data: Record<string, number>[];
  features: [string, string, string]; // [X, Y, Z]
  currentSnapshot?: IterationSnapshot;
  allSnapshots?: IterationSnapshot[];
  currentIteration: number;
  normalizationBounds: { min: number[]; max: number[] };
  selectedPointIndex?: number | null;
  onSelectPoint?: (index: number | null) => void;
  queryPoint?: { coordinates: [number, number, number]; rawCoords: [number, number, number] } | null;
  isolatedCluster?: number | null;
  showTrajectories?: boolean;
  showDistanceRays?: boolean;
  showHulls?: boolean;
  showGrid?: boolean;
  pointSize?: number;
  height?: string | number;
  defaultAutoRotate?: boolean;
  autoRotateSpeed?: number;
}

export interface ThreeScatterPlotRef {
  resetCamera: () => void;
  setCameraPreset: (preset: 'iso' | 'top' | 'front' | 'side') => void;
  toggleAutoRotate: () => void;
}

export const ThreeScatterPlot = forwardRef<ThreeScatterPlotRef, ThreeScatterPlotProps>((
  {
    data,
    features,
    currentSnapshot,
    allSnapshots = [],
    currentIteration,
    normalizationBounds,
    selectedPointIndex = null,
    onSelectPoint,
    queryPoint = null,
    isolatedCluster = null,
    showTrajectories = true,
    showDistanceRays = true,
    showHulls = false,
    showGrid = true,
    pointSize = 1.6,
    height = '100%',
    defaultAutoRotate = false,
    autoRotateSpeed = 2.0,
  },
  ref
) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Group references for clean updates
  const pointsGroupRef = useRef<THREE.Group>(new THREE.Group());
  const centroidsGroupRef = useRef<THREE.Group>(new THREE.Group());
  const trajectoriesGroupRef = useRef<THREE.Group>(new THREE.Group());
  const raysGroupRef = useRef<THREE.Group>(new THREE.Group());
  const hullsGroupRef = useRef<THREE.Group>(new THREE.Group());
  const queryGroupRef = useRef<THREE.Group>(new THREE.Group());
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);

  const [hoveredPoint, setHoveredPoint] = useState<{
    id: number;
    cluster: number;
    rawValues: number[];
    distanceToCentroid: number;
    screenX: number;
    screenY: number;
  } | null>(null);

  const [isAutoRotating, setIsAutoRotating] = useState(defaultAutoRotate);
  const isAutoRotatingRef = useRef(defaultAutoRotate);

  useEffect(() => {
    isAutoRotatingRef.current = isAutoRotating;
    if (controlsRef.current) {
      controlsRef.current.autoRotate = isAutoRotating;
      controlsRef.current.autoRotateSpeed = autoRotateSpeed;
    }
  }, [isAutoRotating, autoRotateSpeed]);

  // Normalization helper
  const normalize = (coords: number[]): [number, number, number] => {
    const scale = 70;
    const nx = ((coords[0] - normalizationBounds.min[0]) / ((normalizationBounds.max[0] - normalizationBounds.min[0]) || 1) - 0.5) * scale;
    const ny = ((coords[1] - normalizationBounds.min[1]) / ((normalizationBounds.max[1] - normalizationBounds.min[1]) || 1) - 0.5) * scale;
    const nz = ((coords[2] - normalizationBounds.min[2]) / ((normalizationBounds.max[2] - normalizationBounds.min[2]) || 1) - 0.5) * scale;
    return [nx, ny, nz];
  };

  // Expose camera presets to parent
  useImperativeHandle(ref, () => ({
    resetCamera: () => {
      if (!cameraRef.current || !controlsRef.current) return;
      cameraRef.current.position.set(70, 60, 80);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    },
    setCameraPreset: (preset) => {
      if (!cameraRef.current || !controlsRef.current) return;
      controlsRef.current.target.set(0, 0, 0);
      if (preset === 'iso') cameraRef.current.position.set(70, 60, 80);
      else if (preset === 'top') cameraRef.current.position.set(0, 110, 0);
      else if (preset === 'front') cameraRef.current.position.set(0, 0, 110);
      else if (preset === 'side') cameraRef.current.position.set(110, 0, 0);
      controlsRef.current.update();
    },
    toggleAutoRotate: () => {
      setIsAutoRotating((prev) => !prev);
    },
  }));

  // Initial Scene Setup
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 450;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06070a); // Deep graphite/black
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(70, 60, 80);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.rotateSpeed = 0.8;
    controls.zoomSpeed = 1.2;
    controls.maxDistance = 350;
    controls.minDistance = 10;
    controlsRef.current = controls;

    // Ambient & Directional Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x7c3aed, 1.4); // Subtle purple brand key light
    dirLight1.position.set(60, 100, 60);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x00e0ba, 1.2); // Mint rim light
    dirLight2.position.set(-60, -50, -60);
    scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0xffffff, 1.5, 200);
    pointLight.position.set(0, 50, 0);
    scene.add(pointLight);

    // Floor Grid
    const gridHelper = new THREE.GridHelper(90, 18, 0x334155, 0x1e293b);
    gridHelper.position.y = -36;
    gridHelperRef.current = gridHelper;
    scene.add(gridHelper);

    // Add layer groups
    scene.add(pointsGroupRef.current);
    scene.add(centroidsGroupRef.current);
    scene.add(trajectoriesGroupRef.current);
    scene.add(raysGroupRef.current);
    scene.add(hullsGroupRef.current);
    scene.add(queryGroupRef.current);

    // Render loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      if (controlsRef.current) {
        controlsRef.current.autoRotate = isAutoRotatingRef.current;
        controlsRef.current.autoRotateSpeed = 2.0;
        controlsRef.current.update();
      }
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // Resize Observer
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      container.innerHTML = '';
    };
  }, []);

  // Toggle Grid Visibility
  useEffect(() => {
    if (gridHelperRef.current) {
      gridHelperRef.current.visible = showGrid;
    }
  }, [showGrid]);

  // Update Data Points
  useEffect(() => {
    const pointsGroup = pointsGroupRef.current;
    pointsGroup.clear();

    if (!data || data.length === 0 || !features) return;

    const sphereGeo = new THREE.SphereGeometry(pointSize, 16, 16);
    const labels = currentSnapshot?.labels || [];

    data.forEach((row, idx) => {
      const coords = [row[features[0]] ?? 0, row[features[1]] ?? 0, row[features[2]] ?? 0];
      const [nx, ny, nz] = normalize(coords);
      const clusterId = labels[idx] !== undefined ? labels[idx] : -1;

      const isIsolated = isolatedCluster !== null;
      const belongsToIsolated = clusterId === isolatedCluster;
      const isSelected = selectedPointIndex === idx;

      const hexColor = getClusterColor(clusterId);
      const color = new THREE.Color(hexColor);

      const opacity = isIsolated
        ? belongsToIsolated ? 0.95 : 0.08
        : isSelected ? 1.0 : 0.85;

      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.25,
        metalness: 0.4,
        transparent: true,
        opacity,
        emissive: isSelected ? color : new THREE.Color(0x000000),
        emissiveIntensity: isSelected ? 0.8 : 0,
      });

      const mesh = new THREE.Mesh(sphereGeo, mat);
      mesh.position.set(nx, ny, nz);
      if (isSelected) mesh.scale.set(1.8, 1.8, 1.8);
      mesh.userData = {
        pointIndex: idx,
        clusterId,
        rawCoords: coords,
        distanceToCentroid: currentSnapshot?.pointDistances?.[idx] ?? 0,
      };

      pointsGroup.add(mesh);
    });
  }, [data, features, currentSnapshot, normalizationBounds, isolatedCluster, selectedPointIndex, pointSize]);

  // Update Centroids & Pulses
  useEffect(() => {
    const centroidsGroup = centroidsGroupRef.current;
    centroidsGroup.clear();

    const centroids = currentSnapshot?.centroids || [];

    centroids.forEach((centroid) => {
      if (isolatedCluster !== null && centroid.id !== isolatedCluster) return;

      const [nx, ny, nz] = normalize(centroid.coordinates);
      const color = new THREE.Color(centroid.color);

      // Centroid marker: Glowing 3D Diamond (Octahedron)
      const octGeo = new THREE.OctahedronGeometry(pointSize * 2.8, 0);
      const octMat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.1,
        metalness: 0.8,
        emissive: color,
        emissiveIntensity: 0.9,
      });

      const octMesh = new THREE.Mesh(octGeo, octMat);
      octMesh.position.set(nx, ny, nz);

      // Outer wireframe halo ring
      const ringGeo = new THREE.TorusGeometry(pointSize * 3.6, 0.2, 8, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color,
        wireframe: true,
        transparent: true,
        opacity: 0.85,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      octMesh.add(ringMesh);

      centroidsGroup.add(octMesh);
    });
  }, [currentSnapshot, normalizationBounds, isolatedCluster, pointSize]);

  // Update Centroid Trajectories (3D Trails across iterations)
  useEffect(() => {
    const trajectoriesGroup = trajectoriesGroupRef.current;
    trajectoriesGroup.clear();

    if (!showTrajectories || !allSnapshots || allSnapshots.length < 2) return;

    const numClusters = allSnapshots[0].centroids.length;

    for (let c = 0; c < numClusters; c++) {
      if (isolatedCluster !== null && c !== isolatedCluster) continue;

      const pathPoints: THREE.Vector3[] = [];
      const colorHex = getClusterColor(c);

      for (let iter = 0; iter <= currentIteration && iter < allSnapshots.length; iter++) {
        const snap = allSnapshots[iter];
        const centroid = snap.centroids[c];
        if (centroid) {
          const [nx, ny, nz] = normalize(centroid.coordinates);
          pathPoints.push(new THREE.Vector3(nx, ny, nz));
        }
      }

      if (pathPoints.length >= 2) {
        const curve = new THREE.CatmullRomCurve3(pathPoints, false, 'catmullrom', 0.1);
        const tubeGeo = new THREE.TubeGeometry(curve, pathPoints.length * 8, 0.4, 6, false);
        const tubeMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(colorHex),
          transparent: true,
          opacity: 0.85,
        });
        const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
        trajectoriesGroup.add(tubeMesh);

        // Small bead markers at each iteration step
        const stepGeo = new THREE.SphereGeometry(0.7, 8, 8);
        const stepMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(colorHex) });
        pathPoints.forEach((pt) => {
          const stepMesh = new THREE.Mesh(stepGeo, stepMat);
          stepMesh.position.copy(pt);
          trajectoriesGroup.add(stepMesh);
        });
      }
    }
  }, [showTrajectories, allSnapshots, currentIteration, normalizationBounds, isolatedCluster]);

  // Distance Rays (from Selected Point or Query Point to Centroids)
  useEffect(() => {
    const raysGroup = raysGroupRef.current;
    raysGroup.clear();

    if (!showDistanceRays || !currentSnapshot?.centroids) return;

    let targetNormalized: [number, number, number] | null = null;
    let targetRaw: number[] | null = null;

    if (queryPoint) {
      targetNormalized = queryPoint.coordinates;
      targetRaw = queryPoint.rawCoords;
    } else if (selectedPointIndex !== null && data[selectedPointIndex]) {
      const row = data[selectedPointIndex];
      targetRaw = [row[features[0]] ?? 0, row[features[1]] ?? 0, row[features[2]] ?? 0];
      targetNormalized = normalize(targetRaw);
    }

    if (!targetNormalized || !targetRaw) return;

    const origin = new THREE.Vector3(...targetNormalized);
    const centroids = currentSnapshot.centroids;

    // Find closest centroid
    let minDist = Infinity;
    let closestId = -1;

    centroids.forEach(c => {
      const d = euclideanDistance(targetRaw!, c.coordinates);
      if (d < minDist) {
        minDist = d;
        closestId = c.id;
      }
    });

    centroids.forEach((centroid) => {
      if (isolatedCluster !== null && centroid.id !== isolatedCluster) return;

      const [cx, cy, cz] = normalize(centroid.coordinates);
      const dest = new THREE.Vector3(cx, cy, cz);
      const isWinner = centroid.id === closestId;

      const points = [origin, dest];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: isWinner ? new THREE.Color(0x00e0ba) : new THREE.Color(0x64748b),
        linewidth: isWinner ? 3 : 1,
        transparent: true,
        opacity: isWinner ? 0.95 : 0.35,
      });

      const line = new THREE.Line(lineGeo, lineMat);
      raysGroup.add(line);
    });
  }, [showDistanceRays, selectedPointIndex, queryPoint, currentSnapshot, features, data, normalizationBounds, isolatedCluster]);

  // Update Prediction Explorer Query Marker
  useEffect(() => {
    const queryGroup = queryGroupRef.current;
    queryGroup.clear();

    if (!queryPoint) return;

    const [qx, qy, qz] = queryPoint.coordinates;

    // Bright glowing query sphere
    const queryGeo = new THREE.SphereGeometry(pointSize * 2.2, 24, 24);
    const queryMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffcf00,
      emissiveIntensity: 1.2,
      roughness: 0.1,
      metalness: 0.8,
    });
    const queryMesh = new THREE.Mesh(queryGeo, queryMat);
    queryMesh.position.set(qx, qy, qz);

    // Pulsing halo
    const haloGeo = new THREE.SphereGeometry(pointSize * 3.4, 16, 16);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xffcf00,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    queryMesh.add(haloMesh);

    queryGroup.add(queryMesh);
  }, [queryPoint, pointSize]);

  // Cluster Bounding Hulls / Spheres
  useEffect(() => {
    const hullsGroup = hullsGroupRef.current;
    hullsGroup.clear();

    if (!showHulls || !currentSnapshot?.centroids || !data) return;

    const centroids = currentSnapshot.centroids;
    const labels = currentSnapshot.labels || [];

    centroids.forEach((c) => {
      if (isolatedCluster !== null && c.id !== isolatedCluster) return;

      const assignedIndices: number[] = [];
      labels.forEach((lbl, idx) => {
        if (lbl === c.id) assignedIndices.push(idx);
      });

      if (assignedIndices.length === 0) return;

      const [cx, cy, cz] = normalize(c.coordinates);
      const centerVec = new THREE.Vector3(cx, cy, cz);

      // Calculate maximum distance to assigned point in normalized 3D space
      let maxRadius = 4;
      assignedIndices.forEach((idx) => {
        const row = data[idx];
        const [px, py, pz] = normalize([row[features[0]] ?? 0, row[features[1]] ?? 0, row[features[2]] ?? 0]);
        const dist = centerVec.distanceTo(new THREE.Vector3(px, py, pz));
        if (dist > maxRadius) maxRadius = dist;
      });

      const sphereGeo = new THREE.SphereGeometry(maxRadius * 1.05, 20, 20);
      const color = new THREE.Color(c.color);
      const sphereMat = new THREE.MeshBasicMaterial({
        color,
        wireframe: true,
        transparent: true,
        opacity: 0.18,
      });

      const hullMesh = new THREE.Mesh(sphereGeo, sphereMat);
      hullMesh.position.copy(centerVec);
      hullsGroup.add(hullMesh);
    });
  }, [showHulls, currentSnapshot, data, features, normalizationBounds, isolatedCluster]);

  // Raycasting for Hover & Click selection
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!mountRef.current || !cameraRef.current) return;
    const rect = mountRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    const intersects = raycaster.intersectObjects(pointsGroupRef.current.children);
    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const pointIdx = hit.userData.pointIndex;
      if (onSelectPoint) {
        onSelectPoint(pointIdx === selectedPointIndex ? null : pointIdx);
      }
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!mountRef.current || !cameraRef.current) return;
    const rect = mountRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    const intersects = raycaster.intersectObjects(pointsGroupRef.current.children);
    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const u = hit.userData;
      setHoveredPoint({
        id: u.pointIndex,
        cluster: u.clusterId,
        rawValues: u.rawCoords,
        distanceToCentroid: u.distanceToCentroid,
        screenX: event.clientX - rect.left,
        screenY: event.clientY - rect.top,
      });
    } else {
      setHoveredPoint(null);
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: '12px',
        overflow: 'hidden',
        background: '#06070a',
        border: '1px solid #1e293b',
      }}
    >
      <div
        ref={mountRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoveredPoint(null)}
        style={{ width: '100%', height: '100%', cursor: 'grab' }}
      />

      {/* Axis Badges overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          display: 'flex',
          gap: '8px',
          fontSize: '11px',
          fontFamily: 'monospace',
          pointerEvents: 'none',
        }}
      >
        <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(239,68,68,0.4)' }}>
          X: {features[0]}
        </span>
        <span style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(34,197,94,0.4)' }}>
          Y: {features[1]}
        </span>
        <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(59,130,246,0.4)' }}>
          Z: {features[2]}
        </span>
      </div>

      {/* Camera Controls Toolbar */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          display: 'flex',
          gap: '6px',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          padding: '4px 6px',
          borderRadius: '8px',
          border: '1px solid #334155',
        }}
      >
        <button
          onClick={() => {
            if (cameraRef.current && controlsRef.current) {
              cameraRef.current.position.set(70, 60, 80);
              controlsRef.current.target.set(0, 0, 0);
              controlsRef.current.update();
            }
          }}
          style={{
            background: '#1e293b',
            color: '#f8fafc',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '11px',
            cursor: 'pointer',
          }}
          title="Reset Camera View"
        >
          Reset
        </button>
        <button
          onClick={() => {
            if (cameraRef.current && controlsRef.current) {
              cameraRef.current.position.set(0, 110, 0);
              controlsRef.current.target.set(0, 0, 0);
              controlsRef.current.update();
            }
          }}
          style={{
            background: '#1e293b',
            color: '#f8fafc',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '11px',
            cursor: 'pointer',
          }}
          title="Top View (X-Z plane)"
        >
          Top
        </button>
        <button
          onClick={() => {
            if (cameraRef.current && controlsRef.current) {
              cameraRef.current.position.set(0, 0, 110);
              controlsRef.current.target.set(0, 0, 0);
              controlsRef.current.update();
            }
          }}
          style={{
            background: '#1e293b',
            color: '#f8fafc',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '11px',
            cursor: 'pointer',
          }}
          title="Front View (X-Y plane)"
        >
          Front
        </button>
        <button
          onClick={() => setIsAutoRotating(!isAutoRotating)}
          style={{
            background: isAutoRotating
              ? 'linear-gradient(135deg, #7c3aed, #ff3483)'
              : '#1e293b',
            color: '#ffffff',
            border: isAutoRotating ? '1px solid #ff3483' : '1px solid #334155',
            borderRadius: '4px',
            padding: '4px 10px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            transition: 'all 0.2s ease',
            boxShadow: isAutoRotating ? '0 0 10px rgba(255, 52, 131, 0.5)' : 'none',
          }}
          title="Toggle 3D Scene Auto-Rotation (360° Continuous Orbit)"
        >
          <span style={{ fontSize: '12px' }}>{isAutoRotating ? '🔄' : '↺'}</span>
          {isAutoRotating ? 'Auto-Rotate ON' : 'Auto-Rotate'}
        </button>
      </div>

      {/* Hover Tooltip in 3D */}
      {hoveredPoint && (
        <div
          style={{
            position: 'absolute',
            left: `${hoveredPoint.screenX + 14}px`,
            top: `${hoveredPoint.screenY - 14}px`,
            background: 'rgba(15, 23, 42, 0.95)',
            border: `1px solid ${getClusterColor(hoveredPoint.cluster)}`,
            borderRadius: '8px',
            padding: '8px 12px',
            color: '#f8fafc',
            fontSize: '12px',
            pointerEvents: 'none',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            zIndex: 30,
            backdropFilter: 'blur(8px)',
            minWidth: '150px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: getClusterColor(hoveredPoint.cluster),
              }}
            />
            <span style={{ fontWeight: 600 }}>
              Point #{hoveredPoint.id}
            </span>
            <span style={{ color: '#94a3b8', fontSize: '11px', marginLeft: 'auto' }}>
              Cluster {hoveredPoint.cluster >= 0 ? hoveredPoint.cluster : 'Unassigned'}
            </span>
          </div>
          <div style={{ color: '#cbd5e1', fontSize: '11px', lineHeight: '1.5' }}>
            <div>{features[0]}: <strong>{hoveredPoint.rawValues[0]}</strong></div>
            <div>{features[1]}: <strong>{hoveredPoint.rawValues[1]}</strong></div>
            <div>{features[2]}: <strong>{hoveredPoint.rawValues[2]}</strong></div>
            <div style={{ marginTop: '3px', color: '#38bdf8' }}>
              Dist to centroid: <strong>{hoveredPoint.distanceToCentroid.toFixed(3)}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
