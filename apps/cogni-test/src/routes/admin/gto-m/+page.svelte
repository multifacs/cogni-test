<script lang="ts">
	import UserList from '$lib/components/ui/admin/UserList.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let users = data.users;

	async function handleButtonClick(userId: string) {
		try {
			let res = await fetch('/api/gto-m', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					profile: 'main',
					userId: userId,
					adminId: data.userId
				})
			});

			let parsedRes = await res.json();
			console.log(parsedRes);
		} catch (error) {
			console.error(error);
		}
	}
</script>

<div class="flex flex-col items-center justify-center gap-6 p-8 text-white">
	<h2>Admin GTO-M</h2>
	<UserList {users} onButtonClick={handleButtonClick} />
</div>
