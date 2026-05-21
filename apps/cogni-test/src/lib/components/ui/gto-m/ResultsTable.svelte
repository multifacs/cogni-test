<script lang="ts">
	import parseResults from '$lib/gto-m/resultsParser';

	let { results, testName } = $props();

	const parsedResults = parseResults(results, testName);
</script>

<div class="min-w-full">
	<div
		class="overflow-x-auto rounded-sm border border-blue-200 bg-blue-50
    [&::-webkit-scrollbar]:h-2
    [&::-webkit-scrollbar-thumb]:rounded-sm
    [&::-webkit-scrollbar-thumb]:bg-blue-300
    [&::-webkit-scrollbar-track]:bg-blue-100"
	>
		{#if !parsedResults}
			<div class="text-center font-medium text-blue-900">Похоже, что-то явно не так</div>
		{:else}
			<table class="min-w-full divide-y divide-blue-200">
				<thead class="bg-blue-100">
					<tr>
						{#each Object.keys(parsedResults.results) as header}
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-blue-500 uppercase"
							>
								{header}
							</th>
						{/each}
					</tr>
				</thead>
				<tbody class="divide-y divide-blue-200">
					<tr class="transition-colors odd:bg-blue-50 even:bg-blue-100 hover:bg-blue-200">
						{#each Object.values(parsedResults.results) as value}
							<td class="px-6 py-4 whitespace-nowrap">
								<div class="text-sm font-medium text-blue-900">
									{value}
								</div>
							</td>
						{/each}
					</tr>
				</tbody>
			</table>
		{/if}
	</div>
</div>
