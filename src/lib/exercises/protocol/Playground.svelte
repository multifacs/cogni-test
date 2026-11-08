<script lang="ts">
	import { onMount, tick as flush } from 'svelte';
	import { beforeNavigate, goto } from '$app/navigation';
	import { resolve, base } from '$app/paths';
	import Button from '$lib/components/ui/Button.svelte';
	import { enqueueAttempt, flushQueue } from '$lib/client/offline-queue';
	import { ProtocolEngine } from './engine';
	import { definitions, isProtocolType, type ProtocolType } from './config';
	import type { ProtocolPayload } from './types';
	import Result from './Result.svelte';

	let {
		data,
		gameEnd,
		sendResults
	}: {
		data: { slug: string };
		gameEnd: () => void;
		sendResults?: (results: ProtocolPayload) => void | Promise<void>;
	} = $props();

	const type = $derived(
		(isProtocolType(data.slug) ? data.slug : 'memory_matrix') as ProtocolType
	);
	const definition = $derived(definitions[type]);
	let engine = $state.raw<ProtocolEngine | null>(null);
	let revision = $state(0);
	let now = $state(0);
	let answerText = $state('');
	let firstCell = $state<number | null>(null);
	let saving = $state(false);
	let saveError = $state('');
	let finishedPayload = $state.raw<ProtocolPayload | null>(null);
	let inputMode: 'mouse' | 'touch' | 'keyboard' = 'mouse';
	let submitted = false;
	let leaving = false;
	let sessionId = '';
	let animationFrame = 0;
	let scheduledTrial = -1;
	let mounted = false;
	let displayedTrial = -1;
	let lastCheckpoint = -Infinity;

	const view = $derived.by(() => {
		void revision;
		if (!engine) return null;
		return {
			phase: engine.phase,
			current: engine.current
				? {
						...engine.current,
						stimulus: {
							...engine.current.stimulus,
							locked_cell_ids: [...(engine.current.stimulus.locked_cell_ids ?? [])]
						},
						events: [...engine.current.events],
						rounds: engine.current.rounds?.map((round) => ({ ...round }))
					}
				: null,
			selected: [...engine.selected]
		};
	});
	const stimulus = $derived(view?.current?.stimulus);
	const currentRound = $derived(view?.current?.rounds?.at(-1));
	const gridSize = $derived(stimulus?.grid_size ?? stimulus?.grid_snapshot?.[0]?.length ?? 10);
	const cells = $derived(
		stimulus?.values_snapshot ??
			stimulus?.grid_snapshot?.join('').split('') ??
			Array.from({ length: gridSize * gridSize }, () => '')
	);
	const foundCells = $derived(
		(view?.current?.events ?? [])
			.filter((event) => event.is_correct)
			.flatMap((event) =>
				Array.isArray(event.selected_path) ? (event.selected_path as number[]) : []
			)
	);
	const remaining = $derived.by(() => {
		if (!engine || !view?.current || view.phase === 'ready' || view.phase === 'finished')
			return null;
		if (
			view.phase === 'show' ||
			view.phase === 'feedback' ||
			view.phase === 'waiting' ||
			view.phase === 'green_pending'
		)
			return null;
		return Number.isFinite(engine.deadline)
			? Math.max(0, Math.ceil((engine.deadline - now) / 1000))
			: null;
	});
	const selectedSum = $derived(
		(view?.selected ?? []).reduce((sum, id) => sum + (stimulus?.values_snapshot?.[id] ?? 0), 0)
	);

	function rememberPointer(event: PointerEvent) {
		inputMode = event.pointerType === 'touch' ? 'touch' : 'mouse';
	}

	function checkpoint(timestamp: number) {
		if (!engine || submitted || engine.phase === 'ready' || engine.phase === 'finished') return;
		if (timestamp - lastCheckpoint < 1000) return;
		lastCheckpoint = timestamp;
		try {
			const results = engine.interruptedPayload(timestamp);
			results.meta.input_mode = inputMode;
			localStorage.setItem(
				`protocol-interrupted:${type}`,
				JSON.stringify({ sessionId, results })
			);
		} catch {
			/* Storage failure must not interrupt the active test. */
		}
	}

	function update() {
		if (!engine || !mounted) return;
		now = performance.now();
		if (engine.current && engine.current.trial_index !== displayedTrial) {
			displayedTrial = engine.current.trial_index;
			answerText = '';
			firstCell = null;
		}
		revision += 1;
		if (engine.phase === 'finished' && !submitted) {
			void finish();
			return;
		}
		checkpoint(now);
		void scheduleOnset();
	}

	async function scheduleOnset() {
		if (!engine || animationFrame) return;
		const motor = engine.phase === 'green_pending';
		const color =
			type.startsWith('color_') &&
			engine.phase === 'answer' &&
			engine.current?.trial_index !== scheduledTrial;
		if (!motor && !color) return;
		const active = engine;
		const trial = engine.current?.trial_index ?? -1;
		scheduledTrial = trial;
		await flush();
		if (!mounted || active !== engine || active.phase === 'finished') return;
		animationFrame = requestAnimationFrame((timestamp) => {
			animationFrame = 0;
			if (active !== engine || active.phase === 'finished') return;
			if (motor) active.greenOnset(timestamp);
			else active.colorOnset(timestamp);
			update();
		});
	}

	function start() {
		engine = new ProtocolEngine(type, crypto.randomUUID());
		sessionId = crypto.randomUUID();
		submitted = false;
		finishedPayload = null;
		saveError = '';
		answerText = '';
		firstCell = null;
		scheduledTrial = -1;
		displayedTrial = -1;
		lastCheckpoint = -Infinity;
		engine.start(performance.now());
		update();
	}

	function answer(value: string | boolean | number[]) {
		if (!engine || submitted) return;
		engine.answer(value, performance.now());
		answerText = '';
		firstCell = null;
		update();
	}

	function clickCell(id: number) {
		if (!engine || submitted || engine.phase !== 'answer') return;
		if (type !== 'anti_munsterberg') {
			engine.toggle(id, performance.now());
			update();
			return;
		}
		if (firstCell === null) {
			firstCell = id;
			return;
		}
		const fromRow = Math.floor(firstCell / gridSize);
		const fromCol = firstCell % gridSize;
		const rowDiff = Math.floor(id / gridSize) - fromRow;
		const colDiff = (id % gridSize) - fromCol;
		const length = Math.max(Math.abs(rowDiff), Math.abs(colDiff));
		const straight = rowDiff === 0 || colDiff === 0 || Math.abs(rowDiff) === Math.abs(colDiff);
		const path = straight
			? Array.from(
					{ length: length + 1 },
					(_, step) =>
						(fromRow + Math.sign(rowDiff) * step) * gridSize +
						fromCol +
						Math.sign(colDiff) * step
				)
			: [firstCell, id];
		engine.selectPath(path, performance.now());
		firstCell = null;
		update();
	}

	async function finish() {
		if (!engine || submitted) return;
		submitted = true;
		finishedPayload = engine.payload(inputMode);
		saving = true;
		try {
			gameEnd();
			if (sendResults) await sendResults(finishedPayload);
			else {
				await enqueueAttempt(type, { sessionId, results: finishedPayload });
				void flushQueue().catch(() => {});
			}
			try {
				localStorage.removeItem(`protocol-interrupted:${type}`);
			} catch {
				/* Result was saved by the callback or queued. */
			}
		} catch {
			saveError = 'Не удалось сохранить попытку. Попробуйте снова.';
		} finally {
			saving = false;
		}
	}

	async function retrySave() {
		if (!engine || saving) return;
		submitted = false;
		saveError = '';
		await finish();
	}

	function abort() {
		if (!engine || submitted) return;
		engine.abort(performance.now());
		update();
	}

	async function saveAborted(reason: 'aborted' | 'technical_error' = 'aborted') {
		if (!engine || submitted) return;
		engine.abort(performance.now(), reason);
		submitted = true;
		finishedPayload = engine.payload(inputMode);
		const draftKey = `protocol-interrupted:${type}`;
		try {
			localStorage.setItem(draftKey, JSON.stringify({ sessionId, results: finishedPayload }));
		} catch {
			/* IndexedDB remains the fallback if localStorage is unavailable. */
		}
		await enqueueAttempt(type, { sessionId, results: finishedPayload });
		try {
			localStorage.removeItem(draftKey);
		} catch {
			/* The queued attempt is already safe. */
		}
		void flushQueue().catch(() => {});
	}

	beforeNavigate((navigation) => {
		if (!engine || submitted || engine.phase === 'ready' || leaving) return;
		if (navigation.willUnload) {
			void saveAborted('technical_error').catch(() => {});
			return;
		}
		if (!navigation.to) return;
		navigation.cancel();
		const destination = navigation.to.url;
		void saveAborted()
			.then(() => {
				leaving = true;
				const pathname = destination.pathname.slice(base.length) || '/';
				void goto(
					resolve((pathname + destination.search + destination.hash) as '/exercises')
				);
			})
			.catch(() => {
				submitted = false;
				saveError = 'Не удалось сохранить прерванную попытку. Нажмите «Сохранить снова».';
				revision += 1;
			});
	});

	onMount(() => {
		mounted = true;
		const draftKey = `protocol-interrupted:${type}`;
		try {
			const saved = localStorage.getItem(draftKey);
			if (saved) {
				const draft = JSON.parse(saved) as { sessionId: string; results: ProtocolPayload };
				void enqueueAttempt(type, draft)
					.then(() => {
						localStorage.removeItem(draftKey);
						return flushQueue();
					})
					.catch(() => {});
			}
		} catch {
			/* Keep unavailable or malformed storage from blocking a new test. */
		}
		const interval = setInterval(() => {
			if (!engine || submitted) return;
			engine.tick(performance.now());
			update();
		}, 25);
		return () => {
			mounted = false;
			clearInterval(interval);
			cancelAnimationFrame(animationFrame);
		};
	});
</script>

<svelte:window
	onpagehide={() => {
		void saveAborted('technical_error').catch(() => {});
	}}
	onpointerdown={rememberPointer}
	onkeydown={() => {
		inputMode = 'keyboard';
	}}
/>

<section
	class="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 p-3 sm:p-6"
	aria-label={definition.title}
>
	<h1 class="text-center text-xl font-semibold sm:text-2xl">{definition.title}</h1>
	{#if !engine}
		<p class="max-w-xl text-center">{definition.instructions}</p>
		{#if type === 'lexical_decision'}<p
				class="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
			>
				Используется временный словарь и непроверенные псевдослова. Результат не включается
				в профиль.
			</p>{/if}
		<Button color="green" onclick={start}>Начать тест</Button>
	{:else if view?.phase === 'finished' && finishedPayload}
		<Result exerciseType={type} results={finishedPayload.results} meta={finishedPayload.meta} />
		{#if saving}<p role="status">Сохранение…</p>{/if}
		{#if saveError}<p role="alert">{saveError}</p>
			<Button color="blue" onclick={retrySave}>Сохранить снова</Button>{/if}
	{:else if view?.current}
		<div class="flex w-full justify-between gap-3 text-sm" aria-live="polite">
			<span
				>{type === 'sum_matrix'
					? `Матрица ${view.current.trial_index}`
					: `Задание ${view.current.trial_index} из ${definition.count}`}</span
			>
			{#if remaining !== null}<span>Осталось: {remaining} с</span>{/if}
		</div>
		{#if type === 'verbal_classification'}
			<h2 class="text-center text-lg">Что объединяет эти слова?</h2>
			<p class="text-center text-2xl font-semibold">
				{stimulus?.displayed_words?.join(' · ')}
			</p>
			<form
				class="flex w-full max-w-lg flex-col gap-3"
				onsubmit={(event) => {
					event.preventDefault();
					answer(answerText);
				}}
			>
				<label for="classification-answer">Общий признак</label>
				<input
					id="classification-answer"
					class="rounded-lg border border-gray-400 bg-white p-3 text-gray-900"
					bind:value={answerText}
					autocomplete="off"
					disabled={view.phase !== 'answer'}
				/>
				<Button
					color="green"
					type="submit"
					disabled={!answerText.trim() || view.phase !== 'answer'}>Ответить</Button
				>
			</form>
		{:else if type === 'lexical_decision'}
			<p class="py-8 text-center text-4xl font-semibold">{stimulus?.displayed_token}</p>
			<div class="grid w-full grid-cols-2 gap-4">
				<Button
					color="green"
					onclick={() => answer(true)}
					disabled={view.phase !== 'answer'}>Да, реальное слово</Button
				>
				<Button
					color="blue"
					onclick={() => answer(false)}
					disabled={view.phase !== 'answer'}>Нет</Button
				>
			</div>
		{:else if type.startsWith('color_')}
			{#if type === 'color_distance'}
				<p>Эталон</p>
				<div
					class="color-reference"
					style:background-color={`rgb(${stimulus?.reference_srgb?.join(' ')})`}
					aria-label="Цвет эталона"
				></div>
			{/if}
			<div class="grid w-full grid-cols-2 gap-4 sm:gap-8">
				{#each ['A', 'B'] as option (option)}
					<button
						class="color-option"
						style:background-color={`rgb(${(option === 'A' ? stimulus?.option_a_srgb : stimulus?.option_b_srgb)?.join(' ')})`}
						aria-label={`Выбрать вариант ${option}`}
						disabled={view.phase !== 'answer'}
						onclick={() => answer(option)}><span>{option}</span></button
					>
				{/each}
			</div>
		{:else if type === 'motor_button'}
			<div
				class={[
					'indicator',
					view.phase === 'green' || view.phase === 'green_pending' ? 'green' : 'red'
				]}
				aria-label={view.phase === 'green' || view.phase === 'green_pending'
					? 'Зелёный индикатор'
					: 'Красный индикатор'}
			></div>
			<p aria-live="polite">
				{view.phase === 'green' || view.phase === 'green_pending'
					? 'Нажимайте!'
					: 'Ждите зелёного'}
			</p>
			<button
				class="reaction-button"
				onpointerdown={(event) => {
					event.preventDefault();
					rememberPointer(event);
					answer('press');
				}}
				onkeydown={(event) => {
					if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
						event.preventDefault();
						inputMode = 'keyboard';
						answer('press');
					}
				}}>Нажать</button
			>
		{:else}
			{#if type === 'anti_munsterberg'}
				<p class="text-center">
					Найдите слово <strong class="text-xl">{stimulus?.target_word}</strong>
				</p>
				<p class="text-center text-sm">
					{firstCell === null
						? 'Выберите первую клетку слова, затем последнюю.'
						: 'Теперь выберите последнюю клетку. Повторный выбор первой отменит выделение.'}
				</p>
			{:else if type === 'sum_matrix'}
				<div class="flex gap-6 text-xl">
					<p>Цель: <strong>{currentRound?.target_sum}</strong></p>
					<p>Выбрано: <strong>{selectedSum}</strong></p>
				</div>
			{:else}
				<p class="text-center" role="status">
					{view.phase === 'show'
						? 'Запомните узор'
						: view.phase === 'feedback'
							? view.current.is_correct
								? 'Верно!'
								: 'Ошибка — правильный узор'
							: `Выберите ${stimulus?.target_count} клетки. Уровень ${stimulus?.level}`}
				</p>
			{/if}
			<div class="board" style:--columns={gridSize}>
				{#each cells as value, id (`${view.current.trial_index}:${id}`)}
					{@const selected = view.selected.includes(id) || firstCell === id}
					{@const target =
						type === 'memory_matrix' &&
						(view.phase === 'show' || view.phase === 'feedback') &&
						stimulus?.target_cells?.includes(id)}
					{@const locked = stimulus?.locked_cell_ids?.includes(id)}
					<button
						class={[
							'cell',
							{ selected, target, locked, found: foundCells.includes(id) }
						]}
						disabled={view.phase !== 'answer' || locked}
						aria-label={type === 'memory_matrix'
							? `Клетка ${id + 1}`
							: `${value}, строка ${Math.floor(id / gridSize) + 1}, столбец ${(id % gridSize) + 1}`}
						aria-pressed={selected}
						onclick={() => {
							if (type === 'anti_munsterberg' && firstCell === id) firstCell = null;
							else clickCell(id);
						}}>{value}</button
					>
				{/each}
			</div>
			{#if type === 'anti_munsterberg'}
				<Button
					color="blue"
					onclick={() => {
						engine?.stopBoard(performance.now());
						firstCell = null;
						update();
					}}>Закончить поиск</Button
				>
			{/if}
		{/if}
		{#if saveError}<p role="alert">{saveError}</p>
			<Button color="blue" onclick={retrySave}>Сохранить снова</Button>{/if}
		<Button color="red" onclick={abort}>Завершить тест</Button>
	{/if}
</section>

<style>
	.board {
		display: grid;
		grid-template-columns: repeat(var(--columns), minmax(0, 1fr));
		width: min(100%, 38rem);
		gap: clamp(2px, 0.7vw, 5px);
	}
	.cell {
		aspect-ratio: 1;
		min-width: 0;
		border: 1px solid #94a3b8;
		border-radius: 0.25rem;
		background: #f1f5f9;
		color: #172554;
		font-size: clamp(0.65rem, 2.5vw, 1.3rem);
		font-weight: 600;
		cursor: pointer;
		touch-action: manipulation;
	}
	.cell:focus-visible,
	.color-option:focus-visible,
	.reaction-button:focus-visible {
		outline: 3px solid #1d4ed8;
		outline-offset: 3px;
	}
	.cell.selected {
		background: #60a5fa;
		color: #172554;
	}
	.cell.target {
		background: #34d399;
		color: #064e3b;
	}
	.cell.locked,
	.cell.found {
		background: #cbd5e1;
		color: #475569;
	}
	.color-option {
		position: relative;
		width: 100%;
		height: clamp(9rem, 30vw, 16rem);
		border: 2px solid #64748b;
		border-radius: 1rem;
		cursor: pointer;
		touch-action: manipulation;
	}
	.color-option span {
		position: absolute;
		bottom: 0.75rem;
		left: 50%;
		transform: translateX(-50%);
		padding: 0.2rem 0.75rem;
		border-radius: 0.5rem;
		background: white;
		color: #111827;
	}
	.color-reference {
		width: 8rem;
		height: 6rem;
		border: 2px solid #64748b;
		border-radius: 0.75rem;
	}
	.indicator {
		width: 9rem;
		height: 9rem;
		border: 4px solid #475569;
		border-radius: 50%;
	}
	.indicator.red {
		background: #dc2626;
	}
	.indicator.green {
		background: #16a34a;
	}
	.reaction-button {
		width: min(100%, 22rem);
		min-height: 6rem;
		border-radius: 1rem;
		background: #364b6c;
		color: white;
		font-size: 1.5rem;
		font-weight: 600;
		cursor: pointer;
		touch-action: none;
	}
</style>
