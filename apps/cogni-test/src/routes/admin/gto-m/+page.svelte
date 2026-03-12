<script lang="ts">
	import UserTable from '$lib/components/ui/admin/UserTable.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let users = data.users;

	async function handleCreateSession(userId: string) {
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

			if (parsedRes.error) {
				alert(parsedRes.error);
			}

			console.log(parsedRes);
		} catch (error) {
			console.error(error);
		}
	}

	async function handleAddPatient(patientId: string, adminId: string) {
		try {
			let res = await fetch('/api/user-admins', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					patientId: patientId,
					adminId: adminId
				})
			});

			let parsedRes = await res.json();

			if (parsedRes.error) {
				alert(parsedRes.error);
			}

			console.log(parsedRes);
		} catch (error) {
			console.error(error);
		}
	}
</script>

<div class="flex flex-col items-center justify-center gap-6 p-8 text-white">
	<h2>Admin GTO-M</h2>
	<UserTable {users} adminId={data.userId} onCreateSession={handleCreateSession} onAddPatient={handleAddPatient} />
</div>
