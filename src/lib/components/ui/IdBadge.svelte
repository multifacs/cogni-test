<script lang="ts">
	export let userId: string = '';
</script>

<div
	class="text-teal inline-flex items-center rounded-full bg-gray-50 p-2 text-[10px] leading-none shadow sm:text-sm"
>
	<span
		class="inline-flex h-6 items-center justify-center rounded-full bg-indigo-700 px-3 text-gray-50"
	>
		<span class="hidden sm:block">
            User ID:
        </span>
        <span class="block sm:hidden">
            ID:
        </span>
	</span>
	<span class="flex flex-col px-2 text-indigo-700">
		<span class="hidden sm:block">
            {userId}
        </span>
        <span class="block sm:hidden">
            {userId.slice(0,18)}
        </span>
        <span class="block sm:hidden">
            {userId.slice(19,36)}
        </span>
	</span>
</div>
