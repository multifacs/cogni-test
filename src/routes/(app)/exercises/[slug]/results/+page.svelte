<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { formatUserLocalDate } from '$lib/utils/index.js';
	import type { AttentionResult } from '$lib/exercises/attention/types';

	const { data } = $props();
	const slug = data.slug;
	const results = data.results;

	let openedSessionId: string | null = $state(results[0]?.sessionId ?? null);

	function toggleSession(sessionId: string) {
		openedSessionId = openedSessionId === sessionId ? (null as string | null) : sessionId;
	}
</script>

<main class="main box-border">
	{#if results.length > 0}
		<div class="flex min-h-full flex-col justify-center gap-2">
			{#each results as result (result.sessionId)}
				<div class="w-full rounded-2xl bg-gray-600 shadow">
					<button
						class={`flex w-full cursor-pointer items-center justify-between rounded-t-2xl px-4 py-3 transition-colors hover:bg-gray-400 ${openedSessionId !== result.sessionId ? 'hover:rounded-b-2xl' : ''}`}
						onclick={() => toggleSession(result.sessionId)}
					>
						<span class="font-medium text-gray-50">
							{openedSessionId === result.sessionId
								? 'Попытка от ' + formatUserLocalDate(result.createdAt)
								: formatUserLocalDate(result.createdAt)}
						</span>
						<svg
							class={`h-5 w-5 transform text-gray-500 transition-transform ${openedSessionId === result.sessionId ? 'rotate-180' : ''}`}
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 9l-7 7-7-7"
							/>
						</svg>
					</button>

					{#if openedSessionId === result.sessionId}
						<div class="box-border flex flex-col items-center border-t p-2">
							{#each result.attempts as attempt_raw, i (i)}
								{@const attempt = attempt_raw as AttentionResult}
								<div class="grid grid-cols-3 gap-4 py-2">
									<div
										class="rounded-2xl bg-[#364b6c] p-4 text-center text-white"
									>
										<span class="mb-2 block opacity-70">Найдено</span>
										<strong class="text-2xl"
											>{attempt.found} / {attempt.n}</strong
										>
									</div>
									<div
										class="rounded-2xl bg-[#364b6c] p-4 text-center text-white"
									>
										<span class="mb-2 block opacity-70">Время</span>
										<strong class="text-2xl">{attempt.elapsed} сек</strong>
									</div>
									<div
										class="rounded-2xl bg-[#364b6c] p-4 text-center text-white"
									>
										<span class="mb-2 block opacity-70">Ошибки</span>
										<strong class="text-2xl">{attempt.errors}</strong>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{:else}
		<h1>Попыток нет</h1>
	{/if}
</main>

<section class="low-content grid grid-cols-2 gap-4">
	<Button color="red" goto="/exercises/attention">Назад</Button>
	<Button color="blue" goto="/exercises/attention/playground">Пройти снова</Button>
</section>
