<script lang="ts">
	import { tests } from '$lib/tests';
	import { source } from 'sveltekit-sse';
	import type { PageProps } from './$types';
	import type { ResultInfo } from '$lib/tests/types';
	import ResultsTable from '$lib/components/ui/gto-m/ResultsTable.svelte';
	import type { Readable } from 'svelte/store';

	let { data }: PageProps = $props();
	let session = data.session;

	let connection;
	let results: Readable<Record<string, ResultInfo> | null>;

	const availableTestsData = getAvailableTestsData();

	if (data.userId === session?.adminId) {
		connection = source('/api/getLastTestResults', {
			options: {
				body: JSON.stringify({
					sessionCreatedAt: session?.createdAt,
					tests: availableTestsData.map((test) => test.name),
					userId: session?.userId
				})
			}
		});
		results = connection.select('message').json<Record<string, ResultInfo>>();
		console.log('results', $results);
	}

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
</script>

<!-- TODO: would it be better to separate into components or snippets? -->
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
				{#if $results}
					{#if $results[test.name] && $results[test.name].attempts}
						<ResultsTable results={$results[test.name].attempts} testName={test.name} />
					{/if}
				{/if}
			{/each}
		{/if}
	{:else}
		<p>Session not found</p>
	{/if}
</div>
