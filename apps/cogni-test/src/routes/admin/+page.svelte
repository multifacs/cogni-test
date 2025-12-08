<script lang="ts">
	import ScheduleToAll from '$lib/components/ui/admin/ScheduleToAll.svelte';
	import SendNotification from '$lib/components/ui/admin/SendNotification.svelte';
	import SendToAll from '$lib/components/ui/admin/SendToAll.svelte';
</script>

<div class="mb-4 text-white">
	<h1>Admin page</h1>
</div>
<div
	class="h-auto w-auto flex items-stretch gap-4 sm:gap-6"
>
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
