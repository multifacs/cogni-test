<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
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

	function toggleUser(id: string) {
		if (selectedUsers.has(id)) {
			selectedUsers.delete(id);
		} else {
			selectedUsers.add(id);
		}
		selectedUsers = new Set(selectedUsers); // trigger reactivity
	}

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleString('ru-RU');
	}
</script>

<section class="banner">
	<h1 class="text-2xl font-bold">Управление сессиями ГТО-М</h1>
</section>

<main class="main overflow-auto p-4">
	<div class="flex flex-col gap-6">
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
				<label class="text-sm font-medium" for="words-input"
					>Слова для последовательности (через запятую, до 5)</label
				>
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
				<h3 class="text-lg font-medium">Выберите участников</h3>
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b border-gray-600">
								<th class="p-2 text-left"></th>
								<th class="p-2 text-left">ID</th>
								<th class="p-2 text-left">Имя</th>
								<th class="p-2 text-left">Фамилия</th>
								<th class="p-2 text-left">Пол</th>
								<th class="p-2 text-left">Незаполненные поля</th>
							</tr>
						</thead>
						<tbody>
							{#each data.users as u (u.id)}
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
									<td class="p-2 text-xs"
										>{u.missingSurveyFields.length > 0
											? u.missingSurveyFields.length + ' полей'
											: '✓'}</td
									>
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
										: 'bg-gray-600 text-gray-300'}"
								>
									{ s.status === 'active' ? 'Активна' : 'Завершена' }
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
