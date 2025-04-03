<script lang="ts">
	let {
		sign = '!='
	}: {
		sign: string | null;
	} = $props();

	const srcs = {
		'=': '../math/equals.svg',
		'!=': '../math/not-equal.svg',
		'>': '../math/greater-than.svg',
		'<': '../math/less-than.svg',
		'>=': '../math/greater-than-equal.svg',
		'<=': '../math/less-than-equal.svg'
	};
</script>

<img
	src={sign ? srcs[sign] : srcs['!=']}
	style={sign ? 'display: block' : 'display: none'}
	alt="equals"
/>

<style>
	img {
		width: 30px;
		filter: invert(100%);
	}
</style>
