<script lang="ts">
	import type {
		AiSurveyAnswerValue,
		MultiAnswer,
		MultiQuestion
	} from '$lib/ai/questionnaire/types';

	let {
		question,
		value = $bindable()
	}: {
		question: MultiQuestion;
		value?: AiSurveyAnswerValue;
	} = $props();

	const otherOpt = $derived(question.other ?? null);
	const noneOpt = $derived(question.none ?? null);

	const answer = $derived(
		typeof value === 'object' &&
			value !== null &&
			'choices' in value &&
			Array.isArray(value.choices)
			? (value as MultiAnswer)
			: null
	);
	const choices = $derived(answer?.choices ?? []);

	function isChecked(opt: string): boolean {
		return choices.includes(opt);
	}

	function toggle(opt: string): void {
		const current = new Set(choices);
		const noneLabel = noneOpt?.label;
		if (noneLabel !== undefined && opt === noneLabel) {
			// «Ничего из этого» — исключающий вариант: снимает все остальные
			// (включая текст «Другого»)
			value = current.has(opt) ? { choices: [] } : { choices: [opt] };
			return;
		}
		if (current.has(opt)) {
			current.delete(opt);
		} else {
			current.add(opt);
		}
		// выбор обычной опции снимает «Ничего из этого»
		if (noneLabel !== undefined) {
			current.delete(noneLabel);
		}
		const next: MultiAnswer = { choices: [...current] };
		if (answer?.other) {
			next.other = answer.other;
		}
		value = next;
	}

	function onOtherInput(event: Event): void {
		const text = (event.currentTarget as HTMLInputElement).value;
		// Пустой (trim) текст = «Другое» не отмечено: чекбокс снимается,
		// other не попадает в ответ (spec-review Finding 2)
		const hasText = text.trim() !== '';
		const current = new Set(choices);
		// непустой ввод подразумевает выбранный чекбокс «Другое»
		if (otherOpt) {
			if (hasText) {
				current.add(otherOpt.label);
			} else {
				current.delete(otherOpt.label);
			}
		}
		const next: MultiAnswer = { choices: [...current] };
		if (hasText) {
			next.other = text;
		}
		value = next;
	}
</script>

<div class="flex flex-col gap-3">
	{#each question.options as opt (opt)}
		<label class="option" class:selected={isChecked(opt)}>
			<input
				type="checkbox"
				checked={isChecked(opt)}
				onchange={() => toggle(opt)}
				class="sr-only"
			/>
			<span class="box" aria-hidden="true"
				>{#if isChecked(opt)}✓{/if}</span
			>
			<span class="option-text">{opt}</span>
		</label>
	{/each}

	{#if otherOpt}
		<label class="option" class:selected={isChecked(otherOpt.label)}>
			<input
				type="checkbox"
				checked={isChecked(otherOpt.label)}
				onchange={() => toggle(otherOpt.label)}
				class="sr-only"
			/>
			<span class="box" aria-hidden="true"
				>{#if isChecked(otherOpt.label)}✓{/if}</span
			>
			<span class="option-text">{otherOpt.label}</span>
		</label>
		{#if isChecked(otherOpt.label)}
			<input
				type="text"
				class="other-input"
				placeholder={otherOpt.label}
				aria-label={otherOpt.label}
				value={answer?.other ?? ''}
				oninput={onOtherInput}
			/>
		{/if}
	{/if}

	{#if noneOpt}
		<label class="option" class:selected={isChecked(noneOpt.label)}>
			<input
				type="checkbox"
				checked={isChecked(noneOpt.label)}
				onchange={() => toggle(noneOpt.label)}
				class="sr-only"
			/>
			<span class="box" aria-hidden="true"
				>{#if isChecked(noneOpt.label)}✓{/if}</span
			>
			<span class="option-text">{noneOpt.label}</span>
		</label>
	{/if}
</div>

<style>
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

	.box {
		display: flex;
		height: 1.25rem;
		width: 1.25rem;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		border-radius: 0.375rem;
		border: 2px solid var(--input-bg-color);
		color: var(--button-green-text);
		font-size: 0.875rem;
		font-weight: 700;
		line-height: 1;
		transition: border-color 0.15s ease;
	}

	.option.selected .box {
		border-color: var(--button-green);
		background-color: var(--button-green);
	}

	.other-input {
		width: 100%;
		border-radius: 1rem;
		border: 2px solid var(--input-bg-color);
		background-color: #ffffff;
		padding: 0.75rem 1rem;
		font: inherit;
		color: var(--main-text-color);
		outline: none;
	}

	.other-input:focus {
		border-color: var(--main-accent-color);
		box-shadow: 0 0 0 4px var(--input-bg-color);
	}
</style>
