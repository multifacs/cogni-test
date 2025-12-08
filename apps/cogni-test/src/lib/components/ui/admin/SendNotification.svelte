<script lang="ts">
	import Input from '$lib/components/ui/admin/Input.svelte';
	import Textarea from '$lib/components/ui/admin/Textarea.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import {
		sendNotification,
		type PushPayload
	} from '$lib/utils/push';

	let payload: PushPayload = $state({
		title: '',
		body: '',
		icon: 'icon.png'
	});

	let delay = $state(0);
</script>

<div class="flex flex-col justify-center items-center gap-4">
	<h2>Send push</h2>
	<Input id="title" type="text" name="title" placeholder="title" bind:value={payload.title} />

	<Textarea
		id="body"
		name="body"
		rows="4"
		placeholder="Write message here..."
		bind:value={payload.body}
	/>

	<Input type="number" name="delay" placeholder="Delay (seconds)" bind:value={delay} />
	<Button color="green" onclick={() => sendNotification(payload, delay)}>Send</Button>
</div>
