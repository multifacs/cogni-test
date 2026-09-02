<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import { getCSSVar, translate } from '$lib/utils';
	import { colors } from './logic/lab-color.svelte';
</script>

<!-- <p>Тест включает в себя ограниченный набор цветов:</p>
<p class="font-bold">
	{#each Object.keys(colors).slice(0, -1) as color}
		<span style={`color: ${getCSSVar(`--camp-${color}`)}`}>{translate(color)}{`, `}</span>
	{/each}
	<span style={`color: ${getCSSVar(`--camp-${Object.keys(colors).slice(-1)[0]}`)}`}
		>{translate(Object.keys(colors).slice(-1)[0])}.</span
	>
</p> -->

<Card>
	<p class="sm:text-xl">
		<b>Первое задание</b><br />
		Показывается цветной квадрат и несколько фигурок внизу. Нажимайте «Проявить фигуру», пока не узнаете
		фигуру, затем выберите её. Всего 10 раз.
	</p>
	<p class="sm:text-xl">
		<b>Второе задание</b><br /> Показывается цветной квадрат с фигурой внутри. Нажимайте «Скрыть фигуру»,
		пока фигура не исчезнет из виду.
	</p>
</Card>
