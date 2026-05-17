<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<section class="banner">
	<h1 class="text-3xl font-bold">База пользователей</h1>
</section>

<main class="main flex flex-col items-center justify-center">
	<div class="border-default relative w-full overflow-x-auto rounded-2xl border shadow-xs">
		<table class="text-body w-full text-left text-sm rtl:text-right">
			<thead class="text-body border-default-medium border-b text-sm">
				<tr>
					<th scope="col" class="px-6 py-3 font-medium">ID</th>

					<th scope="col" class="px-6 py-3 font-medium"> Имя </th>

					<th scope="col" class="px-6 py-3 font-medium"> Фамилия </th>

					<th scope="col" class="px-6 py-3 font-medium"> Дата рождения </th>

					<th scope="col" class="px-6 py-3 font-medium"> Пол </th>

					<th scope="col" class="px-6 py-3 font-medium"> Math </th>

					<th scope="col" class="px-6 py-3 font-medium"> Stroop </th>

					<th scope="col" class="px-6 py-3 font-medium"> Munsterberg </th>

					<th scope="col" class="px-6 py-3 font-medium"> Memory </th>

					<th scope="col" class="px-6 py-3 font-medium"> Swallow </th>

					<th scope="col" class="px-6 py-3 font-medium"> Campimetry </th>

					<th scope="col" class="min-w-[400px] px-6 py-3 font-medium">
						Незаполненные поля
					</th>
				</tr>
			</thead>

			<tbody>
				{#each data.users as user}
					<tr class="bg-neutral-primary-soft border-default border-b">
						<td class="px-6 py-4 font-mono text-xs">
							{user.id}
						</td>

						<td class="px-6 py-4">
							{user.firstname}
						</td>

						<td class="px-6 py-4">
							{user.lastname}
						</td>

						<td class="px-6 py-4">
							{user.birthday}
						</td>

						<td class="px-6 py-4">
							{user.sex}
						</td>

						<td class="px-6 py-4 text-center">
							{user.math}
						</td>

						<td class="px-6 py-4 text-center">
							{user.stroop}
						</td>

						<td class="px-6 py-4 text-center">
							{user.munsterberg}
						</td>

						<td class="px-6 py-4 text-center">
							{user.memory}
						</td>

						<td class="px-6 py-4 text-center">
							{user.swallow}
						</td>

						<td class="px-6 py-4 text-center">
							{user.campimetry}
						</td>

						<td class="px-6 py-4 text-xs whitespace-pre-wrap">
							{user.missingFields || '—'}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</main>
<section class="low-content grid grid-cols-3">
	<div></div>
	<Button color="red" goto="/admin">Назад</Button>
	<div></div>
</section>
