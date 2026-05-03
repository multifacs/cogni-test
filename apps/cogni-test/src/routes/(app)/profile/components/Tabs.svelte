<script lang="ts">
	// Svelte 5 props
	let {
		tabs = [],
		activeTab = $bindable(),
		onTabChange = () => {},
		children
	}: {
		tabs: { id: string; label: string; disabled?: boolean }[];
		activeTab: string;
		onTabChange?: (id: string) => void;
		children: any;
	} = $props();
</script>

<ul class="w-full flex gap-1 text-center text-sm font-medium justify-center">
	{#each tabs as tab}
		<li class="me-2 shrink-0" class:max-md:flex-1={!tab.disabled && activeTab === tab.id}>
			<button
				class="
                inline-block
                w-full
                cursor-pointer
                truncate
                overflow-hidden
                rounded-sm
                px-4
                py-2.5
				text-sm
				text-ellipsis
				max-md:text-xs
                "
				class:grow-3={!tab.disabled && activeTab === tab.id}
				class:text-fg-disabled={tab.disabled}
				class:cursor-not-allowed={tab.disabled}
				class:bg-blue-600={!tab.disabled && activeTab === tab.id}
				class:text-white={!tab.disabled && activeTab === tab.id}
				class:font-bold={!tab.disabled && activeTab === tab.id}
				class:hover:text-heading={!tab.disabled && activeTab !== tab.id}
				class:hover:bg-gray-600={!tab.disabled && activeTab !== tab.id}
				class:bg-blue-900={!tab.disabled && activeTab !== tab.id}
				onclick={() => {
					console.log(activeTab);
					return !tab.disabled && onTabChange(tab.id);
				}}
				disabled={tab.disabled}
			>
				{activeTab === tab.id ? tab.label : tab.label.split(' ')[0]}
			</button>
		</li>
	{/each}
</ul>

<!-- Content -->
<div class="mt-4 w-full">
	{@render children()}
</div>
