<script lang="ts">
	import ScheduleToAll from '$lib/components/ui/admin/ScheduleToAll.svelte';
	import SendNotification from '$lib/components/ui/admin/SendNotification.svelte';
	import SendToAll from '$lib/components/ui/admin/SendToAll.svelte';
</script>

<div
	class="scrollbar-hide mb-4 flex flex-col items-center gap-4 overflow-auto text-center text-white"
>
	<div class="mb-4">
		<h1>Admin page</h1>
	</div>
	<div class="flex h-auto w-auto flex-col gap-4 lg:flex-row">
		<div class="rounded-lg border-1 border-blue-900 p-3">
			<SendNotification />
		</div>
		<div class="rounded-lg border-1 border-blue-900 p-3">
			<SendToAll />
		</div>
		<div class="rounded-lg border-1 border-blue-900 p-3">
			<ScheduleToAll />
		</div>
	</div>
</div>

<style>
	@layer utilities {
		/* For Webkit browsers (Chrome, Safari, Edge) */
		.scrollbar-hide::-webkit-scrollbar {
			display: none;
		}
		/* For IE, Edge, and Firefox */
		.scrollbar-hide {
			-ms-overflow-style: none; /* IE and Edge */
			scrollbar-width: none; /* Firefox */
		}
	}
</style>
