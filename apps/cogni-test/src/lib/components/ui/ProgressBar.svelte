<script lang="ts">
    let { min, max, progress } = $props();
</script>

<div class="flex w-full h-1.5 bg-surface-1 rounded-full overflow-hidden bg-blue-100" role="progressbar" aria-valuenow={progress} aria-valuemin={min} aria-valuemax={max}>
  <div class="flex flex-col justify-center rounded-full overflow-hidden bg-red-500 text-xs text-primary-foreground text-center whitespace-nowrap transition duration-500" style={`width: ${(progress - min) / (max - min) * 100}%`}></div>
</div>