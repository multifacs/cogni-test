<script lang="ts">
	import { profileSurveyStore } from '$lib/stores/user';
	import type { Flow } from './flows';
	import QuestionField from './QuestionField.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { flushAutosave, saveFieldNow } from './autosave';
	import { firstUnansweredIndex, flowProgress } from './progress';

	let {
		flow,
		onFinish,
		onExit
	}: {
		flow: Flow;
		onFinish: () => void;
		onExit: () => void;
	} = $props();

	const startIndex = firstUnansweredIndex(flow);
	let index = $state(startIndex === -1 ? 0 : startIndex);

	const total = flow.questions.length;
	const question = $derived(flow.questions[index]);
	const stats = $derived(flowProgress(flow));

	async function next() {
		await saveFieldNow(question.key);
		flushAutosave();
		if (index < total - 1) index++;
		else onFinish();
	}

	async function prev() {
		await saveFieldNow(question.key);
		flushAutosave();
		if (index > 0) index--;
		else onExit();
	}
</script>

<div class="flex w-full flex-col items-center justify-center">
	<div class="flex w-full max-w-5xl flex-col gap-6">
		<div class="glass-card flex flex-col gap-6 p-6">
			<div class="flex flex-col gap-3">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<img src={flow.emoji} alt="" class="h-7 w-7 shrink-0" />
						<h3 class="text-xl max-sm:text-lg">{flow.title}</h3>
					</div>
					<p class="text-sm" style="opacity: 0.6;">
						{stats.answered} / {stats.total} пройдено
					</p>
				</div>
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
			</div>

			<hr style="border-color: var(--input-bg-color);" />

			{#key question.key}
				<QuestionField {question} bind:value={$profileSurveyStore![question.key]} />
			{/key}

			<hr style="border-color: var(--input-bg-color);" />

			<div class="flex justify-between gap-4 max-sm:flex-col">
				<Button color="blue" onclick={prev} class="max-sm:w-full">Назад</Button>
				<Button color="green" onclick={next} class="max-sm:w-full">
					{index === total - 1 ? 'Завершить' : 'Далее'}
				</Button>
			</div>
		</div>
	</div>
</div>