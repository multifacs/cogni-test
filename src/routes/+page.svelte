<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { userStore } from '$lib/stores/user.js';

	import Button from '$lib/components/ui/Button.svelte';
	import DateInput from '$lib/components/ui/login-form/DateInput.svelte';
	import TextInput from '$lib/components/ui/login-form/TextInput.svelte';

	let { data } = $props();

	let firstname = $state('');
	let lastname = $state('');
	let birthdate = $state('31.01.2001');
	let sex = $state<'male' | 'female'>('male');

	let cataract = $state('no');
	let colorist = $state('no');
	let neuro = $state('no');

	let firstnameError = $state('');
	let lastnameError = $state('');
	let dateError = $state('');

	onMount(() => {
		userStore.set(data.user || '');
	});

	function isSubmitDisabled() {
		return (
			!firstname ||
			!lastname ||
			firstnameError.length > 0 ||
			lastnameError.length > 0 ||
			dateError.length > 0
		);
	}
</script>

<form
	class="mx-auto flex w-full max-w-sm flex-col gap-4 rounded-3xl bg-gray-700 p-6 text-white shadow-xl"
	method="POST"
	action="?/login"
	use:enhance
>
	<h1 class="mb-2 text-center text-2xl font-bold">Вход</h1>

	<div class="flex flex-col gap-1">
		<label for="firstname">🧍 Имя</label>
		<TextInput
			required
			name="firstname"
			bind:value={firstname}
			bind:errorMessage={firstnameError}
		/>
	</div>

	<div class="flex flex-col gap-1">
		<label for="lastname">🔠 Первые 2 буквы фамилии</label>
		<TextInput required name="lastname" bind:value={lastname} bind:errorMessage={lastnameError} />
	</div>

	<div class="flex flex-col gap-1">
		<label for="birthdate">🎂 Дата рождения</label>
		<DateInput required name="birthdate" bind:value={birthdate} bind:errorMessage={dateError} />
	</div>

	<div class="flex items-center justify-between gap-2 text-sm">
		<label for="sex">⚧️ Пол</label>
		<label><input type="radio" name="sex" bind:group={sex} value="male" /> Мужской</label>
		<label><input type="radio" name="sex" bind:group={sex} value="female" /> Женский</label>
	</div>

	<input type="hidden" name="cataract" value={cataract} />
	<input type="hidden" name="colorist" value={colorist} />
	<input type="hidden" name="neuro" value={neuro} />

	<Button type="submit" color="green" disabled={isSubmitDisabled()}>Войти</Button>
</form>
