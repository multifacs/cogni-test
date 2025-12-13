<script lang="ts">
	import Input from '$lib/components/ui/admin/Input.svelte';
	import Textarea from '$lib/components/ui/admin/Textarea.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { scheduleNotificationToAll } from '$lib/utils/push';

	let scheduledPayload = $state({
		title: '',
		body: '',
		icon: 'icon.png'
	});

	let scheduledTime = $state('2020-01-01T00:00:00');
</script>

<div class="flex flex-col items-center justify-center gap-4">
	<h2>Schedule push to all users</h2>
	<Input
		id="titleSchedule"
		type="text"
		name="titleSchedule"
		placeholder="title"
		bind:value={scheduledPayload.title}
	/>
	<Textarea
		id="bodySchedule"
		name="bodySchedule"
		rows="4"
		placeholder="Write message here..."
		bind:value={scheduledPayload.body}
	/>
	<label for="scheduledTime">Scheduled time</label>
	<Input
		type="datetime-local"
		name="scheduledTime"
		placeholder="Scheduled time"
		bind:value={scheduledTime}
	/>
	<Button
		color="green"
		onclick={() => {
			scheduleNotificationToAll(scheduledPayload, new Date(scheduledTime).getTime());
			console.log(scheduledTime);
		}}>Schedule</Button
	>
</div>
