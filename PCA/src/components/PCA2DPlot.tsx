import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Eye,
  Sliders,
  Maximize2,
  Info,
  Target
} from 'lucide-react';
import { PCADataPoint, PCALoading, PCAResult } from '../types/pca';

interface PCA2DPlotProps {
  pcaResult: PCAResult;
  datasetName: string;
  selectedFeatures: string[];
}

const PALETTE = [
  '#00f0ff', // Neon Cyan
  '#ff007f', // Neon Magenta
  '#00ff88', // Neon Lime
  '#ffb700', // Gold
  '#a855f7', // Purple
  '#3b82f6', // Electric Blue
  '#f97316', // Orange
  '#ec4899', // Pink
  '#14b8a6', // Teal
];

export const PCA2DPlot: React.FC<PCA2DPlotProps> = ({
  pcaResult,
  datasetName,
  selectedFeatures
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Axis selection
  const [xAxisIndex, setXAxisIndex] = useState(0); // PC1
  const [yAxisIndex, setYAxisIndex] = useState(1); // PC2

  // Toggles
  const [showLoadings, setShowLoadings] = useState(true);
  const [showEllipses, setShowEllipses] = useState(true);
  const [pointRadius, setPointRadius] = useState(6);
  const [loadingScale, setLoadingScale] = useState(2.2);

  // Zoom and Pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Hover state
  const [hoveredPoint, setHoveredPoint] = useState<PCADataPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Map unique labels to colors
  const labelColorMap = useMemo(() => {
    const map = new Map<string, string>();
    let colorIdx = 0;
    for (const pt of pcaResult.transformedData) {
      if (!map.has(pt.label)) {
        map.set(pt.label, PALETTE[colorIdx % PALETTE.length]);
        colorIdx++;
      }
    }
    return map;
  }, [pcaResult]);

  // Compute data ranges for current chosen axes
  const dataRange = useMemo(() => {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const pt of pcaResult.transformedData) {
      const x = pt.coords[xAxisIndex] ?? 0;
      const y = pt.coords[yAxisIndex] ?? 0;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }

    const paddingX = Math.max((maxX - minX) * 0.15, 1);
    const paddingY = Math.max((maxY - minY) * 0.15, 1);

    return {
      minX: minX - paddingX,
      maxX: maxX + paddingX,
      minY: minY - paddingY,
      maxY: maxY + paddingY
    };
  }, [pcaResult, xAxisIndex, yAxisIndex]);

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI display
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear with obsidian black
    ctx.fillStyle = '#05070b';
    ctx.fillRect(0, 0, width, height);

    // Coordinate conversion functions
    const centerX = width / 2 + pan.x;
    const centerY = height / 2 + pan.y;

    const spanX = (dataRange.maxX - dataRange.minX) / 2;
    const spanY = (dataRange.maxY - dataRange.minY) / 2;
    const baseScale = Math.min(width, height) * 0.4;
    const scaleX = (baseScale / spanX) * zoom;
    const scaleY = (baseScale / spanY) * zoom;

    const toCanvasX = (val: number) => centerX + val * scaleX;
    const toCanvasY = (val: number) => centerY - val * scaleY; // Invert Y

    // 1. Draw subtle grid lines
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    const gridStep = Math.max(1, Math.pow(10, Math.floor(Math.log10(spanX))));

    for (let x = -gridStep * 10; x <= gridStep * 10; x += gridStep) {
      const cx = toCanvasX(x);
      if (cx >= 0 && cx <= width) {
        ctx.beginPath();
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx, height);
        ctx.stroke();
      }
    }

    for (let y = -gridStep * 10; y <= gridStep * 10; y += gridStep) {
      const cy = toCanvasY(y);
      if (cy >= 0 && cy <= height) {
        ctx.beginPath();
        ctx.moveTo(0, cy);
        ctx.lineTo(width, cy);
        ctx.stroke();
      }
    }

    // 2. Draw Principal Axes (Origin lines X=0 and Y=0)
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, toCanvasY(0));
    ctx.lineTo(width, toCanvasY(0));
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 0, 127, 0.25)';
    ctx.beginPath();
    ctx.moveTo(toCanvasX(0), 0);
    ctx.lineTo(toCanvasX(0), height);
    ctx.stroke();

    // 3. Draw Confidence Ellipses per cluster if enabled
    if (showEllipses && labelColorMap.size > 1) {
      labelColorMap.forEach((color, label) => {
        const clusterPts = pcaResult.transformedData.filter(p => p.label === label);
        if (clusterPts.length >= 3) {
          // Compute mean and covariance of cluster in 2D
          let mX = 0, mY = 0;
          for (const p of clusterPts) {
            mX += p.coords[xAxisIndex] || 0;
            mY += p.coords[yAxisIndex] || 0;
          }
          mX /= clusterPts.length;
          mY /= clusterPts.length;

          let sXX = 0, sYY = 0, sXY = 0;
          for (const p of clusterPts) {
            const dx = (p.coords[xAxisIndex] || 0) - mX;
            const dy = (p.coords[yAxisIndex] || 0) - mY;
            sXX += dx * dx;
            sYY += dy * dy;
            sXY += dx * dy;
          }
          sXX /= (clusterPts.length - 1);
          sYY /= (clusterPts.length - 1);
          sXY /= (clusterPts.length - 1);

          // Eigenvalues of 2x2 covariance
          const trace = sXX + sYY;
          const det = sXX * sYY - sXY * sXY;
          const disc = Math.sqrt(Math.max(0, trace * trace / 4 - det));
          const l1 = trace / 2 + disc;
          const l2 = trace / 2 - disc;

          // 95% confidence chi-square scale (approx 2.447 std)
          const radiusA = Math.sqrt(Math.max(0, l1)) * 2.2 * scaleX;
          const radiusB = Math.sqrt(Math.max(0, l2)) * 2.2 * scaleY;
          const angle = Math.atan2(l1 - sXX, sXY || 1e-6);

          ctx.save();
          ctx.translate(toCanvasX(mX), toCanvasY(mY));
          ctx.rotate(-angle);
          ctx.beginPath();
          ctx.ellipse(0, 0, Math.max(10, radiusA), Math.max(10, radiusB), 0, 0, Math.PI * 2);
          ctx.fillStyle = `${color}10`;
          ctx.fill();
          ctx.strokeStyle = `${color}40`;
          ctx.setLineDash([4, 4]);
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
        }
      });
    }

    // 4. Draw Data Points
    for (const pt of pcaResult.transformedData) {
      const px = toCanvasX(pt.coords[xAxisIndex] || 0);
      const py = toCanvasY(pt.coords[yAxisIndex] || 0);
      const color = labelColorMap.get(pt.label) || '#00f0ff';
      const isHovered = hoveredPoint?.id === pt.id;

      // Glow halo
      ctx.beginPath();
      ctx.arc(px, py, isHovered ? pointRadius * 2.2 : pointRadius * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = isHovered ? `${color}60` : `${color}25`;
      ctx.fill();

      // Main point
      ctx.beginPath();
      ctx.arc(px, py, isHovered ? pointRadius * 1.4 : pointRadius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = isHovered ? 2 : 1;
      ctx.stroke();
    }

    // 5. Draw Biplot Loading Vectors if enabled
    if (showLoadings && pcaResult.loadings.length > 0) {
      const origX = toCanvasX(0);
      const origY = toCanvasY(0);

      // Normalize maximum loading vector to visually fit comfortably in view
      const maxMagnitude = Math.max(...pcaResult.loadings.map(l => Math.hypot(l.vector[xAxisIndex] || 0, l.vector[yAxisIndex] || 0))) || 1;
      const arrowMultiplier = (baseScale * 0.7 * loadingScale) / maxMagnitude;

      for (let i = 0; i < pcaResult.loadings.length; i++) {
        const loading = pcaResult.loadings[i];
        const vX = loading.vector[xAxisIndex] || 0;
        const vY = loading.vector[yAxisIndex] || 0;

        const targetX = origX + vX * arrowMultiplier;
        const targetY = origY - vY * arrowMultiplier;

        // Draw arrow ray
        ctx.beginPath();
        ctx.moveTo(origX, origY);
        ctx.lineTo(targetX, targetY);
        ctx.strokeStyle = 'rgba(255, 207, 0, 0.85)'; // Neon Gold vector
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw arrowhead
        const angle = Math.atan2(targetY - origY, targetX - origX);
        const headLen = 10;
        ctx.beginPath();
        ctx.moveTo(targetX, targetY);
        ctx.lineTo(targetX - headLen * Math.cos(angle - Math.PI / 7), targetY - headLen * Math.sin(angle - Math.PI / 7));
        ctx.lineTo(targetX - headLen * Math.cos(angle + Math.PI / 7), targetY - headLen * Math.sin(angle + Math.PI / 7));
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 207, 0, 0.95)';
        ctx.fill();

        // Feature label badge
        ctx.fillStyle = '#ffffff';
        ctx.font = '600 11px Outfit, sans-serif';
        const labelText = loading.feature;
        const offsetX = Math.cos(angle) * 16;
        const offsetY = Math.sin(angle) * 16;

        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 4;
        ctx.fillText(labelText, targetX + offsetX - 10, targetY + offsetY + 4);
        ctx.shadowBlur = 0;
      }
    }
  }, [
    pcaResult,
    xAxisIndex,
    yAxisIndex,
    zoom,
    pan,
    pointRadius,
    showLoadings,
    showEllipses,
    loadingScale,
    hoveredPoint,
    dataRange,
    labelColorMap
  ]);

  // Mouse interactivity: Hover detection & Pan
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDragging) {
      setPan({
        x: mouseX - dragStart.x,
        y: mouseY - dragStart.y
      });
      return;
    }

    // Hover search: find nearest point within threshold
    const width = rect.width;
    const height = rect.height;
    const centerX = width / 2 + pan.x;
    const centerY = height / 2 + pan.y;
    const spanX = (dataRange.maxX - dataRange.minX) / 2;
    const spanY = (dataRange.maxY - dataRange.minY) / 2;
    const baseScale = Math.min(width, height) * 0.4;
    const scaleX = (baseScale / spanX) * zoom;
    const scaleY = (baseScale / spanY) * zoom;

    let closestPt: PCADataPoint | null = null;
    let minDistance = 15; // Hover snap radius (pixels)

    for (const pt of pcaResult.transformedData) {
      const px = centerX + (pt.coords[xAxisIndex] || 0) * scaleX;
      const py = centerY - (pt.coords[yAxisIndex] || 0) * scaleY;
      const dist = Math.hypot(px - mouseX, py - mouseY);
      if (dist < minDistance) {
        minDistance = dist;
        closestPt = pt;
      }
    }

    setHoveredPoint(closestPt);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - canvasRef.current!.getBoundingClientRect().left - pan.x,
      y: e.clientY - canvasRef.current!.getBoundingClientRect().top - pan.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    setZoom(prev => Math.min(Math.max(prev * zoomFactor, 0.2), 15));
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setHoveredPoint(null);
  };

  const exportImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `pca-2d-plot-${datasetName.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const xVar = ((pcaResult.explainedVariance[xAxisIndex] || 0) * 100).toFixed(2);
  const yVar = ((pcaResult.explainedVariance[yAxisIndex] || 0) * 100).toFixed(2);
  const combinedVar = (
    ((pcaResult.explainedVariance[xAxisIndex] || 0) + (pcaResult.explainedVariance[yAxisIndex] || 0)) *
    100
  ).toFixed(2);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top Controls Toolbar */}
      <div className="glass-panel" style={{ padding: '12px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        {/* Metric Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div>
            <span style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Dataset
            </span>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>
              {datasetName}
            </div>
          </div>

          <div style={{ width: 1, height: 28, background: 'var(--border-subtle)' }} />

          <div>
            <span style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Retained Variance (2D)
            </span>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--accent-cyan)' }}>
              {combinedVar}%
            </div>
          </div>

          <div style={{ width: 1, height: 28, background: 'var(--border-subtle)' }} />

          <div>
            <span style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Samples
            </span>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-lime)' }}>
              {pcaResult.transformedData.length} Points
            </div>
          </div>
        </div>

        {/* Axis Selectors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255, 255, 255, 0.03)', padding: '4px 10px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-cyan)' }}>X Axis:</span>
            <select
              value={xAxisIndex}
              onChange={(e) => setXAxisIndex(Number(e.target.value))}
              style={{ background: 'transparent', color: '#fff', border: 'none', outline: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              {pcaResult.eigenvalues.map((_, idx) => (
                <option key={idx} value={idx} style={{ background: '#0a0d14' }}>
                  PC{idx + 1} ({((pcaResult.explainedVariance[idx] || 0) * 100).toFixed(1)}%)
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255, 255, 255, 0.03)', padding: '4px 10px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-magenta)' }}>Y Axis:</span>
            <select
              value={yAxisIndex}
              onChange={(e) => setYAxisIndex(Number(e.target.value))}
              style={{ background: 'transparent', color: '#fff', border: 'none', outline: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              {pcaResult.eigenvalues.map((_, idx) => (
                <option key={idx} value={idx} style={{ background: '#0a0d14' }}>
                  PC{idx + 1} ({((pcaResult.explainedVariance[idx] || 0) * 100).toFixed(1)}%)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Feature Toggles & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setShowLoadings(!showLoadings)}
            className={`btn-secondary ${showLoadings ? 'btn-active' : ''}`}
            style={{ padding: '6px 12px', fontSize: 12 }}
            title="Toggle original feature loading arrows (Biplot vectors)"
          >
            <Sliders size={13} />
            <span>Biplot Vectors</span>
          </button>

          <button
            onClick={() => setShowEllipses(!showEllipses)}
            className={`btn-secondary ${showEllipses ? 'btn-active' : ''}`}
            style={{ padding: '6px 12px', fontSize: 12 }}
            title="Toggle 95% Confidence Ellipses around clusters"
          >
            <Eye size={13} />
            <span>Confidence Ellipses</span>
          </button>

          <button
            onClick={() => setZoom(prev => Math.min(prev * 1.25, 15))}
            className="btn-secondary"
            style={{ padding: '6px 8px' }}
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>

          <button
            onClick={() => setZoom(prev => Math.max(prev * 0.8, 0.2))}
            className="btn-secondary"
            style={{ padding: '6px 8px' }}
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>

          <button
            onClick={resetView}
            className="btn-secondary"
            style={{ padding: '6px 8px' }}
            title="Reset Pan & Zoom"
          >
            <RotateCcw size={14} />
          </button>

          <button
            onClick={exportImage}
            className="btn-primary"
            style={{ padding: '6px 12px', fontSize: 12 }}
            title="Export high-resolution PNG"
          >
            <Download size={13} />
            <span>PNG</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Container */}
      <div
        className="glass-panel"
        style={{
          position: 'relative',
          width: '100%',
          height: 620,
          overflow: 'hidden',
          borderRadius: 18,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          cursor: isDragging ? 'grabbing' : 'crosshair'
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            setIsDragging(false);
            setHoveredPoint(null);
          }}
          onWheel={handleWheel}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />

        {/* On-Canvas Axis Labels */}
        <div style={{
          position: 'absolute',
          bottom: 14,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(5, 7, 10, 0.85)',
          padding: '4px 14px',
          borderRadius: 20,
          border: '1px solid rgba(0, 240, 255, 0.3)',
          color: 'var(--accent-cyan)',
          fontSize: 12,
          fontWeight: 700,
          pointerEvents: 'none',
          boxShadow: '0 0 12px rgba(0, 240, 255, 0.2)'
        }}>
          PC{xAxisIndex + 1} Axis • {xVar}% Explained Variance
        </div>

        <div style={{
          position: 'absolute',
          left: 14,
          top: '50%',
          transform: 'translateY(-50%) rotate(-90deg)',
          transformOrigin: 'left top',
          background: 'rgba(5, 7, 10, 0.85)',
          padding: '4px 14px',
          borderRadius: 20,
          border: '1px solid rgba(255, 0, 127, 0.3)',
          color: 'var(--accent-magenta)',
          fontSize: 12,
          fontWeight: 700,
          pointerEvents: 'none',
          boxShadow: '0 0 12px rgba(255, 0, 127, 0.2)'
        }}>
          PC{yAxisIndex + 1} Axis • {yVar}% Explained Variance
        </div>

        {/* Cluster Color Legend */}
        <div style={{
          position: 'absolute',
          top: 14,
          right: 14,
          background: 'rgba(10, 14, 22, 0.88)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 12,
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          pointerEvents: 'none',
          maxWidth: 240
        }}>
          <span style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Classes / Clusters
          </span>
          {Array.from(labelColorMap.entries()).map(([label, color]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Floating Tooltip */}
        {hoveredPoint && (
          <div
            style={{
              position: 'fixed',
              left: Math.min(tooltipPos.x + 16, window.innerWidth - 320),
              top: Math.min(tooltipPos.y + 16, window.innerHeight - 260),
              background: 'rgba(12, 16, 26, 0.95)',
              backdropFilter: 'blur(16px)',
              border: '1px solid var(--accent-cyan)',
              borderRadius: 12,
              padding: '12px 16px',
              color: '#ffffff',
              boxShadow: '0 0 24px rgba(0, 240, 255, 0.35)',
              zIndex: 1000,
              pointerEvents: 'none',
              maxWidth: 300
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent-cyan)' }}>
                Sample #{hoveredPoint.id + 1}
              </span>
              <span className="badge" style={{
                background: `${labelColorMap.get(hoveredPoint.label)}20`,
                color: labelColorMap.get(hoveredPoint.label),
                borderColor: `${labelColorMap.get(hoveredPoint.label)}40`
              }}>
                {hoveredPoint.label}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>PC{xAxisIndex + 1}:</span>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-cyan)' }}>
                  {(hoveredPoint.coords[xAxisIndex] || 0).toFixed(4)}
                </div>
              </div>
              <div>
                <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>PC{yAxisIndex + 1}:</span>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-magenta)' }}>
                  {(hoveredPoint.coords[yAxisIndex] || 0).toFixed(4)}
                </div>
              </div>
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              <span style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Original Features:</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4 }}>
                {Object.entries(hoveredPoint.original).slice(0, 5).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ color: 'var(--text-muted)' }}>{k}:</span>
                    <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{Number(v).toFixed(2)}</span>
                  </div>
                ))}
                {Object.keys(hoveredPoint.original).length > 5 && (
                  <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                    + {Object.keys(hoveredPoint.original).length - 5} more features...
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
