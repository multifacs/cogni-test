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
	let sex = $state('male');

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
		return firstname.length == 0 ||
			lastname.length == 0 ||
			firstnameError.length ||
			lastnameError.length ||
			dateError.length
			? true
			: false;
	}
</script>

<form
	class="login-container flex max-w-[350px] min-w-[300px] touch-none flex-col gap-1 rounded-4xl bg-gray-700 p-5 shadow-md"
	method="POST"
	action="?/login"
	use:enhance
>
	<h1 class="max-xs:hidden">Вход</h1>
	<h2 class="xs:hidden">Вход</h2>
	<label for="firstname">Имя:</label>
	<TextInput required name="firstname" bind:value={firstname} bind:errorMessage={firstnameError}
	></TextInput>

	<label for="lastname">Первые две буквы фамилии:</label>
	<TextInput required name="lastname" bind:value={lastname} bind:errorMessage={lastnameError}
	></TextInput>

	<label for="birthdate">Дата рождения:</label>
	<DateInput required name="birthdate" bind:value={birthdate} bind:errorMessage={dateError}
	></DateInput>

	<div class="flex justify-between">
		<label for="sex">Пол:</label>
		<label>
			<input
				class="cursor-pointer"
				type="radio"
				name="sex"
				bind:group={sex}
				value="male"
				required
			/> Мужской
		</label>
		<label>
			<input class="cursor-pointer" type="radio" name="sex" bind:group={sex} value="female" /> Женский</label
		>
	</div>

	<div class="input-group hidden">
		<label for="cataract">Есть ли у вас катаракта?</label>
		<div class="gender-group">
			<label>
				<input type="radio" name="cataract" bind:group={cataract} value="yes" required /> Да
			</label>
			<label>
				<input type="radio" name="cataract" bind:group={cataract} value="no" /> Нет
			</label>
		</div>
	</div>

	<div class="input-group hidden">
		<label for="colorist">Вы художник или фотограф?</label>
		<div class="gender-group">
			<label>
				<input type="radio" name="colorist" bind:group={colorist} value="yes" required /> Да
			</label>
			<label>
				<input type="radio" name="colorist" bind:group={colorist} value="no" /> Нет
			</label>
		</div>
	</div>

	<div class="input-group hidden">
		<label for="neuro">Есть ли у вас неврологические заболевания ?</label>
		<div class="gender-group">
			<label>
				<input type="radio" name="neuro" bind:group={neuro} value="yes" required /> Да
			</label>
			<label>
				<input type="radio" name="neuro" bind:group={neuro} value="no" /> Нет
			</label>
		</div>
	</div>

	<Button color="green" type="submit" disabled={isSubmitDisabled()}>Войти</Button>
</form>
