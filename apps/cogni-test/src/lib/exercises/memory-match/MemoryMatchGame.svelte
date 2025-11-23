<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { IMAGE_URLS, OVERLAY_URL } from './images';

	const dispatch = createEventDispatcher<{ done: FullResult }>();

	// ---- Types ----
	export interface StageConfig {
		stage: number;
		rows: number;
		cols: number;
	}
	export interface Card {
		id: number;
		key: string; // url изображения — ключ пары
		label: string; // человекочитаемое имя
		imgUrl: string;
		isOpen: boolean; // лицом вверх?
		isMatched: boolean; // найдена пара?
	}
	export interface StageResult {
		stage: number;
		durationMs: number;
		cardsCount: number;
		flipsCount: number;
		mistakes: number;
	}
	export interface FullResult {
		perStage: StageResult[];
		totalDurationMs: number;
		totalFlips: number;
		totalMistakes: number;
		seed: string;
	}

	// ---- Config ----
	export let stages: StageConfig[] = [
		{ stage: 1, rows: 3, cols: 4 },
		{ stage: 2, rows: 4, cols: 4 },
		{ stage: 3, rows: 4, cols: 5 }
	];

	const FLIP_MS = 220; // длительность флипа
	const MISMATCH_SHOW_MS = 650; // держим неверную пару открытой

	// ---- State ----
	let currentStageIndex = 0;
	let currentCards: Card[] = [];
	let openedIdx: number[] = []; // индексы открытых карт (0..2)
	let stageStartTs = 0;
	let flipsCount = 0;
	let mistakes = 0;
	let perStage: StageResult[] = [];
	function safeUUID() {
		// если есть нативный — используем
		if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
			try {
				return crypto.randomUUID();
			} catch {}
		}
		// простой фолбэк
		const rnd = () =>
			Math.floor((1 + Math.random()) * 0x10000)
				.toString(16)
				.slice(1);
		return `${rnd()}${rnd()}-${rnd()}-${rnd()}-${rnd()}-${rnd()}${rnd()}${rnd()}`;
	}

	let seed = safeUUID();

	let lockBoard = false;

	// ---- Helpers ----
	function basenameToLabel(url: string) {
		const file = url.split('/').pop() || url;
		return file
			.replace(/-svgrepo-com\.svg$/i, '')
			.replace(/\.svg$/i, '')
			.replace(/[-_]+/g, ' ')
			.replace(/\b([a-z])/g, (m) => m.toUpperCase());
	}
	function hashSeed(s: string) {
		let h = 2166136261 >>> 0;
		for (let i = 0; i < s.length; i++) {
			h ^= s.charCodeAt(i);
			h = Math.imul(h, 16777619);
		}
		return h >>> 0;
	}
	function mulberry32(a: number) {
		return function () {
			let t = (a += 0x6d2b79f5);
			t = Math.imul(t ^ (t >>> 15), t | 1);
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}
	function shuffleInPlace<T>(arr: T[], rnd: () => number) {
		for (let i = arr.length - 1; i > 0; i--) {
			const j = Math.floor(rnd() * (i + 1));
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
	}

	function generateStageCards(cfg: StageConfig, stageSeed: string): Card[] {
		const total = cfg.rows * cfg.cols;
		const pairs = Math.floor(total / 2);

		// берём первые N картинок, при нехватке циклим
		const imgs: string[] = [];
		for (let i = 0; i < pairs; i++) imgs.push(IMAGE_URLS[i % IMAGE_URLS.length]);

		const rnd = mulberry32(hashSeed(stageSeed));
		const pool = imgs.flatMap((u) => [{ imgUrl: u }, { imgUrl: u }]);
		shuffleInPlace(pool, rnd);

		return pool.map((p, idx) => ({
			id: idx,
			key: p.imgUrl,
			label: basenameToLabel(p.imgUrl),
			imgUrl: p.imgUrl,
			isOpen: false,
			isMatched: false
		}));
	}

	function printGridAndPairsToConsole(cfg: StageConfig, cards: Card[]) {
		const cols = cfg.cols;
		console.group(
			`[memory-match] stage=${cfg.stage} grid=${cfg.cols}x${cfg.rows} cards=${cfg.rows * cfg.cols}`
		);

		const table: Record<string, string>[] = [];
		for (let r = 0; r < cfg.rows; r++) {
			const row: Record<string, string> = {};
			for (let c = 0; c < cfg.cols; c++) {
				const i = r * cols + c;
				row[`c${c + 1}`] = `${cards[i].label} (#${i})`;
			}
			table.push(row);
		}
		console.table(table);

		const byKey: Record<string, number[]> = {};
		cards.forEach((c, i) => (byKey[c.key] ||= []).push(i));
		Object.entries(byKey).forEach(([key, pos]) => {
			const r1 = Math.floor(pos[0] / cols) + 1,
				c1 = (pos[0] % cols) + 1;
			const r2 = Math.floor(pos[1] / cols) + 1,
				c2 = (pos[1] % cols) + 1;
			console.log(
				`${basenameToLabel(key)}: #${pos[0]} (r${r1},c${c1}) & #${pos[1]} (r${r2},c${c2})`
			);
		});
		console.groupEnd();
	}

	function startStage(idx: number) {
		const cfg = stages[idx];
		currentCards = generateStageCards(cfg, `${seed}#stage${cfg.stage}`);
		openedIdx = [];
		flipsCount = 0;
		mistakes = 0;
		stageStartTs = performance.now();
		printGridAndPairsToConsole(cfg, currentCards);
	}

	function finishStage() {
		const cfg = stages[currentStageIndex];
		const durationMs = Math.round(performance.now() - stageStartTs);
		perStage = [
			...perStage,
			{ stage: cfg.stage, durationMs, cardsCount: cfg.rows * cfg.cols, flipsCount, mistakes }
		];
	}

	function isStageCompleted() {
		return currentCards.every((c) => c.isMatched);
	}

	// === Новая логика клика с ИММУТАБЕЛЬНЫМИ обновлениями ===
	async function onCardClick(i: number) {
		const card = currentCards[i];
		if (card.isMatched || card.isOpen) return;

		// открыть
		currentCards = [
			...currentCards.slice(0, i),
			{ ...card, isOpen: true },
			...currentCards.slice(i + 1)
		];
		openedIdx = [...openedIdx, i];
		flipsCount++;

		if (openedIdx.length === 2) {
			const [aIdx, bIdx] = openedIdx;
			const a = currentCards[aIdx];
			const b = currentCards[bIdx];

			if (a.key === b.key) {
				// совпадение
				currentCards = currentCards.map((c, idx) =>
					idx === aIdx || idx === bIdx ? { ...c, isMatched: true } : c
				);
				openedIdx = [];

				if (isStageCompleted()) {
					finishStage();
					nextStage();
				}
			} else {
				// промах — не блокируем клики, но закрываем через таймер
				mistakes++;
				const [x, y] = openedIdx;
				setTimeout(() => {
					currentCards = currentCards.map((c, idx) =>
						idx === x || idx === y ? { ...c, isOpen: false } : c
					);
				}, MISMATCH_SHOW_MS);
				openedIdx = [];
			}
		}
	}

	function nextStage() {
		if (currentStageIndex + 1 < stages.length) {
			currentStageIndex++;
			startStage(currentStageIndex);
		} else {
			const totalDurationMs = perStage.reduce((s, r) => s + r.durationMs, 0);
			const totalFlips = perStage.reduce((s, r) => s + r.flipsCount, 0);
			const totalMistakes = perStage.reduce((s, r) => s + r.mistakes, 0);
			dispatch('done', { perStage, totalDurationMs, totalFlips, totalMistakes, seed });
		}
	}

	function startGame() {
		seed = safeUUID();
		currentStageIndex = 0;
		perStage = [];
		startStage(0);
	}

	$: grid = stages[currentStageIndex]
		? `repeat(${stages[currentStageIndex].cols}, minmax(72px, 1fr))`
		: 'repeat(4, 1fr)';
</script>

<div class="flex flex-col items-center justify-center gap-4">
	{#if !currentCards.length}
		<div class="flex flex-col items-center justify-center gap-4">
			<div class="muted">Этапы: {stages.map((s) => `${s.rows}×${s.cols}`).join(' · ')}</div>
			<button class="btn btn-primary" on:click={startGame}>Начать</button>
		</div>
	{:else}
			<div class="muted flex flex-col items-center justify-center gap-2">
				<p>
					Этап {stages[currentStageIndex].stage} из {stages.length} ({stages[
						currentStageIndex
					].cols}×{stages[currentStageIndex].rows})
				</p>
				<p>Открытий: {flipsCount}</p>
				<p>Ошибок: {mistakes}</p>
			</div>

		<div class="board" style={`grid-template-columns:${grid};`}>
			{#each currentCards as c, i (c.id)}
				<button
					class="card"
					class:open={c.isOpen}
					class:matched={c.isMatched}
					disabled={lockBoard || c.isMatched}
					aria-label={c.label}
					on:click={() => onCardClick(i)}
					title={c.label}
				>
					<div class="inner">
						<div class="face front">
							<img src={c.imgUrl} alt={c.label} />
						</div>
						<div class="face back">
							<img src={OVERLAY_URL} alt="" />
						</div>
					</div>
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	:global(:root) {
		--flip-ms: 220ms;
		--match-bg: rgba(0, 255, 120, 0.18);
		--match-ring: rgba(0, 255, 120, 0.85);
	}

	.wrap {
		padding: 1rem;
	}
	h1 {
		font-weight: 800;
		font-size: 1.6rem;
		margin: 0;
	}
	.muted {
		opacity: 0.75;
		font-size: 0.95rem;
	}
	.head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}
	.btn {
		padding: 0.6rem 1rem;
		border-radius: 0.8rem;
		border: 1px solid rgba(255, 255, 255, 0.2);
		background: transparent;
	}
	.btn-primary {
		background: #fff;
		color: #111;
		border-color: #fff;
	}

	.board {
		display: grid;
		gap: 0.4rem; /* меньше расстояние */
		width: 100%;
		max-width: 100vw; /* не шире экрана */
	}
	.card {
		position: relative;
		aspect-ratio: 1 / 1; /* квадратные */
		border-radius: 0.6rem;
		border: 1px solid rgba(255, 255, 255, 0.14);
		background: rgba(255, 255, 255, 0.06);
		perspective: 800px;
		cursor: pointer;
		transition:
			box-shadow 0.15s ease,
			transform 0.08s ease,
			border-color 0.15s ease,
			background 0.15s ease;
		overflow: hidden;
	}
	.card:active {
		transform: translateY(1px);
	}
	.card[disabled] {
		cursor: default;
	}

	/* matched — остаётся открытой с подсветкой */
	.card.matched {
		background: var(--match-bg);
		border-color: var(--match-ring);
		box-shadow: 0 0 0 2px var(--match-ring) inset;
	}

	.inner {
		position: absolute;
		inset: 0;
		transform-style: preserve-3d;
		transition: transform var(--flip-ms) ease;
		border-radius: 0.6rem;
	}

	.card .inner {
		transform: rotateY(0deg);
	}
	.card.open .inner {
		transform: rotateY(180deg);
	}

	.face {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		backface-visibility: hidden;
		border-radius: 0.6rem;
	}

	.front {
		transform: rotateY(180deg);
	}
	.back {
		transform: rotateY(0deg);
	}

	.face img {
		width: 70%;
		height: 70%;
		object-fit: contain;
		filter: drop-shadow(0 3px 10px rgba(0, 0, 0, 0.35));
		user-select: none;
		pointer-events: none;
	}
</style>
