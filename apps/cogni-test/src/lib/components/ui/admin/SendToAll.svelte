<script lang="ts">
	import Input from '$lib/components/ui/admin/Input.svelte';
	import Textarea from '$lib/components/ui/admin/Textarea.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { sendNotificationToAll } from '$lib/utils/push';

	let payloadToAll = $state({
		title: '',
		body: '',
		icon: 'icon.png'
	});

</script>

<div class="flex flex-col items-center justify-center gap-4">
	<h2>Send push to all users</h2>
	<Input
		id="titleToAll"
		type="text"
		name="titleToAll"
		placeholder="title"
		bind:value={payloadToAll.title}
	/>

	<Textarea
		id="bodyToAll"
		name="bodyToAll"
		rows="4"
		placeholder="Write message here..."
		bind:value={payloadToAll.body}
	/>

	<Button color="green" onclick={() => sendNotificationToAll(payloadToAll)}>Send</Button>
</div>
