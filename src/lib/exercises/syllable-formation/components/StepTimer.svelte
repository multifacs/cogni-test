<script lang="ts">
	/** Чистый дисплей остатка времени; логика переходов — в Playground. */
	let {
		deadline,
		now
	}: {
		deadline: number;
		now: number;
	} = $props();

	const remainingMs = $derived(Math.max(0, deadline - now));
	const label = $derived(
		`${Math.floor(remainingMs / 60_000)}:${String(Math.floor((remainingMs % 60_000) / 1000)).padStart(2, '0')}`
	);
</script>

<div
	class="text-3xl font-bold text-[var(--main-text-color)] tabular-nums sm:text-4xl"
	aria-live="off"
>
	{label}
</div>
