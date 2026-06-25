<script lang="ts">
	import { onDestroy } from 'svelte';
	import StreamBoard from './StreamBoard.svelte';
	import type { Domain, TargetFeature, Stimulus, ClickEvent, NBackTrialRow } from './types';
	import { generateSequence } from './logic/generator';

	let {
		gameEnd,
		sendResults
	}: {
		gameEnd: () => void;
		sendResults: (results: NBackTrialRow[]) => void;
	} = $props();

	let domain = $state<Domain>('figures');
	let nBack = $state<1 | 2 | 3>(1);
	let target = $state<TargetFeature>('shape');
	const DURATION_MS = 60_000;

	let phase = $state<'config' | 'countdown' | 'running' | 'done'>('config');
	let countdown = $state(3);
	let seq: Stimulus[] = [];
	let idx = 0;
	let current = $state<Stimulus | null>(null);
	let clicks: ClickEvent[] = [];
	let lastClickTs: number | null = null;
	let startAt = 0;
	let stimShownAt = 0;
	let remainSec = $state(60);
	let tickTimer: any = null;

	function pickTargetForFigures(): TargetFeature {
		return Math.random() < 0.5 ? 'shape' : 'color';
	}

	function start() {
		const actualTarget: TargetFeature =
			domain === 'numbers' ? 'number' : pickTargetForFigures();
		target = actualTarget;
		seq = generateSequence({
			domain,
			nBack,
			target: actualTarget,
			totalCount: 100,
			matchRatio: 0.3
		});
		phase = 'countdown';
		countdown = 3;
		const t = setInterval(() => {
			countdown -= 1;
			if (countdown <= 0) {
				clearInterval(t);
				run();
			}
		}, 1000);
	}

	function run() {
		phase = 'running';
		startAt = Date.now();
		idx = 0;
		current = seq[idx];
		stimShownAt = Date.now();
		remainSec = 60;
		tickTimer = setInterval(() => {
			const left = Math.max(0, DURATION_MS - (Date.now() - startAt));
			remainSec = Math.ceil(left / 1000);
			if (left <= 0) finish();
		}, 200);
	}

	function advance() {
		idx += 1;
		if (idx >= seq.length) {
			finish();
			return;
		}
		current = seq[idx];
		stimShownAt = Date.now();
	}

	function onAnswer(ans: 'yes' | 'no') {
		if (phase !== 'running' || !current) return;
		if (current.truth === null) {
			advance();
			return;
		}

		const has = clicks.length && clicks[clicks.length - 1].stimIndex === current.idx;
		if (has) return;

		const now = Date.now();
		const truth = current.truth!;
		const isYes = ans === 'yes';
		const isCorrect = (isYes && truth) || (!isYes && !truth);
		const rtMs = now - stimShownAt;
		const interClickMs = lastClickTs == null ? now - startAt : now - lastClickTs;

		const ce: ClickEvent = {
			ts: now,
			stimIndex: current.idx,
			domain,
			nBack,
			target: domain === 'numbers' ? 'number' : target,
			answer: ans,
			truth,
			isCorrect,
			rtMs,
			interClickMs
		};
		clicks = [...clicks, ce];
		lastClickTs = now;

		advance();
	}

	function finish() {
		if (phase === 'done') return;
		clearInterval(tickTimer);
		phase = 'done';
		const totalStimuli = seq.length;
		const actualDurationMs = Math.min(DURATION_MS, Date.now() - startAt);
		const actualTarget = domain === 'numbers' ? 'number' : target;

		const trialRows: NBackTrialRow[] = clicks.map((c, i) => ({
			clickIndex: i + 1,
			stimIndex: c.stimIndex,
			answer: c.answer,
			truth: c.truth,
			isCorrect: c.isCorrect,
			rtMs: c.rtMs,
			interClickMs: c.interClickMs,
			domain,
			nBack,
			target: actualTarget,
			durationMs: actualDurationMs,
			totalStimuli
		}));

		sendResults(trialRows);
		gameEnd();
	}

	function restart() {
		clicks = [];
		lastClickTs = null;
		seq = [];
		phase = 'config';
		clearInterval(tickTimer);
	}

	onDestroy(() => clearInterval(tickTimer));
</script>

{#if phase === 'config'}
	<div class="flex flex-col gap-4">
		<h2 class="text-xl font-semibold">Выберите режим</h2>
		<div class="grid grid-cols-2 gap-4 max-w-xl">
			<button
				class="card {domain === 'figures' ? 'selected' : ''}"
				onclick={() => (domain = 'figures')}
			>
				<div class="text-3xl mb-2">⬢</div>
				<div class="font-medium">Фигуры</div>
			</button>
			<button
				class="card {domain === 'numbers' ? 'selected' : ''}"
				onclick={() => (domain = 'numbers')}
			>
				<div class="text-3xl mb-2">7</div>
				<div class="font-medium">Числа</div>
			</button>
		</div>

		<div class="grid grid-cols-3 gap-4 max-w-xl">
			<button class="card {nBack === 1 ? 'selected' : ''}" onclick={() => (nBack = 1)}
				><div class="text-2xl">1-back</div></button
			>
			<button class="card {nBack === 2 ? 'selected' : ''}" onclick={() => (nBack = 2)}
				><div class="text-2xl">2-back</div></button
			>
			<button class="card {nBack === 3 ? 'selected' : ''}" onclick={() => (nBack = 3)}
				><div class="text-2xl">3-back</div></button
			>
		</div>

		<div class="w-full flex justify-center gap-4 pt-2">
			<button class="btn" onclick={start}>Далее</button>
		</div>
	</div>
{:else if phase === 'countdown'}
	<div class="grid place-items-center p-10 text-center">
		<div class="text-lg mb-2 opacity-80">Задание</div>
		<div class="text-2xl font-semibold mb-6">
			{#if domain === 'figures'}
				Сравнение по {target === 'shape' ? 'форме' : 'цвету'}
			{:else}
				Сравнивайте числовые значения
			{/if}
		</div>
		<div class="text-6xl font-bold">{countdown}</div>
	</div>
{:else if phase === 'running'}
	<div class="p-6 space-y-6">
		<div class="text-lg font-semibold text-center">
			{#if domain === 'figures'}
				{target === 'shape' ? 'Форма такая' : 'Цвет такой'} же, как {nBack}-ход(а) назад?
			{:else}
				Число такое же, как {nBack}-ход(а) назад?
			{/if}
		</div>
		<div class="text-sm opacity-70 text-center -mt-1">Осталось ~ {remainSec} c</div>

		{#if current && current.truth === null}
			<div class="hint">
				Запомните {nBack === 1 ? 'первую' : nBack === 2 ? 'первые две' : 'первые три'}
				{domain === 'figures' ? 'фигур' : 'числа'} — ответы пока не принимаются.
			</div>
		{/if}

		<StreamBoard {current} />

		<div class="flex gap-4 justify-center pt-2">
			{#if current?.truth === null}
				<button class="btn primary" onclick={advance} aria-label="Далее (Space)"
					>Далее</button
				>
			{:else}
				<button class="ans yes" onclick={() => onAnswer('yes')}>Да</button>
				<button class="ans no" onclick={() => onAnswer('no')}>Нет</button>
			{/if}
		</div>
	</div>
{/if}

<svelte:window
	onkeydown={(e) => {
		if (phase !== 'running') return;
		if (current?.truth === null) {
			if (e.code === 'Space') {
				e.preventDefault();
				advance();
			}
			return;
		}
		if (e.key === 'j' || e.key === 'J') onAnswer('yes');
		if (e.key === 'f' || e.key === 'F') onAnswer('no');
	}}
/>

<style>
	/* Карточки выбора */
	.card {
		padding: 1rem;
		border: 1px solid rgba(0, 0, 0, 0.18);
		border-radius: 1rem;
		background: #fff;
		color: #111827;
		display: grid;
		place-items: center;
		cursor: pointer;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
		transition:
			box-shadow 0.15s,
			transform 0.15s;
	}
	.card:hover {
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		transform: translateY(-1px);
	}
	.card.selected {
		outline: 2px solid #3b82f6;
		box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
	}

	/* Основные кнопки ответа — контрастные */
	.ans {
		padding: 0.9rem 1.5rem;
		border-radius: 12px;
		border: 0;
		font-size: 1.05rem;
		font-weight: 600;
		cursor: pointer;
		color: #fff;
	}
	.yes {
		background: #16a34a;
	}
	.yes:hover {
		background: #15803d;
	}
	.no {
		background: #dc2626;
	}
	.no:hover {
		background: #b91c1c;
	}

	/* Универсальная кнопка (например, “Далее”) */
	.btn {
		padding: 0.7rem 1.1rem;
		border-radius: 0.8rem;
		border: 1px solid rgba(0, 0, 0, 0.2);
		background: #fff;
		color: #111827;
		cursor: pointer;
		font-weight: 600;
	}
	.btn:hover {
		background: #f8fafc;
	}
	.btn.primary {
		border-color: #3b82f6;
	}

	/* Инфо-баннер */
	.hint {
		border-radius: 12px;
		background: #fff7ed;
		border: 1px solid #fed7aa;
		color: #9a3412;
		padding: 0.6rem 0.9rem;
		text-align: center;
		font-size: 0.95rem;
	}
</style>
