<script lang="ts">
	let {
		name,
		value = $bindable(),
		required = false,
		errorMessage = $bindable(),
		placeholder = '',
		plain = false,
		...restProps
	} = $props();

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
		validate(value);
	}
	function validate(valueStr: string) {
		if (plain) return;
		if (valueStr.length < 2) {
			errorMessage = 'Нужно ввести всё';
			return false;
		}

		errorMessage = '';
		return true;
	}
</script>

<input
	{required}
	{name}
	type={restProps.type ?? 'text'}
	bind:value
	placeholder={placeholder ? placeholder : name == 'firstname' ? 'ИМЯ' : 'ФА'}
	oninput={handleInput}
	maxlength={plain ? 99 : 10}
	{...restProps}
	class={`
	max-xs:text-base
	max-xs:p-1
	xs:p-2.5
	block
	w-full
	rounded-lg
    border
	bg-[#E5E7EB]
    p-2
    text-white
    placeholder-gray-400
    outline-0
    transition
   focus:border-[var(--main-accent-color)]
    focus:ring-[var(--main-accent-color)]
	${errorMessage ? 'border-red-500' : 'border-gray-600'}
  `}
/>
