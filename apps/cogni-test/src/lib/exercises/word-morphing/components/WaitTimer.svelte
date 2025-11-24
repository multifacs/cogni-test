<script lang="ts">
	import { formatTime } from '../logic';

	let { timerEndsAt, currentTime } = $props();
</script>

<div class="flex flex-col items-center gap-4">
	<h2>Время запоминания:</h2>
	<div class="grid items-center justify-items-center">
		<span class="col-start-1 row-start-1 text-3xl"
			>{timerEndsAt
				? formatTime(Math.max(0, Math.floor((timerEndsAt - currentTime) / 1000)))
				: formatTime(0)}</span
		>
	</div>
</div>
