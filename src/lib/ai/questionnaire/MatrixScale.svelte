<script lang="ts">
	import { MATRIX_SCALE } from '$lib/ai/questionnaire/questions';
	import type {
		AiSurveyAnswerValue,
		MatrixAnswer,
		MatrixQuestion
	} from '$lib/ai/questionnaire/types';

	let {
		question,
		value = $bindable()
	}: {
		question: MatrixQuestion;
		value?: AiSurveyAnswerValue;
	} = $props();

	const answer = $derived(
		typeof value === 'object' &&
			value !== null &&
			!Array.isArray(value) &&
			!('choice' in value) &&
			!('choices' in value)
			? (value as MatrixAnswer)
			: null
	);

	/** Короткая подпись опции: '1'..'5' и «Затрудняюсь» для развёрнутой. */
	function scaleLabel(scale: string): string {
		return scale.length === 1 ? scale : 'Затрудняюсь';
	}

	function choose(row: string, scale: string): void {
		value = { ...(answer ?? {}), [row]: scale };
	}
</script>

<div class="matrix">
	{#each question.rows as row (row)}
		<div class="matrix-row">
			<span class="row-text">{row}</span>
			<div class="options" role="radiogroup" aria-label={row}>
				{#each MATRIX_SCALE as scale (scale)}
					<label class="option">
						<input
							type="radio"
							name={`${question.id}: ${row}`}
							checked={answer?.[row] === scale}
							onchange={() => choose(row, scale)}
							aria-label={`${row} — ${scale}`}
						/>
						<span class="option-label">{scaleLabel(scale)}</span>
					</label>
				{/each}
			</div>
		</div>
	{/each}
</div>

<style>
	.matrix {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.matrix-row {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.row-text {
		font-size: 0.8125rem;
		line-height: 1.35;
		color: var(--main-text-color);
		overflow-wrap: anywhere;
	}

	/* 6 опций в одном ряду на 100% ширины контейнера — без горизонтального скролла */
	.options {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 0.25rem;
	}

	.option {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		cursor: pointer;
	}

	.option input {
		height: 1.25rem;
		width: 1.25rem;
		cursor: pointer;
		accent-color: var(--main-accent-color);
	}

	.option-label {
		text-align: center;
		font-size: 0.6875rem;
		line-height: 1.2;
		font-weight: 600;
		opacity: 0.6;
		color: var(--main-text-color);
		overflow-wrap: anywhere;
	}

	@media (max-width: 639px) {
		.option-label {
			font-size: 0.625rem;
		}
	}
</style>
