<script lang="ts">
	import Button from './Button.svelte';
</script>

<div class="card">
	<div class="line"></div>
	<div>
		<div class="m-4 flex items-center">
			<img src="icons/book-open.svg" class="img" />
			<h2
				style="font-weight: var(--font-weight-bold); --tw-font-weight: var(--font-weight-bold)"
			>
				Совет дня
			</h2>
		</div>
		<h4 style="text-align: left; padding-left: 1rem;">
			Статья: как физическая активность влияет на память
		</h4>
		<div class="mb-2 flex flex-row-reverse p-2.5">
			<Button color="green" goto="/exercises">Прочитать</Button>
		</div>
	</div>
</div>

<style>
	.card {
		background-color: #fff;
		border-radius: 1rem;
		display: flex;
		flex-direction: row;
		gap: 2vw;
		overflow: hidden;
		padding-right: 1.5rem;
	}

	.line {
		background-color: var(--main-accent-color);
		width: 1.2rem;
		height: 100%;
	}

	.img {
		width: 25%;
		margin-right: 1rem;
	}
</style>
