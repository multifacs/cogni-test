<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { filterWords, pickRandom } from '$lib/words';
	import { missingFieldLabels } from '$lib/survey-field-labels';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let selectedUsers = $state<Set<string>>(new Set());

	// Default session name with current date/time
	const now = new Date();
	const dd = String(now.getDate()).padStart(2, '0');
	const mm = String(now.getMonth() + 1).padStart(2, '0');
	const yy = String(now.getFullYear()).slice(2);
	const hh = String(now.getHours()).padStart(2, '0');
	const min = String(now.getMinutes()).padStart(2, '0');
	let sessionName = $state(`Сессия ГТО-М ${dd}/${mm}/${yy} ${hh}-${min}`);
	let wordsInput = $state('');
	let isGenerating = $state(false);

	async function generateRandomWords() {
		isGenerating = true;
		try {
			const response = await fetch('/words');
			if (!response.ok) {
				console.error('Failed to load words');
				return;
			}
			const text = await response.text();
			const allWords = filterWords(text);
			wordsInput = pickRandom(allWords, 5).join(',');
		} finally {
			isGenerating = false;
		}
	}

	function toggleUser(id: string) {
		if (selectedUsers.has(id)) {
			selectedUsers.delete(id);
		} else {
			selectedUsers.add(id);
		}
		selectedUsers = new Set(selectedUsers); // trigger reactivity
	}

	function formatDate(dateStr: string | null) {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleString('ru-RU');
	}

	// Word sets
	let wordSetsOpen = $state(false);
	let generateCount = $state(5);
	let isGeneratingSets = $state(false);
	let deletingSetId = $state<string | null>(null);

	async function handleGenerateWordSets() {
		if (generateCount < 1) return;
		isGeneratingSets = true;
		const form = new FormData();
		form.set('count', String(generateCount));
		try {
			await fetch('?/generateWordSets', { method: 'POST', body: form });
			location.reload();
		} catch {
			isGeneratingSets = false;
		}
	}

	async function handleDeleteWordSet(id: string) {
		deletingSetId = id;
		try {
			await fetch(`/api/word-sets/${id}`, { method: 'DELETE' });
			location.reload();
		} catch {
			deletingSetId = null;
		}
	}

	// Search and filter
	let searchQuery = $state('');
	let filterRecent = $state(false);

	const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

	let filteredUsers = $derived(
		data.users.filter((u) => {
			const q = searchQuery.toLowerCase().trim();
			if (q) {
				const text = `${u.firstname} ${u.lastname} ${u.id} ${u.sex === 'male' ? 'М' : 'Ж'} ${u.missingSurveyFields.length} ${u.gtoId || ''}`.toLowerCase();
				if (!text.includes(q)) return false;
			}
			if (filterRecent) {
				if (!u.lastActiveAt) return false;
				const la = new Date(u.lastActiveAt);
				if (la < sevenDaysAgo) return false;
			}
			return true;
		})
	);
</script>

<section class="banner">
	<h1 class="text-2xl font-bold">Управление сессиями ГТО-М</h1>
</section>

<main class="main overflow-auto p-4">
	<div class="flex flex-col gap-6">
		<!-- Word Sets -->
		<div class="flex flex-col gap-2">
			<button
				class="flex items-center gap-2 text-left text-xl font-semibold"
				onclick={() => (wordSetsOpen = !wordSetsOpen)}
			>
				<span>{wordSetsOpen ? '▼' : '▶'}</span>
				<span>Сеты слов</span>
			</button>

			{#if wordSetsOpen}
				<div class="flex flex-col gap-3">
					{#if data.wordSets.length > 0}
						<div class="overflow-x-auto">
							<table class="w-full text-sm">
								<thead>
									<tr class="border-b border-gray-600">
										<th class="p-2 text-left">#</th>
										<th class="p-2 text-left">Слово 1</th>
										<th class="p-2 text-left">Слово 2</th>
										<th class="p-2 text-left">Слово 3</th>
										<th class="p-2 text-left">Слово 4</th>
										<th class="p-2 text-left">Слово 5</th>
										<th class="p-2 text-left">Дата</th>
										<th class="p-2 text-left"></th>
									</tr>
								</thead>
								<tbody>
									{#each data.wordSets as ws}
										<tr class="border-b border-gray-700 hover:bg-gray-700">
											<td class="p-2">{ws.setNumber}</td>
											<td class="p-2">{ws.words[0]}</td>
											<td class="p-2">{ws.words[1]}</td>
											<td class="p-2">{ws.words[2]}</td>
											<td class="p-2">{ws.words[3]}</td>
											<td class="p-2">{ws.words[4]}</td>
											<td class="p-2 text-xs opacity-60">
												{formatDate(ws.createdAt)}
											</td>
											<td class="p-2">
												<Button
													color="red"
													kind="small"
													disabled={deletingSetId === ws.id}
													onclick={() => handleDeleteWordSet(ws.id)}
												>
													{deletingSetId === ws.id ? '...' : '✕'}
												</Button>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{:else}
						<p class="text-sm opacity-60">Нет сгенерированных сетов слов</p>
					{/if}

				<div class="flex items-center gap-2">
					<label class="text-sm" for="generate-count">Количество сетов:</label>
					<input
						id="generate-count"
						type="number"
						min="1"
						max="50"
						bind:value={generateCount}
						class="w-20 rounded-lg bg-gray-700 p-2 text-white"
					/>
						<Button
							color="blue"
							onclick={handleGenerateWordSets}
							disabled={isGeneratingSets}
						>
							{isGeneratingSets ? 'Генерация...' : 'Сгенерировать'}
						</Button>
					</div>
				</div>
			{/if}
		</div>

		<!-- Create session form -->
		<form method="POST" action="?/create" class="flex flex-col gap-4">
			<h2 class="text-xl font-semibold">Создать сессию</h2>

			<div class="flex flex-col gap-2">
				<label class="text-sm font-medium" for="session-name">Название сессии</label>
				<input
					id="session-name"
					type="text"
					name="name"
					bind:value={sessionName}
					class="rounded-lg bg-gray-700 p-2 text-white"
				/>
			</div>

			<div class="flex flex-col gap-2">
				<div class="flex items-center justify-between">
					<label class="text-sm font-medium" for="words-input"
						>Слова для последовательности (через запятую, до 5)</label
					>
					<Button color="blue" onclick={generateRandomWords} disabled={isGenerating}>
						{isGenerating ? 'Генерация...' : '🎲 Случайные'}
					</Button>
				</div>
				<textarea
					id="words-input"
					name="words"
					bind:value={wordsInput}
					rows="2"
					class="rounded-lg bg-gray-700 p-2 text-white"
					placeholder="слово1, слово2, слово3, слово4, слово5"
				></textarea>
			</div>

			<!-- Hidden inputs for selected users -->
			{#each Array.from(selectedUsers) as userId}
				<input type="hidden" name="participantIds" value={userId} />
			{/each}

			<div class="flex flex-col gap-2">
				<div class="flex flex-wrap items-center gap-3">
					<h3 class="text-lg font-medium">Выберите участников</h3>
					<input
						type="text"
						placeholder="Поиск..."
						bind:value={searchQuery}
						class="rounded-lg bg-gray-700 px-3 py-1 text-sm text-white"
					/>
					<label class="flex items-center gap-1 text-sm">
						<input type="checkbox" bind:checked={filterRecent} />
						Недавно вошедшие
					</label>
				</div>
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b border-gray-600">
								<th class="p-2 text-left"></th>
								<th class="p-2 text-left">ID</th>
								<th class="p-2 text-left">Имя</th>
								<th class="p-2 text-left">Фамилия</th>
								<th class="p-2 text-left">Пол</th>
								<th class="p-2 text-left">ГТО-М ID</th>
								<th class="p-2 text-left">Незаполненные поля</th>
								<th class="p-2 text-left">Последняя активность</th>
							</tr>
						</thead>
						<tbody>
							{#each filteredUsers as u (u.id)}
								<tr class="border-b border-gray-700 hover:bg-gray-700">
									<td class="p-2">
										<input
											type="checkbox"
											checked={selectedUsers.has(u.id)}
											onchange={() => toggleUser(u.id)}
										/>
									</td>
									<td class="p-2 text-xs opacity-60">{u.id.slice(0, 8)}...</td>
									<td class="p-2">{u.firstname}</td>
									<td class="p-2">{u.lastname}</td>
									<td class="p-2">{u.sex === 'male' ? 'М' : 'Ж'}</td>
									<td class="p-2">{u.gtoId || '—'}</td>
									<td class="p-2 text-xs" title={missingFieldLabels(u.missingSurveyFields)}>
										{u.missingSurveyFields.length > 0
											? u.missingSurveyFields.length + ' полей'
											: '✓'}
									</td>
									<td class="p-2 text-xs opacity-60">{formatDate(u.lastActiveAt)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>

			<Button color="green" type="submit" disabled={selectedUsers.size === 0}>
				Создать сессию ({selectedUsers.size} участников)
			</Button>
		</form>

		<!-- Existing sessions -->
		<div class="flex flex-col gap-2">
			<h2 class="text-xl font-semibold">Существующие сессии</h2>
			{#if data.sessions.length === 0}
				<p class="text-sm opacity-60">Нет созданных сессий</p>
			{:else}
				<div class="flex flex-col gap-2">
					{#each data.sessions as s}
						<a
							href="/admin/gto/{s.id}"
							class="flex items-center justify-between rounded-xl bg-gray-700 p-3 hover:bg-gray-600"
						>
							<div class="flex flex-col">
								<span class="font-medium">{s.name}</span>
								<span class="text-xs opacity-60">{formatDate(s.createdAt)}</span>
							</div>
							<div class="flex items-center gap-2">
								<span
									class="rounded-full px-2 py-1 text-xs {s.status === 'active'
										? 'bg-green-800 text-green-200'
										: s.status === 'paused'
											? 'bg-yellow-800 text-yellow-200'
											: 'bg-gray-600 text-gray-300'}"
								>
									{#if s.status === 'active'}
										Активна
									{:else if s.status === 'paused'}
										На паузе
									{:else}
										Завершена
									{/if}
								</span>
								<span class="text-sm">{s.participantCount} участников</span>
							</div>
						</a>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</main>

<section class="low-content flex items-center justify-center">
	<Button color="gray" goto="/admin">← Админка</Button>
</section>
