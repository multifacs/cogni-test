<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { profileSurveyStore, userStore } from '$lib/stores/user.js';
	import { resolve } from '$app/paths';

	import Button from '$lib/components/ui/Button.svelte';
	import DateInput from '$lib/components/ui/login-form/DateInput.svelte';
	import TextInput from '$lib/components/ui/login-form/TextInput.svelte';

	let { form } = $props();

	let firstname = $state('');
	let lastname = $state('');
	let birthdate = $state('');
	let sex = $state<'male' | 'female'>('male');

	let firstnameError = $state('');
	let lastnameError = $state('');
	let dateError = $state('');

	let consentChecked = $state(false);

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

<div class="login-wrapper">
	<div class="login-card">
		<div class="flex items-center gap-4 text-center sm:flex-col">
			<img src="/logo.svg" class="h-auto w-8 sm:w-14" alt="Cogni-Test logo" />
			<h1
				class="text-sm leading-[1.15] font-bold tracking-[-0.01em] sm:text-2xl sm:font-extrabold"
			>
				<span class="whitespace-nowrap">Добро пожаловать</span>
				<span class="whitespace-nowrap"> в Cogni-Test!</span>
			</h1>
		</div>

		<form class="login-form" method="POST" action="?/login" use:enhance>
			<div class="field">
				<label for="firstname">Введите ваше имя</label>
				<TextInput
					required
					name="firstname"
					bind:value={firstname}
					bind:errorMessage={firstnameError}
				/>
			</div>

			<div class="field">
				<label for="lastname">Введите первые 2 буквы фамилии</label>
				<TextInput
					required
					name="lastname"
					bind:value={lastname}
					bind:errorMessage={lastnameError}
				/>
			</div>

			<div class="field">
				<label for="birthday">Введите дату рождения</label>
				<DateInput
					required
					name="birthday"
					bind:value={birthdate}
					bind:errorMessage={dateError}
				/>
			</div>

			<div class="sex-row">
				<span class="sex-caption">Введите ваш пол</span>
				<div class="sex-options">
					<label class="sex-label">
						<input type="radio" name="sex" bind:group={sex} value="male" />
						<span>Мужской</span>
					</label>
					<label class="sex-label">
						<input type="radio" name="sex" bind:group={sex} value="female" />
						<span>Женский</span>
					</label>
				</div>
			</div>

			<div class="consent-row">
				<input
					id="consent"
					type="checkbox"
					class="consent-checkbox"
					name="consent"
					value="true"
					required
					bind:checked={consentChecked}
				/>
				<label for="consent" class="select-none">
					Согласен(а) на
					<a
						href={resolve('/consent')}
						class="underline hover:text-[var(--main-accent-color)]"
						target="_blank"
					>
						обработку персональных данных
					</a>
				</label>
			</div>

			{#if form?.message}
				<p class="server-error" role="alert">{form.message}</p>
			{/if}

			<Button type="submit" color="green" disabled={isSubmitDisabled()}>Войти</Button>
		</form>
	</div>
</div>

<style>
	.login-wrapper {
		position: relative;
		overflow-y: auto;
		min-height: 100dvh;
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	.login-card {
		position: relative;
		z-index: 1;
		width: 100%;
		max-width: 28rem;
		background: rgba(255, 255, 255, 0.72);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border-radius: 1.5rem;
		padding: 2rem;
		box-shadow:
			0 1px 2px rgba(0, 0, 0, 0.04),
			0 8px 24px rgba(0, 0, 0, 0.08),
			0 24px 64px rgba(30, 60, 114, 0.12);
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	@supports not ((backdrop-filter: blur(12px)) or (-webkit-backdrop-filter: blur(12px))) {
		.login-card {
			background: #ffffff;
		}
	}

	.login-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.sex-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
		font-size: clamp(0.75rem, 1.5vw, 0.875rem);
	}

	.sex-caption {
		font-weight: var(--font-weight-semibold);
	}

	.sex-options {
		display: flex;
		gap: 1rem;
	}

	.sex-options input {
		width: 1.1rem;
		height: 1.1rem;
		accent-color: var(--main-accent-color);
		cursor: pointer;
	}

	.sex-label {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-weight: 400;
		cursor: pointer;
		padding: 0.25rem 0;
	}

	.consent-row {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		font-size: clamp(0.75rem, 1.5vw, 0.875rem);
		margin-top: 0.25rem;
	}

	.consent-checkbox {
		width: 1.25rem;
		height: 1.25rem;
		margin-top: 0.1rem;
		flex-shrink: 0;
		cursor: pointer;
		accent-color: var(--main-accent-color);
	}

	.server-error {
		color: var(--error-color);
		font-size: 0.875rem;
		line-height: 1.4;
	}

	@media (max-width: 639px) {
		.login-wrapper {
			padding: 0.5rem;
		}

		.login-card {
			max-width: 100%;
			padding: 1.25rem;
			border-radius: 1.25rem;
			gap: 1.25rem;
		}

		/* Ensure touch targets stay >= 44px */
		.sex-label {
			padding: 0.35rem 0.25rem;
		}

		:global(.login-form button) {
			min-height: 2.75rem;
		}
	}
</style>
