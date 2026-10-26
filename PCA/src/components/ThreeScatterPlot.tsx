import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Centroid3D,
  getClusterColor,
  IterationSnapshot,
  euclideanDistance,
} from '../utils/kmeans';

// Helper to create camera-facing billboard text sprite badges in 3D WebGL
function createTextSprite(
  text: string,
  color: string = '#ffffff',
  bgColor: string = 'rgba(15, 23, 42, 0.92)',
  borderColor: string = '#7c3aed'
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 340;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 340, 96);
    ctx.fillStyle = bgColor;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 4;
    const x = 8, y = 8, w = 324, h = 80, r = 18;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 30px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 170, 48);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(16, 4.6, 1);
  return sprite;
}

export interface ThreeScatterPlotProps {
  data: Record<string, number>[];
  features: [string, string, string]; // [X, Y, Z]
  varianceRatios?: [number, number, number];
  showAxes?: boolean;
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
  showCentroids?: boolean;
  showGrid?: boolean;
  pointSize?: number;
  height?: string | number;
  defaultAutoRotate?: boolean;
  autoRotateSpeed?: number;
  clusterNames?: string[];
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
    showCentroids = true,
    showGrid = true,
    showAxes = true,
    varianceRatios,
    pointSize = 1.6,
    height = '100%',
    defaultAutoRotate = false,
    autoRotateSpeed = 2.0,
    clusterNames = [],
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
  const axesGroupRef = useRef<THREE.Group>(new THREE.Group());
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
    scene.add(axesGroupRef.current);
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

  // 3D Principal Component Axis Beams & Floating 3D Text Badges (+PC1, +PC2, +PC3)
  useEffect(() => {
    const axesGroup = axesGroupRef.current;
    axesGroup.clear();

    if (!showAxes) return;

    const axisLength = 40;
    const p1Var = varianceRatios?.[0] ? ` (${(varianceRatios[0] * 100).toFixed(1)}%)` : '';
    const p2Var = varianceRatios?.[1] ? ` (${(varianceRatios[1] * 100).toFixed(1)}%)` : '';
    const p3Var = varianceRatios?.[2] ? ` (${(varianceRatios[2] * 100).toFixed(1)}%)` : '';

    const axDefs = [
      {
        shortLabel: `${features[0] || 'PC1'}${p1Var} [X-Axis]`,
        dir: new THREE.Vector3(1, 0, 0),
        color: '#f87171',
        hex: 0xef4444,
        bg: 'rgba(35, 12, 18, 0.94)',
        border: '#ef4444'
      },
      {
        shortLabel: `${features[1] || 'PC2'}${p2Var} [Y-Axis]`,
        dir: new THREE.Vector3(0, 1, 0),
        color: '#4ade80',
        hex: 0x22c55e,
        bg: 'rgba(12, 35, 22, 0.94)',
        border: '#22c55e'
      },
      {
        shortLabel: `${features[2] || 'PC3'}${p3Var} [Z-Axis]`,
        dir: new THREE.Vector3(0, 0, 1),
        color: '#60a5fa',
        hex: 0x3b82f6,
        bg: 'rgba(14, 25, 48, 0.94)',
        border: '#3b82f6'
      },
    ];

    axDefs.forEach(ax => {
      // Full axis line from negative to positive
      const pts = [
        ax.dir.clone().multiplyScalar(-axisLength * 0.9),
        ax.dir.clone().multiplyScalar(axisLength)
      ];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const lineMat = new THREE.LineBasicMaterial({
        color: ax.hex,
        linewidth: 2,
        transparent: true,
        opacity: 0.55,
      });
      const line = new THREE.Line(lineGeo, lineMat);
      axesGroup.add(line);

      // Glowing Arrow Cone at the positive tip
      const coneGeo = new THREE.ConeGeometry(1.2, 3.4, 16);
      const coneMat = new THREE.MeshStandardMaterial({
        color: ax.hex,
        emissive: ax.hex,
        emissiveIntensity: 0.8,
        roughness: 0.2,
      });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.copy(ax.dir.clone().multiplyScalar(axisLength));
      cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), ax.dir);
      axesGroup.add(cone);

      // Billboard Text Sprite Label right at the arrow tip
      const sprite = createTextSprite(
        ax.shortLabel,
        ax.color,
        ax.bg,
        ax.border
      );
      sprite.position.copy(ax.dir.clone().multiplyScalar(axisLength + 6));
      axesGroup.add(sprite);
    });
  }, [features, varianceRatios, showAxes]);

  // Update Centroids & Pulses
  useEffect(() => {
    const centroidsGroup = centroidsGroupRef.current;
    centroidsGroup.clear();

    if (!showCentroids) return;
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

      // Floating Centroid Name Badge in 3D: "Cluster 0", "Cluster 1", etc.
      const labelSprite = createTextSprite(
        clusterNames[centroid.id] || `Cluster ${centroid.id}`,
        centroid.color,
        'rgba(15, 23, 42, 0.92)',
        centroid.color
      );
      labelSprite.position.set(nx, ny + pointSize * 4.6, nz);
      labelSprite.scale.set(13, 3.8, 1);
      centroidsGroup.add(labelSprite);

      centroidsGroup.add(octMesh);
    });
  }, [currentSnapshot, normalizationBounds, isolatedCluster, pointSize, showCentroids, clusterNames]);

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
          bottom: '14px',
          left: '14px',
          display: 'flex',
          gap: '10px',
          fontSize: '11px',
          fontWeight: 700,
          pointerEvents: 'none',
          zIndex: 10,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(239, 68, 68, 0.22)', color: '#f87171', padding: '5px 12px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.5)', backdropFilter: 'blur(8px)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
          X-Axis: {features[0]} {varianceRatios?.[0] ? `(${(varianceRatios[0] * 100).toFixed(1)}%)` : ''}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(34, 197, 94, 0.22)', color: '#4ade80', padding: '5px 12px', borderRadius: '6px', border: '1px solid rgba(34,197,94,0.5)', backdropFilter: 'blur(8px)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
          Y-Axis: {features[1]} {varianceRatios?.[1] ? `(${(varianceRatios[1] * 100).toFixed(1)}%)` : ''}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(59, 130, 246, 0.22)', color: '#60a5fa', padding: '5px 12px', borderRadius: '6px', border: '1px solid rgba(59,130,246,0.5)', backdropFilter: 'blur(8px)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} />
          Z-Axis: {features[2]} {varianceRatios?.[2] ? `(${(varianceRatios[2] * 100).toFixed(1)}%)` : ''}
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
              {clusterNames[hoveredPoint.cluster] || (hoveredPoint.cluster >= 0 ? `Cluster ${hoveredPoint.cluster}` : 'Noise')}
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
