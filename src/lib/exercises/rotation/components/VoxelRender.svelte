<script lang="ts">
	import { projectPoint } from '../logic/projection';
	import type { RotationCell } from '../types';

	let {
		cells,
		gridSize,
		rotation
	}: {
		cells: RotationCell[];
		gridSize: number;
		rotation: { yawDeg: number; pitchDeg: number };
	} = $props();

	/** Cube edge ≈ 0.85 of the grid step; small gaps avoid overlap artifacts between neighbours. */
	const CUBE_HALF = 0.425;
	const SPHERE_R = 0.45;
	const VIEW_PAD = 0.75;

	/** Indigo family: tone 0 = lightest (top), 2 = darkest. */
	const CUBE_TONES = ['#c7d2fe', '#818cf8', '#4f46e5'] as const;
	const SPHERE_FILL = '#f59e0b';
	const SPHERE_HIGHLIGHT = '#fde68a';

	type FaceRender = { points: string; fill: string };
	type Item =
		| { kind: 'cube'; depth: number; faces: FaceRender[] }
		| { kind: 'sphere'; depth: number; cx: number; cy: number };

	const CORNER_OFFSETS: ReadonlyArray<readonly [number, number, number]> = [
		[-1, -1, -1],
		[1, -1, -1],
		[1, 1, -1],
		[-1, 1, -1],
		[-1, -1, 1],
		[1, -1, 1],
		[1, 1, 1],
		[-1, 1, 1]
	];

	interface CubeFace {
		normal: readonly [number, number, number];
		corners: readonly number[];
	}

	const FACES: readonly CubeFace[] = [
		{ normal: [0, 0, 1], corners: [4, 5, 6, 7] },
		{ normal: [0, 0, -1], corners: [3, 2, 1, 0] },
		{ normal: [0, -1, 0], corners: [0, 1, 5, 4] },
		{ normal: [0, 1, 0], corners: [2, 3, 7, 6] },
		{ normal: [-1, 0, 0], corners: [0, 4, 7, 3] },
		{ normal: [1, 0, 0], corners: [1, 2, 6, 5] }
	];

	const scene = $derived.by(() => {
		if (!Array.isArray(cells) || cells.length === 0) {
			return { items: [] as Item[], viewBox: '0 0 1 1' };
		}

		const items: Item[] = [];
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;
		const track = (x: number, y: number) => {
			if (x < minX) minX = x;
			if (x > maxX) maxX = x;
			if (y < minY) minY = y;
			if (y > maxY) maxY = y;
		};

		for (const cell of cells) {
			if (cell.shape === 'sphere') {
				const center = projectPoint(cell, rotation.yawDeg, rotation.pitchDeg, gridSize);
				items.push({ kind: 'sphere', depth: center.depth, cx: center.sx, cy: center.sy });
				track(center.sx - SPHERE_R, center.sy - SPHERE_R);
				track(center.sx + SPHERE_R, center.sy + SPHERE_R);
				continue;
			}

			const corners = CORNER_OFFSETS.map(([dx, dy, dz]) =>
				projectPoint(
					{
						x: cell.x + dx * CUBE_HALF,
						y: cell.y + dy * CUBE_HALF,
						z: cell.z + dz * CUBE_HALF
					},
					rotation.yawDeg,
					rotation.pitchDeg,
					gridSize
				)
			);
			for (const corner of corners) track(corner.sx, corner.sy);

			const faces = FACES.map((face) => ({
				face,
				// projectPoint is affine, so a direction projects as a rotated vector:
				// depth > 0 → the outward normal points toward the camera (face visible),
				// sy < 0 → the normal points up on screen (lighter tone).
				normal: projectPoint(
					{ x: face.normal[0], y: face.normal[1], z: face.normal[2] },
					rotation.yawDeg,
					rotation.pitchDeg
				)
			}))
				.filter(({ normal }) => normal.depth > 0)
				.sort((a, b) => a.normal.sy - b.normal.sy)
				.map(({ face }, toneIndex) => ({
					points: face.corners.map((i) => `${corners[i].sx},${corners[i].sy}`).join(' '),
					fill: CUBE_TONES[Math.min(toneIndex, CUBE_TONES.length - 1)]
				}));

			items.push({
				kind: 'cube',
				depth: corners.reduce((sum, corner) => sum + corner.depth, 0) / corners.length,
				faces
			});
		}

		// Painter's algorithm: depth = nearness, so far cells come first.
		items.sort((a, b) => a.depth - b.depth);

		return {
			items,
			viewBox: `${minX - VIEW_PAD} ${minY - VIEW_PAD} ${maxX - minX + 2 * VIEW_PAD} ${maxY - minY + 2 * VIEW_PAD}`
		};
	});
</script>

<svg viewBox={scene.viewBox} class="h-auto w-full" aria-hidden="true">
	{#each scene.items as item, itemIndex (itemIndex)}
		{#if item.kind === 'cube'}
			{#each item.faces as face, faceIndex (faceIndex)}
				<polygon
					points={face.points}
					fill={face.fill}
					stroke={face.fill}
					stroke-width="0.04"
					stroke-linejoin="round"
				/>
			{/each}
		{:else}
			<circle cx={item.cx} cy={item.cy} r={SPHERE_R} fill={SPHERE_FILL} />
			<circle
				cx={item.cx - SPHERE_R * 0.25}
				cy={item.cy - SPHERE_R * 0.25}
				r={SPHERE_R * 0.4}
				fill={SPHERE_HIGHLIGHT}
			/>
		{/if}
	{/each}
</svg>
