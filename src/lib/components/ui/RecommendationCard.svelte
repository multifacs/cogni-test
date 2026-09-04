<script lang="ts">
	import Button from './Button.svelte';
	let { title, text, goto, icon, button_text } = $props();
</script>

<div class="card">
	<div class="line"></div>
	<div class=" flex w-full flex-col gap-5 p-5">
		<div class="flex items-center">
			<img src={icon} class="img" alt={title} />
			<h2
				style="text-align: left;font-weight: var(--font-weight-bold); --tw-font-weight: var(--font-weight-bold)"
			>
				{title}
			</h2>
		</div>
		<h4 style="text-align: left;">
			{text}
		</h4>
		<div class="flex flex-row-reverse">
			<Button color="green" {goto}>{button_text}</Button>
		</div>
	</div>
</div>

<style>
	.card {
		background-color: #fff;
		border-radius: 1rem;
		display: flex;
		flex-direction: row;
		gap: 3vw;
		overflow: hidden;
		padding-right: 1.5rem;
		min-height: clamp(120px, 20%, 200px);
		height: auto;
		width: 100%;
		max-width: 100%;
	}

	.line {
		background-color: var(--main-accent-color);
		width: clamp(1rem, 3.5vw, 2rem);
		flex-shrink: 0;
	}

	.img {
		width: 25%;
		margin-right: 1rem;
	}

	@media (min-width: 1024px) {
		.img {
			width: 7vw;
		}
	}
</style>
