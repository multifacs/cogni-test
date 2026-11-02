<script lang="ts">
	let { min, max, progress } = $props();
</script>

<div
	class="bg-surface-1 flex h-2.5 w-full overflow-hidden rounded-full bg-white"
	role="progressbar"
	aria-valuenow={progress}
	aria-valuemin={min}
	aria-valuemax={max}
>
	<div
		class="text-primary-foreground flex flex-col justify-center overflow-hidden rounded-full bg-(--main-accent-color) text-center text-xs whitespace-nowrap"
		style={`width: ${((progress - min) / (max - min)) * 100}%`}
	></div>
</div>
