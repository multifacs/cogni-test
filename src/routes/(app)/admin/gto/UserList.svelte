<script lang="ts">
	import { missingFieldLabels } from '$lib/survey-field-labels';
	import type { PageData } from './$types';

	type Props = {
		users: PageData['users'];
		selectedUsers: Set<string>;
		ontoggle: (id: string) => void;
	};

	let { users, selectedUsers, ontoggle }: Props = $props();
</script>

<div
	class="grid min-h-0 flex-1 grid-cols-1 content-start gap-1.5 overflow-y-auto md:grid-cols-2 xl:grid-cols-3"
>
	{#each users as u (u.id)}
		<button
			type="button"
			class="m-1 flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors {selectedUsers.has(
				u.id
			)
				? 'bg-white ring-1 ring-indigo-500/50'
				: 'bg-gray-900/30 hover:bg-gray-700/50'}"
			onclick={() => ontoggle(u.id)}
		>
			<div
				class="flex h-5 w-5 shrink-0 items-center justify-center rounded border {selectedUsers.has(
					u.id
				)
					? 'border-indigo-400 bg-indigo-500'
					: 'border-gray-500'}"
			>
				{#if selectedUsers.has(u.id)}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-3.5 w-3.5 text-black"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fill-rule="evenodd"
							d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
							clip-rule="evenodd"
						/>
					</svg>
				{/if}
			</div>
			<div class="flex min-w-0 flex-1 flex-col">
				<span class="truncate text-sm font-medium">{u.firstname} {u.lastname}</span>
				<span class="text-xs">
					{u.sex === 'male' ? 'М' : 'Ж'}
					{#if u.gtoId}
						· ГТО-М: {u.gtoId}
					{/if}
				</span>
			</div>
			<div class="flex shrink-0 items-center gap-1.5">
				{#if u.missingSurveyFields.length > 0}
					<span
						class="rounded-full bg-red-500/40 px-2 py-0.5 text-xs"
						title={missingFieldLabels(u.missingSurveyFields)}
					>
						{u.missingSurveyFields.length}
					</span>
				{:else}
					<span class="rounded-full bg-green-900/40 px-2 py-0.5 text-xs text-green-300"
						>✓</span
					>
				{/if}
			</div>
		</button>
	{/each}
</div>
