<script lang="ts">
	let { name, value = $bindable(), required, errorMessage = $bindable() } = $props();

	function handleInput(e: Event) {
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
	type="text"
	bind:value
	placeholder={name == 'firstname' ? 'ИМЯ' : 'ФА'}
	oninput={handleInput}
	maxlength="10"
	class={`
	max-xs:text-base
	max-xs:p-1
	xs:p-2.5
	block
	w-full
    rounded-lg
	border
    bg-gray-700
    text-white
    placeholder-gray-400
    outline-0
    transition
    focus:border-blue-500
    focus:ring-blue-500
	${errorMessage ? 'border-red-500' : 'border-gray-600'}
  `}
/>
