<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { derived } from 'svelte/store';
	import { profileSurveyStore, userStore } from '$lib/stores/user';

	import { flows, fullFlow, type Flow } from './flows.ts';

	import FlowRunner from './FlowRunner.svelte';
	import { flowProgress } from './progress.ts';
	import Button from '$lib/components/ui/Button.svelte';

	const user = derived(userStore, ($userStore) => $userStore);
	const headerContext = getContext<{ value: string }>('headerText');

	const flowStats = $derived(flows.map((f) => ({ flow: f, stats: flowProgress(f) })));
	const fullStats = $derived(flowProgress(fullFlow));

	onMount(() => {
		if (headerContext) headerContext.value = 'Анкета';
	});

	let activeFlow: Flow | null = $state(null);

	function start(flow: Flow) {
		activeFlow = flow;
	}

	function finishFlow() {
		activeFlow = null;
	}
</script>

<main class="main flex flex-col items-center justify-center-safe">
	{#if $profileSurveyStore}
		{#await $user}
			<div class="flex justify-center p-8">
				<p>Загрузка...</p>
			</div>
		{:then u}
			{#if u && u.id}
				{#if activeFlow}
					<FlowRunner
						flow={activeFlow}
						onFinish={finishFlow}
						onExit={() => (activeFlow = null)}
					/>
				{:else}
					<div class="flex w-full flex-col items-center justify-center">
						<div class="flex w-full max-w-5xl flex-col items-center gap-6">
							<h2 style="text-align:center; color: var(--main-text-color);">
								Пройдите всю анкету подряд или выберите нужный раздел
							</h2>

							<div class="glass-card flex w-[65vw] flex-col gap-4 p-6">
								<div class="flex items-center gap-4">
									<img src={fullFlow.emoji} alt="" class="h-9 w-9 shrink-0" />
									<div class="flex flex-col">
										<h3 class="text-2xl max-sm:text-xl">{fullFlow.title}</h3>
										<p class="text-base" style="opacity: 0.75;">
											{fullStats.answered} / {fullStats.total} пройдено
										</p>
									</div>
									{#if fullStats.done}
										<div
											class="ml-auto rounded-full px-3 py-1 text-xs font-semibold"
											style="background-color: var(--button-green); color: var(--button-green-text);"
										>
											✓ Пройдено
										</div>
									{/if}
								</div>

								<Button
									color={fullStats.done ? 'blue' : 'green'}
									onclick={() => start(fullFlow)}
								>
									{fullStats.done ? 'Пройти заново' : 'Начать прохождение'}
								</Button>
							</div>

							<div
								class="grid grid-cols-[repeat(2,1fr)] gap-4 max-sm:grid-cols-[repeat(1,1fr)]"
							>
								{#each flowStats as { flow, stats } (flow.id)}
									<div class="glass-card flex flex-col gap-4 p-6">
										<div class="flex items-center gap-4">
											<img src={flow.emoji} alt="" class="h-8 w-8 shrink-0" />
											<div class="flex flex-col">
												<h3 class="text-xl max-sm:text-lg">{flow.title}</h3>
												<p class="text-sm" style="opacity: 0.75;">
													{flow.description}
												</p>
											</div>
										</div>

										<div class="flex flex-col gap-2">
											<div
												class="h-2 w-full overflow-hidden rounded"
												style="background-color: var(--input-bg-color);"
											>
												<div
													class="h-full rounded transition-all"
													style="background-color: var(--button-green); width: {(stats.answered /
														stats.total) *
														100}%"
												></div>
											</div>
											<p class="text-sm" style="opacity: 0.6;">
												{stats.answered} / {stats.total} пройдено
											</p>
										</div>

										<Button
											color={stats.done ? 'blue' : 'green'}
											onclick={() => start(flow)}
										>
											{stats.done ? 'Пройти заново' : 'Начать'}
										</Button>
									</div>
								{/each}
							</div>
						</div>
					</div>
				{/if}
			{:else}
				<div class="flex justify-center p-8">
					<p style="color: var(--error-color);">
						Пользователь не найден. Возможно, вы не вошли в систему.
					</p>
				</div>
			{/if}
		{/await}
	{/if}
</main>