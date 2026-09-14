<script lang="ts">
	import cities from './russia-cities.json';

	let { query = $bindable() } = $props();
	let isOpen = $state(false);

	type City = {
		name: string;
		name_en?: string;
		type: string;
	};

	const cityOptions = cities.filter((c) => c.type === 'Город');

	let filtered = $derived(
		query
			? cityOptions
					.filter(
						(c) =>
							c.name.toLowerCase().includes(query.toLowerCase()) ||
							c.name_en?.toLowerCase().includes(query.toLowerCase())
					)
					.slice(0, 3)
			: cityOptions.slice(0, 3)
	);

	function selectCity(city: City) {
		query = city.name;
		isOpen = false;
	}

	function handleInput(e: Event & { currentTarget: HTMLInputElement }) {
		query = e.currentTarget.value;
		isOpen = true;
	}
</script>

<div class="relative w-full">
	<input
		value={query}
		oninput={handleInput}
		onfocus={(e) => {
			isOpen = true;
			e.currentTarget.style.borderColor = 'var(--main-accent-color)';
			e.currentTarget.style.boxShadow = '0 0 0 4px var(--input-bg-color)';
		}}
		onfocusout={() => setTimeout(() => (isOpen = false), 200)}
		onblur={(e) => {
			e.currentTarget.style.borderColor = query == null ? '#fb923c' : 'var(--input-bg-color)';
			e.currentTarget.style.boxShadow = 'none';
		}}
		placeholder="Начните печатать..."
		class="w-full rounded-xl px-4 py-3 transition-all outline-none"
		style="
			background-color: #ffffff;
			border: 2px solid {query == null ? '#fb923c' : 'var(--input-bg-color)'};
			color: var(--main-text-color);
		"
	/>

	{#if isOpen && filtered.length > 0}
		<ul
			class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl border bg-white shadow"
			style="
				border-color: var(--input-bg-color);
				color: var(--main-text-color);
			"
		>
			{#each filtered as city (city.id)}
				<li class="cursor-pointer px-3 py-2 hover:bg-gray-100">
					<button class="w-full text-left" onclick={() => selectCity(city)}>
						{city.name} ({city.region.name})
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
