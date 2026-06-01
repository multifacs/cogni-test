import type { ColorKind, RegionKind, ShapeKind, TextureKind } from '../types';

export const SHAPES: ShapeKind[] = [
  'circle',
  'square',
  'triangle',
  'diamond',
  'pentagon',
  'hexagon',
  'star4',
  'plus',
  'cross'
];

export const SIMPLE_SHAPES: ShapeKind[] = ['circle', 'square', 'triangle', 'diamond', 'pentagon', 'hexagon'];
export const MARKER_SHAPES: ShapeKind[] = ['circle', 'square', 'triangle', 'diamond', 'star4'];

export const CONTEXTS = ['circleFrame', 'squareFrame', 'diagonals', 'cornerDots', 'axes', 'sideDots'] as const;
export type ContextKind = (typeof CONTEXTS)[number];

export const REGIONS: RegionKind[] = [
  'leftHalf',
  'rightHalf',
  'topHalf',
  'bottomHalf',
  'topLeftQuadrant',
  'topRightQuadrant',
  'bottomLeftQuadrant',
  'bottomRightQuadrant',
  'center'
];

export const BASIC_REGIONS: RegionKind[] = ['leftHalf', 'rightHalf', 'topHalf', 'bottomHalf', 'center'];

export const TEXTURES: TextureKind[] = [
  'solidBlack',
  'lightGray',
  'darkGray',
  'diagonalHatchA',
  'diagonalHatchB',
  'verticalStripes',
  'horizontalStripes',
  'dotFill',
  'checker'
];

export const PATTERN_TEXTURES: TextureKind[] = ['verticalStripes', 'horizontalStripes', 'diagonalHatchA', 'diagonalHatchB', 'dotFill', 'checker'];

export const GRID_SLOTS = ['tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br'] as const;
export type GridSlot = (typeof GRID_SLOTS)[number];

export const GRID_2X2_SLOTS: GridSlot[] = ['tl', 'tr', 'bl', 'br'];

export const GRID_POINTS: Record<GridSlot, [number, number]> = {
  tl: [26, 26],
  tc: [50, 26],
  tr: [74, 26],
  ml: [26, 50],
  mc: [50, 50],
  mr: [74, 50],
  bl: [26, 74],
  bc: [50, 74],
  br: [74, 74]
};

export const RADIAL_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315] as const;
export const RADIAL_4_ANGLES = [0, 90, 180, 270] as const;

export const OBJECT_COLORS: Record<ColorKind, string> = {
  navy: '#172033',
  blue: '#2563eb',
  teal: '#0f766e',
  orange: '#b45309',
  purple: '#7c3aed',
  red: '#be123c'
};

export const COLOR_KEYS: ColorKind[] = ['navy', 'blue', 'teal', 'orange', 'purple', 'red'];
