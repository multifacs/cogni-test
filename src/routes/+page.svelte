<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { profileSurveyStore, userStore } from '$lib/stores/user.js';
	import { resolve } from '$app/paths';

	import Button from '$lib/components/ui/Button.svelte';
	import DateInput from '$lib/components/ui/login-form/DateInput.svelte';
	import TextInput from '$lib/components/ui/login-form/TextInput.svelte';

	let firstname = $state('');
	let lastname = $state('');
	let birthdate = $state('');
	let sex = $state<'male' | 'female'>('male');

	let firstnameError = $state('');
	let lastnameError = $state('');
	let dateError = $state('');

	// по умолчанию галочка стоит
	let consentChecked = $state(true);

	onMount(() => {
		userStore.set(null);
		profileSurveyStore.set(null);
	});

	function isSubmitDisabled() {
		return (
			!firstname ||
			!lastname ||
			firstnameError.length > 0 ||
			lastnameError.length > 0 ||
			dateError.length > 0 ||
			!consentChecked
		);
	}
</script>

<form
	class="mx-auto flex w-full max-w-sm flex-col gap-4 rounded-3xl bg-(--main-bg-color) p-6 text-white shadow-xl"
	method="POST"
	action="?/login"
	use:enhance
>
	<div class="flex justify-center gap-5">
		<img src="/logo.svg" class="w-[25%]" alt="Cogni-Test logo" />
		<h1 style="text-align: left; font-size: clamp(1.2rem, 3vw, 2rem);">
			Добро пожаловать в Cogni Test!
		</h1>
	</div>

	<div class="flex flex-col gap-1">
		<label for="firstname">Введите ваше имя</label>
		<TextInput
			required
			name="firstname"
			bind:value={firstname}
			bind:errorMessage={firstnameError}
		/>
	</div>

	<div class="flex flex-col gap-1">
		<label for="lastname">Введите первые 2 буквы фамилии</label>
		<TextInput
			required
			name="lastname"
			bind:value={lastname}
			bind:errorMessage={lastnameError}
		/>
	</div>

	<div class="flex flex-col gap-1">
		<label for="birthday">Введите дату рождения</label>
		<DateInput required name="birthday" bind:value={birthdate} bind:errorMessage={dateError} />
	</div>

	<div class="flex items-center justify-between gap-2 text-sm">
		<label for="sex">Введите ваш пол</label>
		<label><input type="radio" name="sex" bind:group={sex} value="male" /> Мужской</label>
		<label><input type="radio" name="sex" bind:group={sex} value="female" /> Женский</label>
	</div>

	<div class="mt-3 flex items-center gap-2 text-sm">
		<input
			id="consent"
			type="checkbox"
			class="h-4 w-4"
			name="consent"
			value="true"
			required
			bind:checked={consentChecked}
		/>
		<label for="consent" class="select-none">
			Согласен(а) на
			<a href={resolve('/consent')} class="underline hover:opacity-80" target="_blank">
				обработку персональных данных
			</a>
		</label>
	</div>

	<Button type="submit" color="green" disabled={isSubmitDisabled()}>Войти</Button>
</form>
