<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
</script>

<div class="flex flex-col items-center gap-1 p-1.5">
	<div class="text-center">
		<h2 class="title">Ритмический тест</h2>
		<p class="subtitle">
			Один шарик в центре. Дорожка с ритмом движется под ним. Сначала ритм показывается, затем
			вы повторяете его.
		</p>
	</div>

	<Card>
		<div class="overlay-text">
			Первые два прохода — эталон, <b>нажатия не учитываются</b>. Затем нужно ориентироваться
			на <b>подсказки</b>
			и нажимать в нужный момент, а после ориентироваться только на ритм и нажимать без
			<b>подсказок</b>.
		</div>
	</Card>

	<div class="legend">
		<div class="legend-item flex gap-2 items-center">
			<span class="legend-dot ghost"></span>
			<span>Подсказки (первые 4 прохода)</span>
		</div>
		<div class="legend-item flex gap-2 items-center">
			<span class="legend-dot user"></span>
			<span>Ваши нажатия</span>
		</div>
	</div>
</div>

<style>
	.legend {
		margin-top: 0.25rem;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.8rem;
		color: #9ca3af;
	}

	.legend-dot {
		width: 20px;
		height: 20px;
		border-radius: 999px;
		display: inline-block;
	}

	.legend-dot.ghost {
		background: rgba(148, 163, 184, 0.85);
	}

	.legend-dot.user {
		background: #60a5fa;
	}
</style>
