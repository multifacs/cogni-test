<script lang="ts">
	import ScheduleToAll from '$lib/components/ui/admin/ScheduleToAll.svelte';
	import SendNotification from '$lib/components/ui/admin/SendNotification.svelte';
	import SendToAll from '$lib/components/ui/admin/SendToAll.svelte';
	import Button from '$lib/components/ui/Button.svelte';
</script>

<section class="banner">
	<h1 class="text-3xl font-bold">Управление уведомлениями</h1>
</section>

<main class="main flex flex-col items-center justify-center gap-4">
	<div class="grid grid-cols-3">
		<div class="rounded-lg border border-blue-900 p-3">
			<SendNotification />
		</div>
		<div class="rounded-lg border border-blue-900 p-3">
			<SendToAll />
		</div>
		<div class="rounded-lg border border-blue-900 p-3">
			<ScheduleToAll />
		</div>
	</div>
</main>
<section class="low-content grid grid-cols-3">
	<div></div>
	<Button color="red" goto="/admin">Назад</Button>
	<div></div>
</section>
