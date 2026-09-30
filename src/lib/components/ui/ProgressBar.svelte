<script lang="ts">
	let { min, max, progress } = $props();
</script>

<div
	class="bg-surface-1 flex h-1.5 w-full overflow-hidden rounded-full bg-blue-100"
	role="progressbar"
	aria-valuenow={progress}
	aria-valuemin={min}
	aria-valuemax={max}
>
	<div
		class="text-primary-foreground flex flex-col justify-center overflow-hidden rounded-full bg-red-500 text-center text-xs whitespace-nowrap transition-[width] duration-300 ease-linear"
		style={`width: ${((progress - min) / (max - min)) * 100}%`}
	></div>
</div>
