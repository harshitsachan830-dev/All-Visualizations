import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { Flower, TrainedForest, TrainedRegressionForest, TreeNode } from "./model";

type Props = {
  rows: Flower[]; names: string[]; labels: string[]; forest: TrainedForest;
  mode?: "surface" | "scatter" | "vote" | "trees" | "pdp" | "tree" | "importance" | "regression-surface" | "regression-scatter";
  axes?: number[]; selectedClass?: number; selectedId?: number;
  treeIndex?: number; dark?: boolean; compact?: boolean;
  regressionForest?: TrainedRegressionForest;
};

const PALETTE = ["#2378df", "#20a665", "#f17b13", "#9258d6", "#e44848", "#11a9ad"];
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Real WebGL feature-space and tree plots. Drag to orbit; wheel/pinch to zoom. */
export function ThreeVisualization({ rows, names, labels, forest, regressionForest, mode = "scatter", axes = [0, 1, 2], selectedClass = 0, selectedId, treeIndex = 0, dark = false, compact = false }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const resetRef = useRef<() => void>(() => {});
  const zoomRef = useRef<(direction: number) => void>(() => {});
  const xi = clamp(axes[0] ?? 0, 0, Math.max(0, names.length - 1));
  const yi = clamp(axes[1] ?? Math.min(1, names.length - 1), 0, Math.max(0, names.length - 1));
  const zi = Math.max(0, axes[2] ?? Math.min(2, names.length - 1));

  useEffect(() => {
    const element = host.current;
    if (!element || !rows.length) return;
    const width = Math.max(240, element.clientWidth), height = Math.max(240, element.clientHeight);
    const scene = new THREE.Scene();
    const background = dark ? 0x101a2a : 0xf5f8ff;
    scene.background = new THREE.Color(background);
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 200);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(background, 1);
    element.prepend(renderer.domElement);
    const tooltip = document.createElement("div");
    tooltip.className = "three-hover-info";
    tooltip.hidden = true;
    element.append(tooltip);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.minDistance = 3.2;
    controls.maxDistance = 28;
    controls.target.set(0, 0, 0);
    let fitTarget = new THREE.Vector3(0, 0, 0);
    let fitPosition = new THREE.Vector3(5.8, 4.8, 7.2);

    scene.add(new THREE.HemisphereLight(dark ? 0xc5d8ff : 0xffffff, dark ? 0x223047 : 0x667085, 2.1));
    const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(5, 8, 7); scene.add(key);
    const grid = new THREE.GridHelper(4, 10, dark ? 0x52627c : 0x8293aa, dark ? 0x35445c : 0xd5deec);
    grid.position.y = -1.55; scene.add(grid);
    const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(4, 3.2, 4)), new THREE.LineBasicMaterial({ color: dark ? 0x64748b : 0x8393a8, transparent: true, opacity: 0.55 }));
    box.position.y = 0; scene.add(box);

    const featureRange = (index: number): [number, number] => {
      const values = rows.map(r => r.features[index] ?? 0);
      const lo = Math.min(...values), hi = Math.max(...values);
      return [lo, hi === lo ? lo + 1 : hi];
    };
    const idValues = rows.map(row => row.id), minId = Math.min(...idValues), maxId = Math.max(...idValues);
    const ranges = [featureRange(xi), featureRange(yi), zi >= names.length ? [minId, maxId === minId ? minId + 1 : maxId] as [number, number] : featureRange(zi)];
    const coord = (v: number, axis: number) => ((v - ranges[axis]![0]) / (ranges[axis]![1] - ranges[axis]![0]) - .5) * 3.6;
    const point = (r: Flower) => new THREE.Vector3(coord(r.features[xi] ?? 0, 0), coord(r.features[yi] ?? 0, 1), coord(zi >= names.length ? r.id : r.features[zi] ?? 0, 2));
    const baseFeatures = names.map((_, i) => rows.reduce((s, r) => s + (r.features[i] ?? 0), 0) / rows.length);
    const predicts = (features: number[]) => forest.predictEach({ id: -1, features, label: labels[0] ?? "" });

    if (mode === "importance") {
      const importance=(regressionForest?.importance??forest.importance).slice(0,names.length),maximum=Math.max(1e-8,...importance);
      const columns=Math.max(1,Math.ceil(Math.sqrt(importance.length))),rowCount=Math.max(1,Math.ceil(importance.length/columns));
      importance.forEach((value, index) => {
        const h = Math.max(.04, value / maximum * 2.2),column=index%columns,row=Math.floor(index/columns);
        const material = new THREE.MeshStandardMaterial({ color: PALETTE[index % PALETTE.length], roughness: .36, metalness: .12, emissive: PALETTE[index % PALETTE.length], emissiveIntensity: .08 });
        const bar = new THREE.Mesh(new THREE.BoxGeometry(Math.min(.42,2.7/columns*.62), h, Math.min(.42,2.7/rowCount*.62)), material);
        const x=columns===1?0:-1.45+column*2.9/(columns-1),z=rowCount===1?0:-1.35+row*2.7/(rowCount-1);
        bar.position.set(x, -1.55 + h / 2, z);
        bar.userData.featureName = names[index]; scene.add(bar);
      });
    } else if (mode === "tree") {
      const root = regressionForest?.trees[treeIndex] ?? regressionForest?.trees[0] ?? forest.trees[treeIndex] ?? forest.trees[0];
      if (root) {
        type Item = { node: TreeNode; path: string; depth: number; x: number; z: number };
        const items: Item[] = [];
        const countLeaves = (n: TreeNode): number => n.left || n.right ? (n.left ? countLeaves(n.left) : 0) + (n.right ? countLeaves(n.right) : 0) : 1;
        const walk = (node: TreeNode, path: string, depth: number, start: number, end: number) => {
          const x = (start + end) / 2, z = ((path.split("").reduce((s,c)=>s+(c==="R"?1:-1),0)) * .12);
          items.push({ node, path, depth, x, z });
          const leftLeaves = node.left ? countLeaves(node.left) : 0, total = Math.max(1, leftLeaves + (node.right ? countLeaves(node.right) : 0));
          const mid = start + (end - start) * leftLeaves / total;
          if (node.left) walk(node.left, path + "L", depth + 1, start, mid);
          if (node.right) walk(node.right, path + "R", depth + 1, mid, end);
        };
        walk(root, "", 0, -1.8, 1.8);
        const depth = Math.max(1, ...items.map(item => item.depth));
        fitTarget = new THREE.Vector3(0, 1.35 - depth * .31, 0);
        fitPosition = fitTarget.clone().add(new THREE.Vector3(0, Math.max(2.8, depth * .28), Math.max(8, depth * .8)));
        const itemMap = new Map(items.map(i => [i.path, i]));
        const linePoints: THREE.Vector3[] = [];
        for (const item of items) for (const side of ["L", "R"]) {
          const child = itemMap.get(item.path + side); if (!child) continue;
          linePoints.push(new THREE.Vector3(item.x, 1.35 - item.depth * .62, item.z), new THREE.Vector3(child.x, 1.35 - child.depth * .62, child.z));
        }
        const linkGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
        scene.add(new THREE.LineSegments(linkGeometry, new THREE.LineBasicMaterial({ color: dark ? 0xa5b4fc : 0x62748e, transparent: true, opacity: .8 })));
        const sphere = new THREE.SphereGeometry(.09, 16, 12);
        for (const item of items) {
          const leaf = !item.node.left && !item.node.right;
          const distribution = item.node.distribution;
          const counts = Array.isArray(distribution) ? distribution[0] ?? [] : typeof distribution === "number" ? [] : distribution?.getRow(0) ?? [];
          const klass = Math.max(0, counts.indexOf(Math.max(0, ...counts)));
          const regressionValue = typeof distribution === "number" ? distribution : null;
          const leafColor = regressionValue === null ? PALETTE[klass % PALETTE.length]! : new THREE.Color().setHSL(.68 - .65 * clamp(regressionValue / Math.max(1, ...rows.map(row => Number(row.label))), 0, 1), .82, .48);
          const material = new THREE.MeshStandardMaterial({ color: leaf ? leafColor : (dark ? 0x7986ff : 0x6857ed), roughness: .4, metalness: .08, emissive: leaf ? 0x000000 : 0x171044, emissiveIntensity: .12 });
          const mesh = new THREE.Mesh(sphere, material);
          mesh.position.set(item.x, 1.35 - item.depth * .62, item.z); mesh.userData = { path: item.path, rule: leaf ? (regressionValue === null ? labels[klass] ?? `Class ${klass + 1}` : `Predicted ${regressionValue.toFixed(2)}`) : `${names[item.node.splitColumn ?? 0] ?? "Feature"} ≤ ${(item.node.splitValue ?? 0).toFixed(2)}`, samples: item.node.numberSamples ?? 0 };
          scene.add(mesh);
        }
        // Node positions and branch geometry are real 3D; orbit and zoom reveal dense levels.
      }
    } else if (mode === "scatter" || mode === "regression-scatter") {
      const targetNumbers=rows.map(row=>Number(row.label)), targetMin=Math.min(...targetNumbers), targetMax=Math.max(...targetNumbers);
      const chosen = rows.length > 1600 ? rows.filter((_, i) => i % Math.ceil(rows.length / 1600) === 0) : rows;
      for (const row of chosen) {
        const classColor=PALETTE[Math.max(0, labels.indexOf(row.label)) % PALETTE.length];
        const pointColor=mode==="regression-scatter"?new THREE.Color().setHSL(.68-.65*((Number(row.label)-targetMin)/(targetMax-targetMin||1)),.82,.48):new THREE.Color(classColor);
        const material = new THREE.MeshStandardMaterial({ color: pointColor, roughness: .34, metalness: .03, emissive: pointColor, emissiveIntensity: row.id === selectedId ? .4 : .08 });
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(row.id === selectedId ? .075 : .047, 10, 8), material);
        mesh.position.copy(point(row)); mesh.userData.row = row; scene.add(mesh);
      }
    } else if(mode==="regression-surface"&&regressionForest){
      const n=24,positions:number[]=[],colors:number[]=[],indices:number[]=[];
      const predictions=rows.map(row=>regressionForest.predict(row)), min=Math.min(...predictions),max=Math.max(...predictions);
      for(let iy=0;iy<=n;iy++)for(let ix=0;ix<=n;ix++){
        const f=[...baseFeatures]; f[xi]=ranges[0]![0]+ix/n*(ranges[0]![1]-ranges[0]![0]);f[yi]=ranges[1]![0]+iy/n*(ranges[1]![1]-ranges[1]![0]);
        const value=regressionForest.predict({id:-1,features:f,label:"0"});const normalized=(value-min)/(max-min||1);const shade=new THREE.Color().setHSL(.68-.65*normalized,.84,.48);
        positions.push(coord(f[xi]??0,0),(normalized-.5)*2.5,coord(f[yi]??0,1));colors.push(shade.r,shade.g,shade.b);
      }
      for(let y=0;y<n;y++)for(let x=0;x<n;x++){const a=y*(n+1)+x,b=a+1,c=a+n+1,d=c+1;indices.push(a,c,b,b,c,d);}
      const geometry=new THREE.BufferGeometry();geometry.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute("color",new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
      scene.add(new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,transparent:true,opacity:.86,roughness:.45})));
    } else {
      const n = 24, positions: number[] = [], colors: number[] = [], indices: number[] = [];
      const sample = rows.filter((_, i) => i % Math.max(1, Math.floor(rows.length / 16)) === 0).slice(0, 16);
      for (let iy = 0; iy <= n; iy++) for (let ix = 0; ix <= n; ix++) {
        const f = [...baseFeatures];
        f[xi] = ranges[0]![0] + ix / n * (ranges[0]![1] - ranges[0]![0]);
        f[yi] = ranges[1]![0] + iy / n * (ranges[1]![1] - ranges[1]![0]);
        const votes = predicts(f), shares = labels.map(l => votes.filter(v => v === l).length / Math.max(1, votes.length));
        const cls = shares.indexOf(Math.max(...shares));
        let y = (cls / Math.max(1, labels.length - 1) - .5) * 1.15;
        let shade = new THREE.Color(PALETTE[cls % PALETTE.length]);
        if (mode === "vote" || mode === "pdp") {
          let value = shares[selectedClass] ?? 0;
          if (mode === "pdp") value = sample.reduce((s, row) => { const vals = [...row.features]; vals[xi] = f[xi]!; vals[yi] = f[yi]!; const v = predicts(vals); return s + v.filter(x => x === labels[selectedClass]).length / Math.max(1, v.length); }, 0) / Math.max(1, sample.length);
          y = (value - .5) * 2.5; shade.setHSL(.72 - value * .68, .86, .47);
        } else if (mode === "trees") {
          const ids = [0, Math.floor(forest.trees.length / 2), forest.trees.length - 1];
          const agreements = ids.filter(id => forest.predictTree(id, { id: -1, features: f, label: labels[0] ?? "" }) === labels[cls]).length / ids.length;
          y = (agreements - .5) * 1.7;
        }
        positions.push(coord(f[xi] ?? 0, 0), y, coord(f[yi] ?? 0, 1));
        colors.push(shade.r, shade.g, shade.b);
      }
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const a = y * (n + 1) + x, b = a + 1, c = a + n + 1, d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
      const geometry = new THREE.BufferGeometry(); geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: mode === "surface" ? .83 : .76, roughness: .48, metalness: .02 })); scene.add(mesh);
      if (mode === "surface") for (const row of rows.filter((_, i) => i % Math.max(1, Math.floor(rows.length / 600)) === 0)) {
        const p = new THREE.Vector3(coord(row.features[xi] ?? 0, 0), (labels.indexOf(row.label) / Math.max(1, labels.length - 1) - .5) * 1.15 + .035, coord(row.features[yi] ?? 0, 1));
        const dot = new THREE.Mesh(new THREE.SphereGeometry(.035, 8, 6), new THREE.MeshBasicMaterial({ color: PALETTE[Math.max(0, labels.indexOf(row.label)) % PALETTE.length] })); dot.position.copy(p); scene.add(dot);
      }
    }

    const fit = () => { camera.position.copy(fitPosition); controls.target.copy(fitTarget); controls.update(); };
    fit();
    resetRef.current = fit;
    zoomRef.current = direction => { const offset = camera.position.clone().sub(controls.target); offset.multiplyScalar(direction > 0 ? .82 : 1.22); camera.position.copy(controls.target).add(offset); controls.update(); };
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onPointerMove = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(scene.children, false).find(item => item.object.userData.rule || item.object.userData.row);
      if (!hit) { tooltip.hidden = true; return; }
      const data = hit.object.userData;
      const row = data.row as Flower | undefined;
      tooltip.textContent = row ? `${row.label} · ${names[xi]} ${Number(row.features[xi]).toPrecision(4)} · ${names[yi]} ${Number(row.features[yi]).toPrecision(4)} · ${zi >= names.length ? `Sample ${row.id + 1}` : `${names[zi]} ${Number(row.features[zi]).toPrecision(4)}`}` : `${data.rule}${data.samples ? ` · ${data.samples} samples` : ""}`;
      tooltip.hidden = false;
      tooltip.style.left = `${Math.min(event.clientX - rect.left + 12, rect.width - 220)}px`;
      tooltip.style.top = `${Math.max(8, event.clientY - rect.top - 34)}px`;
    };
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerleave", () => { tooltip.hidden = true; });
    let frame = 0;
    const render = () => { frame = requestAnimationFrame(render); controls.update(); renderer.render(scene, camera); };
    render();
    const resize = new ResizeObserver(() => { const w = Math.max(240, element.clientWidth), h = Math.max(240, element.clientHeight); camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h); });
    resize.observe(element);
    return () => { cancelAnimationFrame(frame); resize.disconnect(); controls.dispose(); renderer.domElement.removeEventListener("pointermove", onPointerMove); tooltip.remove(); scene.traverse(obj => { if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) { obj.geometry.dispose(); const mat = obj.material; if (Array.isArray(mat)) mat.forEach(m => m.dispose()); else mat.dispose(); } }); renderer.dispose(); renderer.domElement.remove(); };
  }, [rows, names, labels, forest, regressionForest, mode, xi, yi, zi, selectedClass, selectedId, treeIndex, dark]);

  return <div className={`three-plot ${compact ? "is-compact" : ""}`} ref={host}>
    <div className="three-toolbar"><button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => zoomRef.current(-1)}>−</button><button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => zoomRef.current(1)}>+</button><button type="button" onClick={() => resetRef.current()}>Fit / reset</button></div>
    <div className="three-hint">Drag to rotate · scroll or buttons to zoom</div>
    <div className="three-axis-labels"><span>{mode === "importance" ? "X · Feature index" : mode === "tree" ? "X · Branch position" : `X · ${names[xi] ?? "Feature 1"}`}</span><span>Y · {mode === "tree" ? "Tree depth" : mode === "importance" ? "Impurity importance" : mode === "scatter" ? names[yi] ?? "Feature 2" : mode === "regression-scatter" ? "Feature" : mode === "regression-surface" ? "Predicted target" : mode === "vote" || mode === "pdp" ? `${labels[selectedClass] ?? "Class"} vote share` : mode === "trees" ? "Tree agreement" : "Predicted class"}</span><span>Z · {mode === "tree" ? "Branch spread" : mode === "importance" ? "Features" : mode === "scatter" || mode === "regression-scatter" ? names[zi] ?? "Sample index" : names[yi] ?? "Feature 2"}</span></div>
  </div>;
}
