<script lang="ts">
	type Props = {
		title: string;
		value?: string | number | null;
	};

	let { title, value }: Props = $props();
</script>

<div class="glass-card flex flex-col items-center justify-center gap-1 p-5 text-center">
	<div class="text-sm opacity-80">{title}</div>
	<div class="text-2xl font-bold">{value ? value : '—'}</div>
	{#if !value}
		<div class="text-xs text-gray-400">Нет данных</div>
	{/if}
</div>
