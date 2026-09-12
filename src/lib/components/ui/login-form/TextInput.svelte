<script lang="ts">
	import { INPUT_CLASS } from './inputStyles';

	let {
		id = undefined,
		name,
		value = $bindable(),
		required = false,
		errorMessage = $bindable(),
		placeholder = '',
		plain = false,
		...restProps
	}: {
		id?: string;
		name?: string;
		value?: string;
		required?: boolean;
		errorMessage?: string;
		placeholder?: string;
		plain?: boolean;
	} = $props();

	const inputId = $derived(id ?? name);

	// Держим последний текст ошибки, пока слот сворачивается,
	// иначе контент исчезает раньше анимации и закрытие становится мгновенным
	let lastError = $state('');
	$effect(() => {
		if (errorMessage) lastError = errorMessage;
	});

	function handleInput(e: Event) {
		if (plain) return;
		const input = e.target as HTMLInputElement;
		let val = input.value.toUpperCase().replace(/[^A-ZА-Я]/g, '');

		// Ограничиваем длину
		if (name == 'lastname' && val.length > 2) {
			val = val.substring(0, 2);
		}

		input.value = val;
		value = val;
		errorMessage = '';
	}

	function handleBlur() {
		if (plain) return;
		validate();
	}

	function validate() {
		if (plain) return true;
		if (value.length < 2) {
			errorMessage = 'Нужно ввести всё';
			return false;
		}

		errorMessage = '';
		return true;
	}
</script>

<input
	id={inputId}
	{required}
	{name}
	type={restProps.type ?? 'text'}
	bind:value
	placeholder={placeholder ? placeholder : name == 'firstname' ? 'ИМЯ' : 'ФА'}
	oninput={handleInput}
	onblur={handleBlur}
	maxlength={plain ? 99 : 10}
	aria-invalid={errorMessage ? 'true' : undefined}
	aria-describedby={errorMessage ? `${inputId}-error` : undefined}
	{...restProps}
	class={`${INPUT_CLASS} ${errorMessage ? 'border-[var(--error-color)]' : 'border-gray-600'}`}
/>
<div class="err-collapse" class:open={!!errorMessage}>
	<div>
		<p
			id={errorMessage ? `${inputId}-error` : undefined}
			class="pt-1 text-sm text-[var(--error-color)]"
			aria-live="polite"
		>
			{errorMessage || lastError}
		</p>
	</div>
</div>

<style>
	.err-collapse {
		display: grid;
		grid-template-rows: 0fr;
		transition: grid-template-rows 0.25s ease;
	}
	.err-collapse.open {
		grid-template-rows: 1fr;
	}
	.err-collapse > div {
		overflow: hidden;
	}
	@media (prefers-reduced-motion: reduce) {
		.err-collapse {
			transition: none;
		}
	}
</style>
