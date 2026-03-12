<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import type { User } from '$lib/server/db/types';

	let {
		users,
		onCreateSession,
		onAddPatient,
		adminId
	}: {
		users: User[];
		onCreateSession: (userId: string) => void;
		onAddPatient?: (patientId: string, adminId: string) => void;
		adminId: string;
	} = $props();

	let query = $state('');
	let timeout: NodeJS.Timeout | undefined = $state();
	let filteredUsers = $state(users);

	// debounce filter to reduce number of rerenders
	function handleFilter() {
		clearTimeout(timeout);
		timeout = setTimeout(() => {
			filteredUsers = users.filter((user) =>
				user.firstname.toLowerCase().includes(query.trim().toLowerCase())
			);
		}, 500);
	}

	function formatBirthday(birthday: Date) {
		const day = String(birthday.getDate()).padStart(2, '0');
		const month = String(birthday.getMonth() + 1).padStart(2, '0');
		const year = birthday.getFullYear();

		return `${day}.${month}.${year}`;
	}
</script>

<div class="mb-4 flex flex-col gap-4">
	<input
		class={`
        max-xs:text-base
        max-xs:p-1
        xs:p-2.5
        block
        w-full
        rounded-lg
        border
        bg-gray-700
        text-white
        placeholder-gray-400
        outline-0
        transition
        focus:border-blue-500
        focus:ring-blue-500
        `}
		type="text"
		placeholder="Введите имя пациента"
		bind:value={query}
		oninput={handleFilter}
	/>
	<table class="min-w-full divide-y divide-gray-700">
		<thead class="bg-gray-700">
			<tr>
				<th
					class="text-gray px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
				>
					Имя
				</th>
				<th
					class="text-gray px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
				>
					Фамилия
				</th>
				<th
					class="text-gray px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
				>
					Дата рождения
				</th>
				<th
					class="text-gray px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
				>
					Пол
				</th>
				<th
					class="text-gray px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
				>
					Действия
				</th>
			</tr>
		</thead>
		<tbody class="divide-y divide-gray-700 bg-gray-800">
			{#if filteredUsers.length}
				{#each filteredUsers as user}
					<tr class="hover:bg-gray-700">
						<td class="px-6 py-4 whitespace-nowrap">
							<div class="text-sm font-medium text-white">
								{user.firstname}
							</div>
						</td>
						<td class="px-6 py-4 whitespace-nowrap">
							<div class="text-sm font-medium text-white">
								{user.lastname}
							</div>
						</td>
						<td class="px-6 py-4 whitespace-nowrap">
							<div class="text-sm font-medium text-white">
								{formatBirthday(user.birthday)}
							</div>
						</td>
						<td class="px-6 py-4 whitespace-nowrap">
							<div class="text-sm font-medium text-white">
								{user.sex === 'male' ? 'Мужской' : 'Женский'}
							</div>
						</td>
						<td class="px-6 py-4 whitespace-nowrap">
							<div class="inline-flex items-center">
								<Button color="green" onclick={() => onCreateSession(user.id)}
									>Создать сессию</Button
								>
                                {#if onAddPatient}
								<Button color="blue" onclick={() => onAddPatient(user.id, adminId)}>
									Добавить пациента
								</Button>
                                {/if}
							</div>
						</td>
					</tr>
				{/each}
			{:else}
				<tr>
					<td class="px-6 py-4 whitespace-nowrap" colspan="5">
						<div class="text-center font-medium text-white">Нет пользователей</div>
					</td>
				</tr>
			{/if}
		</tbody>
	</table>
</div>
