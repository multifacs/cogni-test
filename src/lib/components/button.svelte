<script lang="ts">
	let { kind = 'normal', color = 'green', children, onclick, disabled = null, type = null } = $props();
</script>

<button class={`button ${kind}`} style="background-color: var(--button-{color});" {onclick} {disabled} {type}>
	{@render children()}
</button>

<style>
	.button {
		color: white;
		border: none;
		border-radius: 5px;
		cursor: pointer;
		transition: background-color 0.2s ease;
	}

	.normal {
		font-size: 16px;
		padding: 10px 20px;
	}

	.big {
		padding: 10px 20px;
		margin: 5px;
		width: 80px;
		height: 60px;
	}

	.small {
		width: 80px;
		padding: 5px;
		color: #fff;
		border: none;
		border-radius: 5px;
		font-size: 16px;
		cursor: pointer;
	}

	.button:hover {
		filter: brightness(85%);
	}

	.button:disabled {
		filter: brightness(85%);
		filter: contrast(85%);
	}
</style>
