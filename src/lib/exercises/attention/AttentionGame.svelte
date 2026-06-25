<script lang="ts">
	import { onDestroy } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import type { AttentionTrialRow } from './types';
	import type { MetaResult } from '$lib/exercises/types';
	import { SvelteSet } from 'svelte/reactivity';

	let {
		gameEnd,
		sendResults
	}: {
		gameEnd: () => void;
		sendResults: (results: MetaResult) => void;
	} = $props();

	let n = $state(30);
	let m = $state(5);
	let errors = $state(0);
	let numbers = $state<number[]>([]);
	let targets = $state(new Set<number>());
	let found = $state(new Set<number>());
	let started = $state(false);
	let startTime = $state(0);
	let elapsed = $state(0);
	let intervalId: ReturnType<typeof setInterval> | null = null;
	let clickLog: {
		number: number;
		isTarget: boolean;
		isCorrect: boolean;
		reactionTimeMs: number;
	}[] = [];
	let lastClickAt = 0;

	function generateTest() {
		if (m > n) {
			alert('m не может быть больше n');
			return;
		}
		const arr = new SvelteSet<number>();
		while (arr.size < n) arr.add(Math.floor(Math.random() * 1000));
		numbers = Array.from(arr);
		const shuffled = [...numbers].sort(() => Math.random() - 0.5);
		targets = new Set(shuffled.slice(0, m));
		found = new Set<number>();
		clickLog = [];
		lastClickAt = Date.now();
		stopTimer();
		elapsed = 0;
		started = true;
		startTime = Date.now();
		intervalId = setInterval(() => {
			elapsed = Math.floor((Date.now() - startTime) / 1000);
		}, 1000);
	}

	function stopTimer() {
		if (intervalId) {
			clearInterval(intervalId);
			intervalId = null;
		}
	}

	function handleClick(num: number) {
		if (!started) return;
		const reactionTimeMs = Date.now() - lastClickAt;
		lastClickAt = Date.now();

		if (targets.has(num)) {
			clickLog.push({ number: num, isTarget: true, isCorrect: true, reactionTimeMs });
			found = new Set([...found, num]);
			if (found.size === targets.size) {
				stopTimer();
				started = false;
				const trialRows: AttentionTrialRow[] = clickLog.map((c, i) => ({
					clickIndex: i + 1,
					number: c.number,
					isTarget: c.isTarget,
					isCorrect: c.isCorrect,
					reactionTimeMs: c.reactionTimeMs,
					totalTargets: targets.size,
					totalNumbers: n
				}));
				sendResults({ results: trialRows, meta: [String(n), String(m)] });
				gameEnd();
			}
		} else {
			clickLog.push({ number: num, isTarget: false, isCorrect: false, reactionTimeMs });
			errors++;
		}
	}

	onDestroy(() => stopTimer());
</script>

{#if !started}
	<div
		class="mb-5 flex flex-col items-center justify-center gap-3 rounded-2xl bg-[#364b6c] p-5 text-xl backdrop-blur"
	>
		<label class="flex flex-col items-center justify-center gap-1.5 text-white/80">
			Всего чисел (n):
			<input
				type="number"
				bind:value={n}
				min="1"
				class="w-28 rounded-xl border-none bg-white/10 px-3 py-2 text-white ring-white/20 transition outline-none focus:ring-2"
			/>
		</label>
		<label class="flex flex-col items-center justify-center gap-1.5 text-white/80">
			Найти чисел (m):
			<input
				type="number"
				bind:value={m}
				min="1"
				class="w-28 rounded-xl border-none bg-white/10 px-3 py-2 text-white ring-white/20 transition outline-none focus:ring-2"
			/>
		</label>
		<Button color="green" onclick={generateTest}>Старт</Button>
	</div>
{:else}
	<div class="flex flex-col gap-4">
		<div class="grid grid-cols-3 items-center justify-center gap-4">
			<p class="text-center text-base text-white">
				Время: {elapsed} сек
			</p>
			<p class="text-center text-base font-semibold text-red-400">
				Ошибки: {errors}
			</p>
			<p class="text-center text-base font-semibold text-green-500">
				Найдено: {found.size} / {targets.size}
			</p>
		</div>
		<p class="text-center text-xl text-white">
			Найди числа:
			<strong>{[...targets].join(', ')}</strong>
		</p>
		<div
			class="grid grid-cols-[repeat(auto-fill,minmax(70px,1fr))] gap-2.5 rounded-3xl bg-white/10 p-5 backdrop-blur"
		>
			{#each numbers as num (num)}
				<button
					class="min-h-14 cursor-pointer rounded-xl border-none px-4 py-3 text-base font-bold transition-all duration-200 hover:scale-[1.03]"
					class:bg-stone-50={!found.has(num)}
					class:bg-green-500={found.has(num)}
					class:text-black={!found.has(num)}
					class:text-stone-50={found.has(num)}
					onclick={() => handleClick(num)}>{num}</button
				>
			{/each}
		</div>
	</div>
{/if}
