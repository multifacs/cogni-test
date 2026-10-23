<script lang="ts">
	import type {
		AiSurveyAnswerValue,
		AiSurveyQuestion,
		LadderQuestion,
		MatrixQuestion,
		MultiQuestion,
		NumberQuestion,
		OpenQuestion,
		SingleAnswer,
		SingleQuestion
	} from '$lib/ai/questionnaire/types';
	import MatrixScale from './MatrixScale.svelte';
	import MultiSelect from './MultiSelect.svelte';

	let {
		question,
		value = $bindable()
	}: {
		question: AiSurveyQuestion;
		value?: AiSurveyAnswerValue;
	} = $props();

	// Дискриминанты вынесены в $derived: шаблонная проверка
	// {#if question.type === 'single'} не сужает тип реактивного пропса.
	const single = $derived(question.type === 'single' ? (question as SingleQuestion) : null);
	const multi = $derived(question.type === 'multi' ? (question as MultiQuestion) : null);
	const matrix = $derived(question.type === 'matrix' ? (question as MatrixQuestion) : null);
	const open = $derived(question.type === 'open' ? (question as OpenQuestion) : null);
	const numberQ = $derived(question.type === 'number' ? (question as NumberQuestion) : null);
	const ladder = $derived(question.type === 'ladder' ? (question as LadderQuestion) : null);

	const singleAnswer = $derived(
		typeof value === 'object' && value !== null && 'choice' in value
			? (value as SingleAnswer)
			: null
	);
	// «Другое» — полноценная radio-опция single-вопроса (chooseSingle
	// различает её по label); без неё в списке вариант был недоступен в UI
	const singleOptions = $derived(
		single ? [...single.options, ...(single.other ? [single.other.label] : [])] : []
	);
	const numberValue = $derived(typeof value === 'number' ? String(value) : '');
	const ladderSteps = $derived(
		ladder ? Array.from({ length: ladder.max - ladder.min + 1 }, (_, i) => ladder.min + i) : []
	);

	// Черновик текста «Другое»: переживает переключение на обычную опцию
	// и восстанавливается при возврате (spec-review Finding 1).
	// draftOwner привязывает черновик к вопросу: без key карточка может
	// переиспользоваться для соседнего вопроса с другим «Другое».
	let draftOwner = '';
	let otherDraft = $state('');

	function draftOther(): string {
		return question.id === draftOwner ? otherDraft : (singleAnswer?.other ?? '');
	}

	function stashDraft(): void {
		draftOwner = question.id;
		otherDraft = singleAnswer?.other ?? '';
	}

	function chooseSingle(opt: string): void {
		if (!single) return;
		// «Другое» хранит текст в other; выбор обычного варианта убирает
		// other из ответа, но сам текст stash-ится в черновик компонента
		const withOther = single.other !== undefined && opt === single.other.label;
		if (!withOther) stashDraft();
		value = withOther ? { choice: opt, other: draftOther() } : { choice: opt };
	}

	function onOtherInput(event: Event): void {
		if (!single?.other) return;
		value = {
			choice: single.other.label,
			other: (event.currentTarget as HTMLInputElement).value
		};
	}

	function onOpenInput(event: Event): void {
		value = (event.currentTarget as HTMLTextAreaElement).value;
	}

	function onNumberInput(event: Event): void {
		const raw = (event.currentTarget as HTMLInputElement).value;
		value = raw.trim() === '' ? undefined : Number(raw);
	}
</script>

<section class="flex flex-col gap-5" aria-label={question.id}>
	<p class="block-label">{question.block}</p>
	<h3 class="question-text">{question.text}</h3>

	{#if single}
		<div class="flex flex-col gap-3">
			{#each singleOptions as opt (opt)}
				<label class="option" class:selected={singleAnswer?.choice === opt}>
					<input
						type="radio"
						name={question.id}
						checked={singleAnswer?.choice === opt}
						onchange={() => chooseSingle(opt)}
						class="sr-only"
					/>
					<span class="dot" aria-hidden="true"></span>
					<span class="option-text">{opt}</span>
				</label>
			{/each}
			{#if single.other && singleAnswer?.choice === single.other.label}
				<input
					type="text"
					class="other-input"
					placeholder={single.other.label}
					aria-label={single.other.label}
					value={singleAnswer?.other ?? ''}
					oninput={onOtherInput}
				/>
			{/if}
		</div>
	{:else if multi}
		<MultiSelect {question} bind:value />
	{:else if matrix}
		<MatrixScale {question} bind:value />
	{:else if open}
		<textarea
			class="open-input"
			rows="4"
			placeholder="Ваш ответ"
			aria-label={question.text}
			value={typeof value === 'string' ? value : ''}
			oninput={onOpenInput}></textarea>
	{:else if numberQ}
		<input
			type="number"
			inputmode="numeric"
			class="open-input"
			placeholder="Число"
			aria-label={question.text}
			value={numberValue}
			oninput={onNumberInput}
		/>
	{:else if ladder}
		<div class="ladder" role="group" aria-label={question.text}>
			{#each ladderSteps as n (n)}
				<button
					type="button"
					class="step"
					class:selected={value === n}
					aria-pressed={value === n}
					onclick={() => (value = n)}
				>
					{n}
				</button>
			{/each}
		</div>
	{/if}
</section>

<style>
	.block-label {
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		opacity: 0.55;
		color: var(--main-text-color);
	}

	.question-text {
		font-size: 1rem;
		font-weight: 600;
		line-height: 1.5;
		color: var(--main-text-color);
	}

	.option {
		display: flex;
		min-height: 3.5rem;
		cursor: pointer;
		align-items: center;
		gap: 0.75rem;
		border-radius: 1rem;
		padding: 0.75rem 1rem;
		border: 2px solid var(--input-bg-color);
		background-color: #ffffff;
		transition:
			border-color 0.15s ease,
			background-color 0.15s ease;
	}

	.option.selected {
		border-color: var(--button-green);
		background-color: color-mix(in srgb, var(--button-green) 30%, white);
	}

	.option-text {
		min-width: 0;
		flex: 1;
		font-size: 0.875rem;
		color: var(--main-text-color);
		overflow-wrap: anywhere;
	}

	.dot {
		display: flex;
		height: 1rem;
		width: 1rem;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		border: 2px solid var(--input-bg-color);
		transition: border-color 0.15s ease;
	}

	.option.selected .dot {
		border-color: var(--button-green);
		background-color: var(--button-green);
	}

	.other-input,
	.open-input {
		width: 100%;
		border-radius: 1rem;
		border: 2px solid var(--input-bg-color);
		background-color: #ffffff;
		padding: 0.75rem 1rem;
		font: inherit;
		color: var(--main-text-color);
		outline: none;
	}

	.other-input:focus,
	.open-input:focus {
		border-color: var(--main-accent-color);
		box-shadow: 0 0 0 4px var(--input-bg-color);
	}

	.ladder {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.5rem;
	}

	.step {
		display: flex;
		height: 3.5rem;
		width: 3.5rem;
		cursor: pointer;
		align-items: center;
		justify-content: center;
		border-radius: 1rem;
		border: 2px solid var(--input-bg-color);
		background-color: #ffffff;
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--main-text-color);
		transition:
			border-color 0.15s ease,
			background-color 0.15s ease;
	}

	.step.selected {
		border-color: var(--button-green);
		background-color: var(--button-green);
		color: var(--button-green-text);
	}
</style>
