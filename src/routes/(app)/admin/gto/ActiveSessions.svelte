<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatDate } from '.';
	import type { PageData } from './$types';

	type Props = { data: Pick<PageData, 'sessions'> };
	let { data }: Props = $props();
</script>

<div class="grid min-h-0 flex-1 grid-cols-1 content-start gap-2 overflow-y-auto md:grid-cols-2">
	{#each data.sessions as s (s.id)}
		<a
			href={resolve(`/admin/gto/${s.id}`)}
			class="group flex items-center justify-between rounded-xl border border-gray-700 bg-white p-3 transition-colors hover:border-gray-600 hover:bg-gray-700/50"
		>
			<div class="flex min-w-0 flex-col">
				<span class="truncate text-sm font-medium sm:text-base">{s.name}</span>
				<span class="text-xs opacity-50">{formatDate(s.createdAt)}</span>
			</div>
			<div class="flex shrink-0 items-center gap-2">
				<span
					class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs {s.status ===
					'active'
						? 'bg-green-800/60 text-green-200'
						: s.status === 'paused'
							? 'bg-yellow-800/60 text-yellow-200'
							: 'bg-gray-600/60 text-gray-300'}"
				>
					<span
						class="h-1.5 w-1.5 rounded-full {s.status === 'active'
							? 'bg-green-400'
							: s.status === 'paused'
								? 'bg-yellow-400'
								: 'bg-gray-400'}"
					></span>
					{s.status === 'active'
						? 'Активна'
						: s.status === 'paused'
							? 'На паузе'
							: 'Завершена'}
				</span>
				<span class="text-xs opacity-50">{s.participantCount} чел.</span>
			</div>
		</a>
	{/each}
</div>
