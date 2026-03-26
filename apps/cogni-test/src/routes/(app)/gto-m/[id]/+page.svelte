<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { tests } from '$lib/tests';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let session = data.session;
    console.log(session);

	function getAvailableTestsData() {
		let result = [];

		if (!session) {
			return [];
		}

		for (const availableTest of session.tests) {
			const test = tests.find((test) => test.name === availableTest);
			if (test) {
				result.push(test);
			}
		}

		return result;
	}

	const availableTestsData = getAvailableTestsData();

	async function getResults() {
		if (!session) {
			console.error('Okay, where is the session?');
			return;
		}
		try {
			const resp = await fetch('/api/getLastTestResults', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					sessionCreatedAt: session.createdAt,
					tests: availableTestsData.map((test) => test.name),
					userId: session.userId
				})
			});

			if (!resp.ok) {
				console.error(resp);
				return;
			}

			const data = await resp.json();

			if (data.error) {
				console.error(data.error);
				return;
			}

			console.log(data);
		} catch (error) {
			console.error(error);
		}
	}
</script>

<div class="flex flex-col items-center justify-center gap-6 p-8 text-white">
	{#if session}
		{#if data.userId === session.userId}
			<p>Тесты к прохождению:</p>
			<div class="flex w-full flex-col gap-3">
				{#each availableTestsData as { name, title, path, img }}
					<a
						href={path}
						class="flex items-center justify-between rounded-2xl bg-gray-600 p-3 shadow transition hover:bg-gray-100 hover:text-black"
					>
						<div class="flex flex-col gap-1">
							<span class="text-lg">{title}</span>
						</div>
						<img src={img} alt={name} class="h-14 w-14 rounded-xl bg-white" />
					</a>
				{/each}
			</div>
		{:else if data.userId === session.adminId}
			{#each availableTestsData as test}
				<h2>Результаты {test.title}:</h2>
			{/each}
			<Button color="blue" onclick={getResults}>Обновить результаты</Button>
		{/if}
	{:else}
		<p>Session not found</p>
	{/if}
</div>
