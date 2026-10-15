<script lang="ts">
	import { onDestroy } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import IntervalWorker from '$lib/workers/interval_worker.ts?worker';
	import { shuffle } from '$lib/utils';
	import { generateSessionPairs, pairToPhrase } from './logic/generation';
	import { isRecallCorrect, validateAssociation } from './logic/validation';
	import { TIME_LIMIT_MS, type SyllableFormationAttemptRow, type SyllablePair } from './types';
	import MemorizeStep from './components/MemorizeStep.svelte';
	import RecallStep from './components/RecallStep.svelte';

	let {
		gameEnd,
		sendResults,
		timeLimitMs = TIME_LIMIT_MS
	}: {
		gameEnd: () => void;
		sendResults: (results: SyllableFormationAttemptRow[]) => void;
		/** Инъекция лимита времени для тестов; продакшн всегда использует дефолт. */
		timeLimitMs?: number;
	} = $props();

	type Phase = 'intro' | 'memorize' | 'recall' | 'finished';

	/** Пара + накопленное состояние этапа придумывания. */
	type MemorizeRecord = {
		pair: SyllablePair;
		pairIndex: number; // 1..5
		association: string | null;
		associationMs: number;
	};

	let phase = $state<Phase>('intro');
	let memorizeRecords = $state<MemorizeRecord[]>([]);
	let memorizeIndex = $state(0);
	let recallQueue = $state<MemorizeRecord[]>([]);
	let recallIndex = $state(0);
	let rows = $state<SyllableFormationAttemptRow[]>([]);
	let input = $state('');
	let error = $state<string | null>(null);

	let deadline = $state<number | null>(null);
	let currentTime = $state(Date.now());
	let stepStartedAt = $state(0);

	// Фолбэк без Date.now() в шаблоне: в фазах memorize/recall deadline всегда задан,
	// а currentTime обновляется тиками воркера.
	const effectiveDeadline = $derived(deadline ?? currentTime);

	// Веб-воркер для тиков таймера: корректно работает, когда страница не в фокусе.
	const intervalWorker = new IntervalWorker();
	intervalWorker.onmessage = (e) => {
		if (e.data !== 'tick') return;
		currentTime = Date.now();
		if (deadline === null || currentTime < deadline) return;
		intervalWorker.postMessage('stop');
		if (phase === 'memorize') timeoutMemorize();
		else if (phase === 'recall') timeoutRecall();
	};

	function startStep() {
		const now = Date.now();
		stepStartedAt = now;
		deadline = now + timeLimitMs;
		currentTime = now;
		input = '';
		error = null;
		intervalWorker.postMessage('start');
	}

	function startSession() {
		const pairs = generateSessionPairs();
		memorizeRecords = pairs.map((pair, i) => ({
			pair,
			pairIndex: i + 1,
			association: null,
			associationMs: 0
		}));
		memorizeIndex = 0;
		rows = [];
		phase = 'memorize';
		startStep();
	}

	function elapsedMs(): number {
		return Math.min(Date.now() - stepStartedAt, timeLimitMs);
	}

	function submitMemorize() {
		const record = memorizeRecords[memorizeIndex];
		const validation = validateAssociation(input, record.pair);
		if (!validation.valid) {
			// Инлайн-сообщение; таймер продолжает идти.
			error =
				validation.reason === 'empty'
					? 'Введите ассоциацию'
					: 'Ассоциация не принята: слишком похожа на сочетание';
			return;
		}
		intervalWorker.postMessage('stop');
		memorizeRecords[memorizeIndex] = {
			...record,
			association: input.trim(),
			associationMs: elapsedMs()
		};
		memorizeIndex += 1;
		if (memorizeIndex < memorizeRecords.length) {
			startStep();
		} else {
			// В recall идут только пары с придуманной ассоциацией (в перемешанном порядке).
			const queue = memorizeRecords.filter((r) => r.association !== null);
			shuffle(queue);
			recallQueue = queue;
			recallIndex = 0;
			if (recallQueue.length === 0) {
				finish();
				return;
			}
			phase = 'recall';
			startStep();
		}
	}

	/** Таймаут этапа придумывания: ассоциации нет, шаг сразу в результат. */
	function timeoutMemorize() {
		const record = memorizeRecords[memorizeIndex];
		rows = [
			...rows,
			{
				pairIndex: record.pairIndex,
				phrase: pairToPhrase(record.pair),
				association: null,
				isCorrect: false,
				reactionTimeMs: 0,
				timedOut: true,
				associationMs: timeLimitMs
			}
		];
		memorizeIndex += 1;
		if (memorizeIndex < memorizeRecords.length) {
			startStep();
		} else {
			// В recall идут только пары с придуманной ассоциацией (в перемешанном порядке).
			const queue = memorizeRecords.filter((r) => r.association !== null);
			shuffle(queue);
			recallQueue = queue;
			recallIndex = 0;
			if (recallQueue.length === 0) {
				finish();
				return;
			}
			phase = 'recall';
			startStep();
		}
	}

	function submitRecall() {
		const record = recallQueue[recallIndex];
		intervalWorker.postMessage('stop');
		rows = [
			...rows,
			{
				pairIndex: record.pairIndex,
				phrase: pairToPhrase(record.pair),
				association: record.association,
				isCorrect: isRecallCorrect(input, pairToPhrase(record.pair)),
				reactionTimeMs: elapsedMs(),
				timedOut: false,
				associationMs: record.associationMs,
				recalledPhrase: input.trim()
			}
		];
		recallIndex += 1;
		if (recallIndex < recallQueue.length) {
			startStep();
		} else {
			finish();
		}
	}

	/** Таймаут этапа восстановления. */
	function timeoutRecall() {
		const record = recallQueue[recallIndex];
		rows = [
			...rows,
			{
				pairIndex: record.pairIndex,
				phrase: pairToPhrase(record.pair),
				association: record.association,
				isCorrect: false,
				reactionTimeMs: timeLimitMs,
				timedOut: true,
				associationMs: record.associationMs
			}
		];
		recallIndex += 1;
		if (recallIndex < recallQueue.length) {
			startStep();
		} else {
			finish();
		}
	}

	function finish() {
		deadline = null;
		// Терминальная фаза: индексы шагов уже за границами массивов,
		// рендер memorize/recall после завершения недопустим.
		phase = 'finished';
		sendResults([...rows].sort((a, b) => a.pairIndex - b.pairIndex));
		gameEnd();
	}

	onDestroy(() => {
		intervalWorker.postMessage('stop');
		intervalWorker.terminate();
	});
</script>

<div class="flex w-3/4 flex-col items-center gap-6">
	{#if phase === 'intro'}
		<h2 class="text-center text-xl text-[var(--main-text-color)] sm:text-2xl">
			Слогообразование
		</h2>
		<p class="text-center text-sm text-[var(--main-text-color)] sm:text-lg">
			Вам покажут 5 псевдословосочетаний. К каждому придумайте ассоциацию, а затем по
			ассоциациям восстановите сочетания. На каждый шаг — 2 минуты.
		</p>
		<Button color="green" onclick={startSession}>Начать</Button>
	{:else if phase === 'memorize'}
		{@const record = memorizeRecords[memorizeIndex]}
		<MemorizeStep
			pairIndex={record.pairIndex}
			total={memorizeRecords.length}
			phrase={pairToPhrase(record.pair)}
			deadline={effectiveDeadline}
			now={currentTime}
			{error}
			value={input}
			onInput={(v) => (input = v)}
			onSubmit={submitMemorize}
		/>
	{:else if phase === 'recall'}
		{@const record = recallQueue[recallIndex]}
		<RecallStep
			index={recallIndex + 1}
			total={recallQueue.length}
			association={record.association ?? ''}
			deadline={effectiveDeadline}
			now={currentTime}
			value={input}
			onInput={(v) => (input = v)}
			onSubmit={submitRecall}
		/>
	{/if}
</div>
