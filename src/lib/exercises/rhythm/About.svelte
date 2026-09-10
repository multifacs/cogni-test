<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
</script>

<Card className="p-2!">
	<p>
		Один шарик в центре. Дорожка с ритмом движется под ним. Сначала ритм показывается, затем вы
		повторяете его.
	</p>
	<div>
		Первые два прохода — эталон, <b>нажатия не учитываются</b>. Затем нужно ориентироваться на
		<b>подсказки</b>
		и нажимать в нужный момент, а после ориентироваться только на ритм и нажимать без
		<b>подсказок</b>.
	</div>
	<div class="mt-1 flex flex-wrap items-center justify-center gap-3 text-xs text-gray-400">
		<div class="legend-item flex items-center gap-2">
			<span class="ghost inline-block h-5 w-5 rounded-3xl"></span>
			<span>Подсказки (первые 4 прохода)</span>
		</div>
		<div class="legend-item flex items-center gap-2">
			<span class="user inline-block h-5 w-5 rounded-3xl"></span>
			<span>Ваши нажатия</span>
		</div>
	</div>
</Card>

<style>
	.ghost {
		background: rgba(148, 163, 184, 0.85);
	}

	.user {
		background: #60a5fa;
	}
</style>
