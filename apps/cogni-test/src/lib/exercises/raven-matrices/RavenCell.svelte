<script lang="ts">
  import type { CellElement, CellSpec, RegionKind, ShapeKind, TextureKind } from './types';

  export let cell: CellSpec | null = null;
  export let missing = false;
  export let cellId = 'raven-cell';
  export let compact = false;

  function shapePoints(shape: ShapeKind, cx: number, cy: number, size: number): string {
    const r = size / 2;
    if (shape === 'triangle') return `${cx},${cy - r} ${cx - r},${cy + r * 0.78} ${cx + r},${cy + r * 0.78}`;
    if (shape === 'diamond') return `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`;
    if (shape === 'pentagon') return regularPolygon(cx, cy, r, 5, -90);
    if (shape === 'hexagon') return regularPolygon(cx, cy, r, 6, 30);
    if (shape === 'star4') return starPolygon(cx, cy, r, r * 0.42, 4, -45);
    if (shape === 'star5') return starPolygon(cx, cy, r, r * 0.42, 5, -90);
    if (shape === 'plus') return plusPolygon(cx, cy, size, false);
    if (shape === 'cross') return plusPolygon(cx, cy, size, true);
    return '';
  }

  function regularPolygon(cx: number, cy: number, r: number, n: number, startDeg: number) {
    return Array.from({ length: n }, (_, i) => {
      const a = ((startDeg + (360 / n) * i) * Math.PI) / 180;
      return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
    }).join(' ');
  }

  function starPolygon(cx: number, cy: number, r1: number, r2: number, n: number, startDeg: number) {
    return Array.from({ length: n * 2 }, (_, i) => {
      const a = ((startDeg + (360 / (n * 2)) * i) * Math.PI) / 180;
      const r = i % 2 === 0 ? r1 : r2;
      return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
    }).join(' ');
  }

  function plusPolygon(cx: number, cy: number, size: number, rotate: boolean) {
    const a = size / 2;
    const b = size / 6;
    const pts = [
      [cx - b, cy - a],
      [cx + b, cy - a],
      [cx + b, cy - b],
      [cx + a, cy - b],
      [cx + a, cy + b],
      [cx + b, cy + b],
      [cx + b, cy + a],
      [cx - b, cy + a],
      [cx - b, cy + b],
      [cx - a, cy + b],
      [cx - a, cy - b],
      [cx - b, cy - b]
    ];
    if (!rotate) return pts.map(([x, y]) => `${x},${y}`).join(' ');
    const angle = Math.PI / 4;
    return pts
      .map(([x, y]) => {
        const dx = x - cx;
        const dy = y - cy;
        return `${cx + dx * Math.cos(angle) - dy * Math.sin(angle)},${cy + dx * Math.sin(angle) + dy * Math.cos(angle)}`;
      })
      .join(' ');
  }

  function regionRect(region: RegionKind) {
    if (region === 'full') return { x: 16, y: 16, w: 68, h: 68 };
    if (region === 'leftHalf') return { x: 16, y: 16, w: 34, h: 68 };
    if (region === 'rightHalf') return { x: 50, y: 16, w: 34, h: 68 };
    if (region === 'topHalf') return { x: 16, y: 16, w: 68, h: 34 };
    if (region === 'bottomHalf') return { x: 16, y: 50, w: 68, h: 34 };
    if (region === 'topLeftQuadrant') return { x: 16, y: 16, w: 34, h: 34 };
    if (region === 'topRightQuadrant') return { x: 50, y: 16, w: 34, h: 34 };
    if (region === 'bottomLeftQuadrant') return { x: 16, y: 50, w: 34, h: 34 };
    if (region === 'bottomRightQuadrant') return { x: 50, y: 50, w: 34, h: 34 };
    return { x: 32, y: 32, w: 36, h: 36 };
  }

  function textureFill(texture: TextureKind) {
    if (texture === 'empty') return 'white';
    if (texture === 'solidBlack') return '#172033';
    if (texture === 'lightGray') return '#e8edf5';
    if (texture === 'darkGray') return '#aeb7c5';
    return `url(#${cellId}-${texture})`;
  }

  function shapeFill(el: Extract<CellElement, { type: 'shape' }>) {
    return el.texture ? textureFill(el.texture) : (el.fill ?? 'white');
  }

  function petalPath(variant: 'petal' | 'bar' | 'triangle' | undefined) {
    if (variant === 'bar') return 'M43 18 H57 V49 H43 Z';
    if (variant === 'triangle') return 'M50 14 L62 49 L38 49 Z';
    return '';
  }

  function isShapeElement(el: CellElement): el is Extract<CellElement, { type: 'shape' }> {
    return el.type === 'shape';
  }
</script>

<div class:compact class="cell-shell">
  <svg viewBox="0 0 100 100" aria-hidden="true" class="cell-svg">
    <defs>
      <pattern id="{cellId}-diagonalHatchA" width="9" height="9" patternUnits="userSpaceOnUse">
        <path d="M-2,9 L9,-2 M0,11 L11,0" stroke="#172033" stroke-width="1.55" />
      </pattern>
      <pattern id="{cellId}-diagonalHatchB" width="9" height="9" patternUnits="userSpaceOnUse">
        <path d="M0,0 L9,9 M-2,7 L2,11 M7,-2 L11,2" stroke="#172033" stroke-width="1.55" />
      </pattern>
      <pattern id="{cellId}-crossHatch" width="9" height="9" patternUnits="userSpaceOnUse">
        <path d="M-2,9 L9,-2 M0,11 L11,0 M0,0 L9,9" stroke="#172033" stroke-width="1.25" />
      </pattern>
      <pattern id="{cellId}-verticalStripes" width="8" height="8" patternUnits="userSpaceOnUse">
        <path d="M2,0 L2,8 M6,0 L6,8" stroke="#172033" stroke-width="1.65" />
      </pattern>
      <pattern id="{cellId}-horizontalStripes" width="8" height="8" patternUnits="userSpaceOnUse">
        <path d="M0,2 L8,2 M0,6 L8,6" stroke="#172033" stroke-width="1.65" />
      </pattern>
      <pattern id="{cellId}-dotFill" width="12" height="12" patternUnits="userSpaceOnUse">
        <circle cx="3" cy="3" r="1.35" fill="#172033" />
        <circle cx="9" cy="9" r="1.35" fill="#172033" />
      </pattern>
      <pattern id="{cellId}-checker" width="12" height="12" patternUnits="userSpaceOnUse">
        <rect x="0" y="0" width="6" height="6" fill="#172033" opacity="0.92" />
        <rect x="6" y="6" width="6" height="6" fill="#172033" opacity="0.92" />
      </pattern>
    </defs>

    <rect x="3" y="3" width="94" height="94" rx="13" fill="white" stroke="#d8dee8" stroke-width="2" />

    {#if missing}
      <text x="50" y="61" text-anchor="middle" font-size="34" font-weight="800" fill="#8b94a3">?</text>
    {:else if cell}
      {#each cell.elements as el (el.id)}
        {#if el.type === 'region'}
          {@const r = regionRect(el.region)}
          <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={textureFill(el.texture)} stroke="#748196" stroke-width="0.8" stroke-opacity="0.28" />
        {:else if el.type === 'line'}
          <line x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} stroke={el.stroke ?? '#172033'} stroke-width={el.strokeWidth ?? 4} stroke-linecap="round" stroke-dasharray={el.dash ?? undefined} />
        {:else if el.type === 'dot'}
          <circle cx={el.x} cy={el.y} r={el.r ?? 4.5} fill={el.fill ?? '#172033'} />
        {:else if el.type === 'petal'}
          <g transform="rotate({el.angle} 50 50)">
            {#if el.variant === 'bar' || el.variant === 'triangle'}
              <path d={petalPath(el.variant)} fill={el.fill ?? '#fffdf8'} stroke={el.stroke ?? '#172033'} stroke-width={el.strokeWidth ?? 3.4} stroke-linejoin="round" />
            {:else}
              <ellipse cx="50" cy="29" rx="9.4" ry="19.5" fill={el.fill ?? '#fffdf8'} stroke={el.stroke ?? '#172033'} stroke-width={el.strokeWidth ?? 3.4} />
            {/if}
          </g>
        {:else if isShapeElement(el)}
          <g transform="rotate({el.rotation ?? 0} {el.cx} {el.cy})" opacity={el.opacity ?? 1}>
            {#if el.shape === 'circle'}
              <circle cx={el.cx} cy={el.cy} r={el.size / 2} fill={shapeFill(el)} stroke={el.stroke ?? '#172033'} stroke-width={el.strokeWidth ?? 4} />
            {:else if el.shape === 'square'}
              <rect x={el.cx - el.size / 2} y={el.cy - el.size / 2} width={el.size} height={el.size} rx="1.8" fill={shapeFill(el)} stroke={el.stroke ?? '#172033'} stroke-width={el.strokeWidth ?? 4} />
            {:else}
              <polygon points={shapePoints(el.shape, el.cx, el.cy, el.size)} fill={shapeFill(el)} stroke={el.stroke ?? '#172033'} stroke-width={el.strokeWidth ?? 4} stroke-linejoin="round" />
            {/if}
          </g>
        {/if}
      {/each}
    {/if}
  </svg>
</div>

<style>
  .cell-shell {
    width: 100%;
    aspect-ratio: 1 / 1;
    border-radius: 0.9rem;
    background: white;
    color: #172033;
    box-shadow: 0 1px 2px rgb(15 23 42 / 0.1);
    overflow: hidden;
  }

  .cell-shell.compact {
    border-radius: 0.72rem;
  }

  .cell-svg {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
