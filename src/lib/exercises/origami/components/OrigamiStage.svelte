<script lang="ts">
	import type { Line, OrigamiStep, Pt } from '../types';

	let {
		steps,
		onfinished,
		stepMs = 1200
	}: {
		steps: OrigamiStep[];
		onfinished?: () => void;
		stepMs?: number;
	} = $props();

	let stepIndex = $state(0);
	let isFinished = $state(false);

	/** Предыдущая ссылка на массив steps: смена задания = новый массив. */
	let prevSteps: OrigamiStep[] | undefined;

	const currentStep = $derived(steps[stepIndex]);

	$effect(() => {
		// Новый массив steps (следующее задание) — воспроизведение с нуля.
		if (steps !== prevSteps) {
			prevSteps = steps;
			stepIndex = 0;
			isFinished = false;
		}
		if (isFinished || steps.length === 0) return;
		const timer = setInterval(() => {
			if (stepIndex < steps.length - 1) {
				stepIndex += 1;
				return;
			}
			clearInterval(timer);
			isFinished = true;
			onfinished?.();
		}, stepMs);
		return () => clearInterval(timer);
	});

	function skip() {
		if (isFinished) return;
		stepIndex = steps.length - 1;
		isFinished = true;
		onfinished?.();
	}

	function replay() {
		stepIndex = 0;
		isFinished = steps.length <= 1;
		if (isFinished) onfinished?.();
	}

	function polyPoints(poly: Pt[]): string {
		return poly.map((v) => `${v.x.toFixed(2)},${v.y.toFixed(2)}`).join(' ');
	}

	/** ax + by + c = 0 → длинный отрезок через всю область просмотра. */
	function creaseSegment(line: Line): { x1: number; y1: number; x2: number; y2: number } {
		const px = -line.a * line.c;
		const py = -line.b * line.c;
		const dx = -line.b * 160;
		const dy = line.a * 160;
		return { x1: px - dx, y1: py - dy, x2: px + dx, y2: py + dy };
	}
</script>

<div class="flex w-full flex-col items-center gap-2">
	<svg
		viewBox="-50 -50 200 200"
		class="h-64 w-64 sm:h-80 sm:w-80"
		role="img"
		aria-label="Схема сложения листа"
	>
		<!-- Лист-подложка -->
		<rect
			x="0"
			y="0"
			width="100"
			height="100"
			fill="#ffffff"
			stroke="#94a3b8"
			stroke-width="1"
		/>

		{#if currentStep}
			<!-- Куски бумаги: полупрозрачные полигоны, перекрытия темнее (alpha-композитинг) -->
			{#each currentStep.pieces as piece (piece)}
				<polygon
					points={polyPoints(piece.poly)}
					fill="rgba(59, 130, 246, 0.22)"
					stroke="#3b82f6"
					stroke-width="0.8"
				/>
			{/each}

			<!-- Подсветка свежеперегнутых частей -->
			{#each currentStep.movedPolys ?? [] as poly, i (i)}
				<polygon
					points={polyPoints(poly)}
					fill="rgba(249, 115, 22, 0.28)"
					stroke="#f97316"
					stroke-width="1.2"
				/>
			{/each}

			<!-- Линия сгиба -->
			{#if currentStep.crease}
				{@const seg = creaseSegment(currentStep.crease)}
				<line
					x1={seg.x1}
					y1={seg.y1}
					x2={seg.x2}
					y2={seg.y2}
					stroke="#64748b"
					stroke-width="1"
					stroke-dasharray="4 3"
				/>
			{/if}

			<!-- Точки проколов -->
			{#each currentStep.dots as dot, i (i)}
				<circle cx={dot.x} cy={dot.y} r="2.5" fill="#dc2626" />
			{/each}
		{/if}
	</svg>

	<div class="flex items-center gap-2 text-sm text-slate-600">
		<span class="tabular-nums" aria-live="polite">{stepIndex + 1} / {steps.length}</span>
		<button
			type="button"
			class="rounded-full bg-white/70 px-3 py-1.5 ring-1 ring-slate-300/40 transition-colors hover:bg-white"
			onclick={skip}
			disabled={isFinished}
		>
			Пропустить
		</button>
		<button
			type="button"
			class="rounded-full bg-white/70 px-3 py-1.5 ring-1 ring-slate-300/40 transition-colors hover:bg-white"
			onclick={replay}
		>
			Повторить
		</button>
	</div>
</div>
