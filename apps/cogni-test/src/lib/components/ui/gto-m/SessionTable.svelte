<script lang="ts">
	import { formatDateLog } from '$lib/utils';
    import { goto } from '$app/navigation';
	import type { GtoSession } from '$lib/gto-m/types';

	type DbGtoSession = GtoSession & {
		id: string;
		createdAt: Date;
		updatedAt: Date;
		adminName: string;
		adminSurname: string;
	};

	let { sessions }: { sessions: DbGtoSession[] } = $props();
</script>

<div class="flex flex-col gap-4">
	<h2 class="text-2xl font-bold">Доступные сессии ГТО-М</h2>
	<table class="min-w-full divide-y divide-gray-700">
		<thead class="bg-gray-700">
			<tr>
				<th
					class="text-gray px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
				>
					Профиль
				</th>
				<th
					class="text-gray px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
				>
					Администратор
				</th>
				<th
					class="text-gray px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
				>
					Дата создания
				</th>
			</tr>
		</thead>
		<tbody class="divide-y divide-gray-700 bg-gray-800">
			{#each sessions as session}
				<tr onclick={() => goto(`/gto-m/${session.id}`)} class="hover:bg-gray-700">
					<td class="px-6 py-4 whitespace-nowrap">
						<div class="text-sm font-medium text-white">
							{session.profile}
						</div>
					</td>
					<td class="px-6 py-4 whitespace-nowrap">
						<div class="text-sm font-medium text-white">
							{session.adminName}
							{session.adminSurname}
						</div>
					</td>
					<td class="px-6 py-4 whitespace-nowrap">
						<div class="text-sm font-medium text-white">
							{formatDateLog(session.createdAt)}
						</div>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
