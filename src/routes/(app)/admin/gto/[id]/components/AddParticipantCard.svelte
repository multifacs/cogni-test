<script lang="ts">
	import type { PageProps } from '../$types';

	let {
		authorizedUsers,
		participantIds,
		onAdd
	}: {
		authorizedUsers: PageProps['data']['authorizedUsers'];
		participantIds: Set<string>;
		onAdd: (userId: string) => void;
	} = $props();

	let participantSearch = $state('');
	let filterRecent = $state(false);
	const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

	let availableUsers = $derived(
		authorizedUsers
			.filter((u) => !participantIds.has(u.id))
			.filter((u) => {
				if (filterRecent) {
					if (!u.lastActiveAt) return false;
					const la = new Date(u.lastActiveAt);
					if (la < sevenDaysAgo) return false;
				}
				if (!participantSearch) return true;
				const q = participantSearch.toLowerCase();
				return (
					u.lastname.toLowerCase().includes(q) ||
					u.firstname.toLowerCase().includes(q) ||
					(u.gtoId ?? '').toLowerCase().includes(q)
				);
			})
	);
</script>

<div class="rounded-xl border border-gray-700 bg-white p-4">
	<div class="flex flex-col gap-3">
		<div class="flex items-center gap-3">
			<h3 class="text-center text-lg font-semibold">Добавить участника</h3>
			<div class="flex flex-1 items-center gap-3">
				<input
					type="text"
					name="searchParticipants"
					bind:value={participantSearch}
					placeholder="Поиск по имени или ГТО-М ID..."
					class="rounded-lg bg-[#E5E7EB] px-3 py-2 text-sm"
				/>
				<label class="flex items-center gap-1.5 text-sm whitespace-nowrap">
					<input
						type="checkbox"
						bind:checked={filterRecent}
						class="rounded"
					/>
					Недавно вошедшие
				</label>
			</div>
		</div>
		{#if availableUsers.length === 0}
			<p class="py-2 text-center text-sm text-gray-500">
				{participantSearch
					? 'Ничего не найдено'
					: 'Все авторизованные пользователи уже в сессии'}
			</p>
		{:else}
			<div class="max-h-100 overflow-y-auto rounded-lg border border-gray-300">
				{#each availableUsers as u (u.id)}
					<button
						class="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-gray-100"
						onclick={() => onAdd(u.id)}
					>
						<span
							class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-gray-300"
						>
							{u.firstname[0]}
						</span>
						<div class="flex min-w-0 flex-1 flex-col">
							<span class="truncate text-sm font-medium"
								>{u.firstname} {u.lastname}</span
							>
							<span class="text-xs">
								{u.sex === 'male' ? 'М' : 'Ж'} · {u.age} лет
								{#if u.gtoId}
									· ГТО-М: {u.gtoId}
								{/if}
							</span>
						</div>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-5 w-5 shrink-0 text-green-500"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path
								fill-rule="evenodd"
								d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
								clip-rule="evenodd"
							/>
						</svg>
					</button>
				{/each}
			</div>
		{/if}
	</div>
</div>
