<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import type { User } from '$lib/server/db/types';

	let { users, onButtonClick }: { users: User[]; onButtonClick: (userId: string) => void } =
		$props();

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
	<ul class="list-none">
		{#if filteredUsers.length}
			{#each filteredUsers as user}
				<li>
					<div class="flex items-center gap-2 border-b border-gray-700 py-2">
						{user.firstname}
						{user.lastname}
						<Button color="green" onclick={() => onButtonClick(user.id)}>создать сессию</Button>
					</div>
				</li>
			{/each}
		{:else}
			<li>No users found</li>
		{/if}
	</ul>
</div>
