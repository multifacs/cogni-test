<script lang="ts">
	import type { FileNumberStatus } from '$lib/client/gto-button-data';

	let {
		fileNumbersWithStatus,
		uploadingFiles,
		onupload,
		onclear
	}: {
		fileNumbersWithStatus: FileNumberStatus[];
		uploadingFiles: boolean;
		onupload: (files: FileList | File[]) => Promise<void> | void;
		onclear: () => Promise<void> | void;
	} = $props();

	let fileSearch = $state('');

	let filteredFiles = $derived(
		fileSearch
			? fileNumbersWithStatus.filter((f) =>
					f.fileNumber.toLowerCase().includes(fileSearch.toLowerCase())
				)
			: fileNumbersWithStatus
	);
</script>

<div class="rounded-xl border border-gray-700 bg-white p-4">
	<div class="flex items-center justify-center gap-2">
		<h3 class="text-center text-lg font-semibold">Файлы кнопочных тестов</h3>
		{#if fileNumbersWithStatus.length > 0}
			<span class="rounded-full bg-blue-900/60 px-2 py-0.5 text-xs text-blue-300">
				{fileNumbersWithStatus.length} файлов
			</span>
		{/if}
	</div>
	<div class="space-y-3">
		<div class="grid grid-cols-2 items-center gap-3">
			<span
				class="inline-flex items-center gap-1.5 rounded-lg border border-yellow-600/40 bg-yellow-100 px-2.5 py-1.5 text-xs text-yellow-800"
			>
				<span aria-hidden="true">⚠</span>
				Данные хранятся только в этом браузере — другие администраторы их не увидят
			</span>
			<label class="flex flex-col gap-1">
				<span class="text-xs text-gray-400">Загрузить файлы (.xls, .xlsx)</span>
				<input
					type="file"
					accept=".xls,.xlsx"
					multiple
					class="file:text-grey-200 block text-sm text-gray-300 file:mr-2 file:rounded-lg file:border-0 file:bg-(--main-accent-color) file:px-3 file:py-1.5 file:text-sm hover:file:text-white"
					disabled={uploadingFiles}
					onchange={(e) => {
						const files = (e.target as HTMLInputElement).files;
						if (files && files.length > 0) {
							void onupload(files);
						}
					}}
				/>
			</label>
		</div>
		{#if fileNumbersWithStatus.length > 0}
			<div class="space-y-2">
				<input
					type="text"
					bind:value={fileSearch}
					placeholder="Поиск по названию файла..."
					class="w-full rounded-lg bg-[#E5E7EB] px-3 py-2 text-sm"
				/>
				<div class="max-h-60 overflow-y-auto">
					{#if filteredFiles.length === 0}
						<p class="py-2 text-center text-sm text-gray-500">Ничего не найдено</p>
					{:else}
						<div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
							{#each filteredFiles as fs (fs.fileNumber)}
								<div class="rounded-lg border p-2 text-center">
									<div class="font-mono text-sm font-semibold">{fs.fileNumber}</div>
									{#if fs.hasLeft && fs.hasRight}
										<span class="text-xs text-green-600">л+п</span>
									{:else if !fs.hasLeft && !fs.hasRight}
										<span class="text-xs text-red-600">файлы не загружены</span>
									{:else}
										<span class="text-xs text-yellow-600">
											{fs.hasLeft ? 'не хватает файла п' : 'не хватает файла л'}
										</span>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>
				<button
					class="text-xs text-red-400 hover:text-red-300"
					onclick={() => void onclear()}
				>
					Очистить все
				</button>
			</div>
		{/if}
	</div>
</div>
