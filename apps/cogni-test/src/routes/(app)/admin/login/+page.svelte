<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/components/ui/Button.svelte';
	import TextInput from '$lib/components/ui/login-form/TextInput.svelte';

	let { form } = $props();
</script>

<section class="banner">
	<h1 class="text-3xl font-bold">Admin page</h1>
</section>

<main class="main flex flex-col items-center justify-center gap-4">
	<form
		class="mx-auto flex max-w-sm flex-col gap-4 rounded-3xl bg-gray-700 p-6 text-white shadow-xl"
		method="POST"
		action="?/login"
		use:enhance
	>
		<h2>Please login to continue</h2>
		{#if form?.incorrect}
			<p class="text-red-500">Incorrect password</p>
		{/if}
		<TextInput
			plain
			type="password"
			name="password"
			id="password"
			placeholder="Enter password..."
			required
		/>
		<Button type="submit" color="green">Login</Button>
	</form>
</main>
<section class="low-content flex items-center justify-center">
	<p class="max-w-md text-center text-lg max-md:text-sm">Вход в админку</p>
</section>