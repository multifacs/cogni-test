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

	/** Короткая подпись колонки: '1'..'5' и «Затрудняюсь» для развёрнутой опции. */
	function scaleLabel(scale: string): string {
		return scale.length === 1 ? scale : 'Затрудняюсь';
	}

	function choose(row: string, scale: string): void {
		value = { ...(answer ?? {}), [row]: scale };
	}
</script>

<div class="matrix">
	<div class="matrix-row head">
		<span class="row-text"></span>
		{#each MATRIX_SCALE as scale (scale)}
			<span class="scale-label" title={scale}>{scaleLabel(scale)}</span>
		{/each}
	</div>

	{#each question.rows as row (row)}
		<div class="matrix-row">
			<span class="row-text">{row}</span>
			{#each MATRIX_SCALE as scale (scale)}
				<label class="cell">
					<input
						type="radio"
						name={`${question.id}: ${row}`}
						checked={answer?.[row] === scale}
						onchange={() => choose(row, scale)}
						aria-label={`${row} — ${scale}`}
					/>
				</label>
			{/each}
		</div>
	{/each}
</div>

<style>
	.matrix {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		overflow-x: auto;
	}

	.matrix-row {
		display: grid;
		grid-template-columns: minmax(12rem, 1fr) repeat(6, 2.75rem);
		align-items: center;
		gap: 0.25rem;
	}

	.matrix-row.head {
		padding-bottom: 0.25rem;
	}

	.row-text {
		font-size: 0.8125rem;
		line-height: 1.35;
		color: var(--main-text-color);
		overflow-wrap: anywhere;
		padding-right: 0.5rem;
	}

	.scale-label {
		text-align: center;
		font-size: 0.75rem;
		font-weight: 600;
		opacity: 0.6;
		color: var(--main-text-color);
	}

	.cell {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.cell input {
		height: 1.25rem;
		width: 1.25rem;
		cursor: pointer;
		accent-color: var(--main-accent-color);
	}

	@media (max-width: 639px) {
		.matrix-row {
			grid-template-columns: minmax(9rem, 1fr) repeat(6, 2rem);
		}
	}
</style>
