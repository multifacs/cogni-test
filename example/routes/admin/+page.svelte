<script>
	import { onMount } from 'svelte';

	let testSlugs = $state([]);
	let selectedSlug = $state('');
	let attempts = $state([]);
	let loading = $state(false);
	let error = $state('');

	onMount(async () => {
		await loadTestSlugs();
	});

	async function loadTestSlugs() {
		try {
			const res = await fetch('/api/admin/test-slugs');
			testSlugs = await res.json();
			selectedSlug = '';
		} catch (e) {
			error = `Ошибка загрузки: ${e.message}`;
		}
	}

	async function loadAttempts() {
		loading = true;
		try {
			const url = selectedSlug ? `/api/admin/attempts?slug=${selectedSlug}` : '/api/admin/attempts';
			const res = await fetch(url);
			attempts = await res.json();
			error = '';
		} catch (e) {
			error = `Ошибка загрузки попыток: ${e.message}`;
		} finally {
			loading = false;
		}
	}

	async function deleteAttempt(id) {
		if (!confirm('Удалить эту попытку?')) return;
		try {
			await fetch(`/api/admin/attempts/${id}`, { method: 'DELETE' });
			await loadAttempts();
			error = '';
		} catch (e) {
			error = `Ошибка удаления: ${e.message}`;
		}
	}

	function formatDate(date) {
		return new Intl.DateTimeFormat('ru-RU', {
			dateStyle: 'short',
			timeStyle: 'short'
		}).format(new Date(date));
	}

	$effect(() => {
		loadAttempts();
	});
</script>

<div class="admin-panel">
	<h1>Админ-панель</h1>

	{#if error}
		<div class="alert alert-error">{error}</div>
	{/if}

	<div class="filters">
		<label>
			Выберите тест:
			<select bind:value={selectedSlug}>
				<option value="">Все тесты</option>
				{#each testSlugs as slug (slug)}
					<option value={slug}>{slug}</option>
				{/each}
			</select>
		</label>
	</div>

	{#if loading}
		<h1>Загрузка...</h1>
	{:else}
		<div class="stats">
			<div class="stat-card">
				<strong>{attempts.length}</strong>
				<p>попыток</p>
			</div>
			{#if attempts.length > 0}
				<div class="stat-card">
					<strong>{(attempts.reduce((s, a) => s + (a.score || 0), 0) / attempts.length).toFixed(1)}</strong>
					<p>средний балл</p>
				</div>
			{/if}
		</div>

		<table>
			<thead>
				<tr>
					<th>ID</th>
					<th>Пользователь</th>
					<th>Тест</th>
					<th>Дата</th>
					<th>Балл</th>
					<th>Нормализованный</th>
					<th>Время (мс)</th>
					<th>Действие</th>
				</tr>
			</thead>
			<tbody>
				{#each attempts as attempt (attempt.id)}
					<tr>
						<td class="mono">{attempt.id.slice(0, 8)}</td>
						<td>{attempt.userId.slice(0, 8)}</td>
						<td>{attempt.testSlug}</td>
						<td>{formatDate(attempt.startedAt)}</td>
						<td>{attempt.score}/{attempt.maxScore}</td>
						<td>{attempt.normalizedScore}</td>
						<td>{attempt.durationMs}</td>
						<td>
							<button onclick={() => deleteAttempt(attempt.id)} class="btn-delete">🗑️</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>

		{#if attempts.length === 0}
			<p class="empty">Нет данных по этому тесту</p>
		{/if}
	{/if}
</div>

<style>
	.admin-panel {
		padding: 2rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	h1 {
		text-align: center;
		margin-bottom: 1.5rem;
		color: white;
	}

	label {
		padding: 1rem;
		background: #22334d;
		border-radius: 0.5rem;
		color: white;
	}

	.alert {
		padding: 1rem;
		border-radius: 0.5rem;
		margin-bottom: 1rem;
		border-left: 4px solid;
	}

	.alert-error {
		background-color: #fee;
		border-color: #c33;
		color: #c33;
	}


	.filters {
		/* text-align: center; */
		margin-bottom: 2rem;
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	select {
		margin-top: 5%;
		appearance: base-select;
		width: 100%;
		color: white;
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 0.25rem;
		font-size: 1rem;
	}

	select option {
		background-color: #22334d;;
		color: #ffffff;
	}

	.stats {
		display: flex;
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.stat-card {
		flex: 1;
		padding: 1rem;
		background: #22334d;
		color: white;
		border-radius: 0.5rem;
		text-align: center;
	}

	.stat-card strong {
		display: block;
		font-size: 2rem;
		margin-bottom: 0.5rem;
	}

	.stat-card p {
		margin: 0;
		opacity: 0.9;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		border: 1px solid #ddd;
		border-radius: 0.5rem;
		overflow: hidden;
	}

	thead {
		background-color: #f5f5f5;
	}

	th {
		padding: 0.75rem;
		text-align: left;
		font-weight: 600;
		border-bottom: 2px solid #ddd;
	}

	td {
		padding: 0.75rem;
		border-bottom: 1px solid #eee;
	}

	tr {
		color: white;
		background: #22334d;
	}

	tr:hover {
		background-color: rgb(184, 184, 184);
	}

	.mono {
		font-family: monospace;
		font-size: 0.85em;
	}

	.btn-delete {
		background: none;
		border: none;
		cursor: pointer;
		font-size: 1.2rem;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		transition: background-color 0.2s;
	}

	.btn-delete:hover {
		background-color: #ffebee;
	}

	.empty {
		text-align: center;
		color: #999;
		padding: 2rem;
	}
</style>
