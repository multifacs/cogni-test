<script>
	import { SvelteSet } from "svelte/reactivity";
    import { submitAttempt } from '$lib/tests/recordAttempt';
	// Svelte 5 runes
	let n = $state(30); // сколько чисел всего
	let m = $state(5);  // сколько нужно найти

	let errors = $state(0); // ошибки

	let numbers = $state([]);
	let targets = $state(new Set());
	let found = $state(new Set());

	let started = $state(false);
	let startTime = $state(0);
	let elapsed = $state(0);
	let intervalId = null;

	function generateTest() {
		if (m > n) {
			alert("m не может быть больше n");
			return;
		}

		// генерируем уникальные числа
		const arr = new SvelteSet();
		while (arr.size < n) {
			arr.add(Math.floor(Math.random() * 1000));
		}
		numbers = Array.from(arr);

		// выбираем m случайных целей
		const shuffled = [...numbers].sort(() => Math.random() - 0.5);
		targets = new Set(shuffled.slice(0, m));

		found = new SvelteSet();
		
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

	function handleClick(num) {
		if (!started) return;

		if (targets.has(num)) {
			found.add(num);
			found = new SvelteSet(found);

			// завершение теста
			if (found.size === targets.size) {
				stopTimer();
				alert(`Готово! Время: ${elapsed} сек`);
				started = false;
				void sendAttemptToServer();
			}
		}
		else {
			errors+=1;
		}
	}

	// Отправка результатов в БД через единый API
	const sendAttemptToServer = async () => {
		const correct = found.size;

		const meta = {
			n: targets.size,
			m: found.size,
			errors: errors
		};

		await submitAttempt({
			testSlug: 'attention',
			startedAt: new Date(startTime).toISOString(),
			durationMs: Date.now() - startTime,
			score: correct,
			maxScore: targets.size,
			normalizedScore: Math.round((correct / targets.size) * 100),
			meta,
			answers: []
		});
	};

</script>

<div class="controls">
	<label>
		Всего чисел (n):
		<input type="number" bind:value={n} min="1" />
	</label>

	<label>
		Найти чисел (m):
		<input type="number" bind:value={m} min="1" />
	</label>

	<button class="start" onclick={generateTest}>
		Старт
	</button>
</div>

<div class="results">
	<p>Время: {elapsed} сек</p>
	<p class="error">Ошибки: {errors}</p>
	<p class="found">Найдено: {found.size} / {targets.size}</p>
</div>

{#if started}
	<p class="targets"><strong>Найди числа:</strong> {[...targets].join(', ')}</p>


<div class="grid">
	{#each numbers as num (num)}
		<button class="number-button"
			class:selected={found.has(num)}
			onclick={() => handleClick(num)}
		>
			{num}
		</button>
	{/each}
</div>

{/if}

<style>
	:global(body) {
		margin: 0;
		font-family: Arial, sans-serif;
		/* background: #0c1452; */
		color: black;
	}

	h1 {
		text-align: center;
		margin-bottom: 20px;
	}

	.controls,
	.grid,
	p {
		max-width: 900px;
		margin-inline: auto;
		/* text-align: ; */
	}

.results {
    display: grid;
    grid-template-columns: repeat(3, auto);
    gap: 15px;
    justify-content: center;
    margin-top: 20px;
}

.results p {
    text-align: center;
    font-size: 1em;
    background-color: #364b6c;
    padding: 2em;
    border-radius: 8px;
    margin: 0;
}

	.error {
		color: #ff4d4d !important;
		font-size: 1rem;
		font-weight: 600;
	}

	.found {
		color: #4caf50 !important;
		font-size: 1rem;
		font-weight: 600;
	}

	.targets {
		text-align: center;
		font-size: 1.2em;
		margin-top: 20px;
		color: white;
	}

	.controls {
		display: flex;
		/* align-items: center; */
		gap: 10px;
		margin-bottom: 20px;
		flex-wrap: wrap;
		padding: 20px;
		background: #364b6c;
		border-radius: 20px;
		backdrop-filter: blur(8px);
	}

	label {
		display: flex;
		/* align-items: center; */
		flex-direction: column;
		gap: 5px;
	}

	input {
		padding: 8px 12px;
		border: none;
		border-radius: 12px;
		outline: none;
	}

	.start {
		padding: 20px 24px;
		background: white;
		color: #0c1452;
		border: none;
		border-radius: 14px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: transform 0.2s, opacity 0.2s;
	}

	.number-button {
		padding: 10px 14px;
		border: none;
		border-radius: 14px;
		cursor: pointer;
		font-size: 16px;
		transition: 0.2s;
	}

	.number-button:hover {
		transform: scale(1.03);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
		gap: 12px;
		padding: 20px;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 24px;
		backdrop-filter: blur(8px);
		margin-top: 20px;
	}

	.grid button {
		background: white;
		color: #0c1452;
		font-weight: bold;
		min-height: 60px;
	}

	.selected {
		background: #4caf50 !important;
		color: black !important;
	}
</style>