<script lang="ts">
	let { name, value = $bindable(), required = false, placeholder = '', ...restProps } = $props();
</script>

<input
	{required}
	{name}
	bind:value
	{placeholder}
	{...restProps}
	class={`
                max-xs:text-base
                max-xs:p-1
                xs:p-2.5
                p-2
                block
                w-full
                rounded-lg
                border
                border-gray-600
                bg-white
                text-(--main-text-color)
                placeholder-gray-400
                outline-0
                transition
                focus:border-blue-500
                focus:ring-blue-500
            `}
/>
