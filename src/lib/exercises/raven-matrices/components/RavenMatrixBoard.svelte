<script lang="ts">
	import type { GeneratedRavenTask } from '../types';
	import RavenCell from './RavenCell.svelte';

	export let task: GeneratedRavenTask;
</script>

<div class="board-frame" aria-label="Матрица задания">
	<div class="board">
		{#each task.cells as cell, index (cell.id)}
			<div class="board-cell" class:missing={index === task.missingIndex}>
				<RavenCell
					cell={index === task.missingIndex ? null : cell}
					missing={index === task.missingIndex}
					cellId={`${task.id}-matrix-${index}`}
				/>
			</div>
		{/each}
	</div>
</div>

<style>
	.board-frame {
		width: 100%;
		display: grid;
		place-items: center;
	}

	.board {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: clamp(0.28rem, 1.2vw, 0.55rem);
		width: min(100%, 340px);
		padding: clamp(0.45rem, 1.3vw, 0.65rem);
		border: 1px solid rgb(125 142 170 / 0.22);
		border-radius: 1rem;
		background: linear-gradient(145deg, #edf6ff 0%, #f8f4ff 100%);
		box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.85);
	}

	.board-cell {
		min-width: 0;
		border-radius: 0.9rem;
	}

	.board-cell.missing {
		outline: 2px dashed rgb(100 116 139 / 0.36);
		outline-offset: -4px;
	}

	@media (max-width: 420px) {
		.board {
			width: min(100%, 310px);
		}
	}
</style>
