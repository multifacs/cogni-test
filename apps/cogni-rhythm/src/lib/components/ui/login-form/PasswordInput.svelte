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
</script>

<input
	{required}
	{name}
	type="password"
	bind:value
    placeholder={placeholder}
	{...restProps}
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
