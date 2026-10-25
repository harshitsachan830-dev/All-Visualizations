import { ColorPalette } from '../types/pca';

export interface PaletteDef {
  id: ColorPalette | 'aurora';
  name: string;
  clusterColors: Record<number, string>;
  labelColors: string[];
  densityScale: string; // Plotly colorscale name or custom array
  biplotVectorColor: string;
  centroidColor: string;
  accentGlow: string;
}

export const PALETTES: Record<string, PaletteDef> = {
  cyber: {
    id: 'cyber',
    name: 'Cyberpunk Neon',
    clusterColors: {
      0: '#00f5d4', // Vibrant Cyan / Mint
      1: '#ff007f', // Hot Neon Pink
      2: '#ffb703', // Bright Sunburst Gold
      3: '#8b5cf6', // Electric Purple
      4: '#3b82f6', // Vivid Blue
      5: '#10b981', // Emerald
      [-1]: '#64748b' // Translucent Slate Noise
    },
    labelColors: [
      '#00f5d4', '#ff007f', '#ffb703', '#8b5cf6', '#3b82f6', '#10b981', '#f43f5e', '#38bdf8'
    ],
    densityScale: 'Turbo',
    biplotVectorColor: '#f43f5e',
    centroidColor: '#ffffff',
    accentGlow: 'rgba(0, 245, 212, 0.4)'
  },
  scientific: {
    id: 'scientific',
    name: 'Scientific Viridis',
    clusterColors: {
      0: '#0284c7', // Deep Sky Blue
      1: '#ea580c', // Bright Rust Orange
      2: '#059669', // Deep Emerald
      3: '#7c3aed', // Royal Violet
      4: '#d97706', // Warm Amber
      5: '#e11d48', // Crimson Rose
      [-1]: '#94a3b8'
    },
    labelColors: [
      '#0284c7', '#ea580c', '#059669', '#7c3aed', '#d97706', '#e11d48', '#0891b2'
    ],
    densityScale: 'Viridis',
    biplotVectorColor: '#dc2626',
    centroidColor: '#0f172a',
    accentGlow: 'rgba(2, 132, 199, 0.35)'
  },
  warm: {
    id: 'warm',
    name: 'Sunset Plasma',
    clusterColors: {
      0: '#ff5e62', // Sunset Coral
      1: '#ff9966', // Fiery Orange
      2: '#ffd166', // Radiant Yellow
      3: '#ec4899', // Pink Flame
      4: '#8b5cf6', // Twilight Violet
      5: '#06b6d4', // Cyan Spark
      [-1]: '#78716c'
    },
    labelColors: [
      '#ff5e62', '#ff9966', '#ffd166', '#ec4899', '#8b5cf6', '#06b6d4', '#10b981'
    ],
    densityScale: 'Plasma',
    biplotVectorColor: '#e11d48',
    centroidColor: '#ffffff',
    accentGlow: 'rgba(255, 94, 98, 0.4)'
  },
  aurora: {
    id: 'aurora',
    name: 'Aurora Borealis',
    clusterColors: {
      0: '#00f2fe', // Electric Cyan
      1: '#4facfe', // Vibrant Cornflower
      2: '#43e97b', // Spring Green
      3: '#fa709a', // Rose Gold
      4: '#fee140', // Solar Amber
      5: '#38f9d7', // Aqua Mint
      [-1]: '#64748b'
    },
    labelColors: [
      '#00f2fe', '#4facfe', '#43e97b', '#fa709a', '#fee140', '#38f9d7', '#a18cd1'
    ],
    densityScale: 'Spectral',
    biplotVectorColor: '#ec4899',
    centroidColor: '#ffffff',
    accentGlow: 'rgba(0, 242, 254, 0.4)'
  }
};

export function getClusterColor(clusterId: number, paletteKey: string = 'cyber'): string {
  const p = PALETTES[paletteKey] || PALETTES.cyber;
  return p.clusterColors[clusterId] || p.labelColors[Math.abs(clusterId) % p.labelColors.length];
}

export function getPaletteDef(paletteKey: string = 'cyber'): PaletteDef {
  return PALETTES[paletteKey] || PALETTES.cyber;
}
