<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { invalidateAll } from '$app/navigation';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Create state
	let newWords = $state('');
	let isCreating = $state(false);
	let createError = $state<string | null>(null);

	// Generate state
	let generateCount = $state(5);
	let isGenerating = $state(false);
	let generateError = $state<string | null>(null);

	// Edit state — track which set is being edited
	let editingId = $state<string | null>(null);
	let editWords = $state('');
	let isSaving = $state(false);
	let editError = $state<string | null>(null);

	// Delete state
	let deletingId = $state<string | null>(null);
	let deleteError = $state<string | null>(null);

	function startEdit(id: string, words: string[]) {
		editingId = id;
		editWords = words.join(', ');
		editError = null;
	}

	function cancelEdit() {
		editingId = null;
		editWords = '';
		editError = null;
	}

	async function handleCreate() {
		const words = newWords
			.split(/[,\n]/)
			.map((w) => w.trim().toLowerCase())
			.filter(Boolean);
		if (words.length !== 5) {
			createError = 'Нужно ровно 5 слов (через запятую)';
			return;
		}
		isCreating = true;
		createError = null;
		try {
			const form = new FormData();
			form.set('words', words.join(','));
			await fetch('?/create', { method: 'POST', body: form });
			newWords = '';
			await invalidateAll();
		} catch {
			createError = 'Ошибка создания сета';
		} finally {
			isCreating = false;
		}
	}

	async function handleGenerate() {
		if (generateCount < 1) return;
		isGenerating = true;
		generateError = null;
		try {
			const form = new FormData();
			form.set('count', String(generateCount));
			await fetch('?/generate', { method: 'POST', body: form });
			await invalidateAll();
		} catch {
			generateError = 'Ошибка генерации';
		} finally {
			isGenerating = false;
		}
	}

	async function handleSaveEdit(id: string) {
		const words = editWords
			.split(/[,\n]/)
			.map((w) => w.trim().toLowerCase())
			.filter(Boolean);
		if (words.length !== 5) {
			editError = 'Нужно ровно 5 слов';
			return;
		}
		isSaving = true;
		editError = null;
		try {
			const form = new FormData();
			form.set('id', id);
			form.set('words', words.join(','));
			await fetch('?/update', { method: 'POST', body: form });
			editingId = null;
			editWords = '';
			await invalidateAll();
		} catch {
			editError = 'Ошибка сохранения';
		} finally {
			isSaving = false;
		}
	}

	async function handleDelete(id: string) {
		deletingId = id;
		deleteError = null;
		try {
			const form = new FormData();
			form.set('id', id);
			await fetch('?/delete', { method: 'POST', body: form });
			await invalidateAll();
		} catch {
			deleteError = 'Ошибка удаления';
		} finally {
			deletingId = null;
		}
	}

	function formatDate(dateStr: string | null) {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleString('ru-RU');
	}
</script>

<section class="banner">
	<h1 class="text-2xl font-bold">Сеты слов ГТО-М</h1>
</section>

<main class="main overflow-auto p-4">
	<div class="flex flex-col gap-6">
		<!-- Generate random sets -->
		<div class="flex flex-col gap-3 rounded-xl border border-gray-700 bg-gray-800/30 p-4">
			<h2 class="text-lg font-semibold">Сгенерировать случайные сеты</h2>
			{#if generateError}
				<p class="rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-300">
					{generateError}
				</p>
			{/if}
			<div class="flex items-end gap-3">
				<label class="flex flex-col gap-1">
					<span class="text-xs text-gray-400">Количество сетов</span>
					<input
						type="number"
						min="1"
						max="50"
						bind:value={generateCount}
						class="w-24 rounded-lg bg-gray-700 px-3 py-2 text-sm"
					/>
				</label>
				<Button color="blue" onclick={handleGenerate} disabled={isGenerating}>
					{isGenerating ? 'Генерация...' : 'Сгенерировать'}
				</Button>
			</div>
		</div>

		<!-- Create manually -->
		<div class="flex flex-col gap-3 rounded-xl border border-gray-700 bg-gray-800/30 p-4">
			<h2 class="text-lg font-semibold">Создать сет вручную</h2>
			{#if createError}
				<p class="rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-300">{createError}</p>
			{/if}
			<div class="flex flex-col gap-2">
				<label class="flex flex-col gap-1">
					<span class="text-xs text-gray-400">5 слов через запятую</span>
					<input
						type="text"
						bind:value={newWords}
						class="rounded-lg bg-gray-700 px-3 py-2 text-sm"
						placeholder="слово1, слово2, слово3, слово4, слово5"
					/>
				</label>
				<Button color="green" onclick={handleCreate} disabled={isCreating}>
					{isCreating ? 'Создание...' : 'Создать'}
				</Button>
			</div>
		</div>

		<!-- Existing sets -->
		<div class="flex flex-col gap-3">
			<div class="flex items-center gap-3">
				<h2 class="text-lg font-semibold">Существующие сеты</h2>
				<span class="text-sm text-gray-400">({data.wordSets.length})</span>
			</div>

			{#if deleteError}
				<p class="rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-300">{deleteError}</p>
			{/if}

			{#if data.wordSets.length === 0}
				<div class="flex flex-col items-center gap-2 py-8 text-gray-400">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-10 w-10 opacity-40"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="1.5"
							d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
						/>
					</svg>
					<p>Нет созданных сетов слов</p>
				</div>
			{:else}
				<div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
					{#each data.wordSets as ws (ws.id)}
						<div
							class="flex flex-col gap-3 rounded-xl border border-gray-700 bg-gray-800/50 p-4"
						>
							<div class="flex items-center justify-between">
								<span class="text-sm font-semibold text-gray-300"
									>Сет {ws.setNumber}</span
								>
								<span class="text-xs text-gray-500">{formatDate(ws.createdAt)}</span
								>
							</div>

							{#if editingId === ws.id}
								<!-- Edit mode -->
								{#if editError}
									<p
										class="rounded-lg bg-red-900/30 px-3 py-1.5 text-xs text-red-300"
									>
										{editError}
									</p>
								{/if}
								<input
									type="text"
									bind:value={editWords}
									class="rounded-lg bg-gray-700 px-3 py-2 text-sm"
								/>
								<div class="flex items-center gap-2">
									<Button
										color="green"
										onclick={() => handleSaveEdit(ws.id)}
										disabled={isSaving}
									>
										{isSaving ? 'Сохранение...' : 'Сохранить'}
									</Button>
									<Button color="gray" onclick={cancelEdit}>Отмена</Button>
								</div>
							{:else}
								<!-- Display mode -->
								<div class="flex flex-wrap gap-1.5">
									{#each ws.words as word, i}
										<span
											class="rounded-md bg-gray-700 px-2.5 py-1 text-sm font-medium text-gray-200"
										>
											<span class="mr-1 text-xs text-gray-500">{i + 1}.</span
											>{word}
										</span>
									{/each}
								</div>
								<div class="flex items-center gap-2">
									<button
										class="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-gray-300 transition hover:bg-gray-700"
										onclick={() => startEdit(ws.id, ws.words)}
										aria-label="Редактировать сет {ws.setNumber}"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-3.5 w-3.5"
											viewBox="0 0 20 20"
											fill="currentColor"
										>
											<path
												d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"
											/>
										</svg>
										Изменить
									</button>
									<button
										class="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-red-300 transition hover:bg-red-900/30 disabled:opacity-30"
										disabled={deletingId === ws.id}
										onclick={() => handleDelete(ws.id)}
										aria-label="Удалить сет {ws.setNumber}"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-3.5 w-3.5"
											viewBox="0 0 20 20"
											fill="currentColor"
										>
											<path
												fill-rule="evenodd"
												d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
												clip-rule="evenodd"
											/>
										</svg>
										Удалить
									</button>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</main>

<section class="low-content flex items-center justify-center gap-3">
	<Button color="gray" goto="/admin/gto">← Сессии ГТО-М</Button>
	<Button color="gray" goto="/admin">← Админка</Button>
</section>
