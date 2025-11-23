<p>
	В этом тесте вы услышите короткий ритм — последовательность звуков, подобную мелодии на ксилофоне. Каждый
	звук сопровождается подъемом кружка на экране.
</p>

<p>
	Ваша задача — после прослушивания воспроизвести ритм, нажимая на поле с кружком в том же темпе. После
	завершения вы увидите сравнение оригинального ритма и вашего ответа на временной шкале.
</p>

<p>Тест помогает оценить слуховое внимание, ритмическую память, скорость реакции и моторную координацию.</p>

<div class="flex w-full flex-col items-center gap-2">
	<button class="playfield" aria-label="Игровое поле">
		<div class="track relative flex h-full w-full flex-col items-center justify-center">
			<div class="h-full w-10/12 pb-3">
				<div class="ball user"></div>
			</div>

			<div class="first:bg-red flex w-10/12 items-end justify-between pb-2">
				<!-- Станции -->
				<div class="stop-marker"></div>
				{#each Array(4) as _, i}
					<div class="go-marker"></div>
				{/each}
				<div class="stop-marker"></div>
			</div>
		</div>
	</button>
	<p>Нужно будет нажимать <kbd>пробел</kbd> или кликать</p>
    <p>Кликать можно в любую точку в пределах игрового поля</p>
</div>

<style>
	.stop-marker {
		width: 10px;
		height: 10px;
		background-color: #e2e2e2;
		border-radius: 50%;
	}
	.go-marker {
		width: 10px;
		height: 10px;
		background-color: #bbb;
		border-radius: 50%;
	}

	.jump {
		transform: translateY(-35px);
	}
	.playfield {
		margin: 2rem auto;
		width: 80%;
		height: 100px;
		position: relative;
		border-radius: 10px;
		background: #f8f8f8;
		cursor: pointer;
	}
	.ball {
		position: relative;
		top: 40px;
		left: calc(-20px + 5px + 49px * 0);
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: gray;
		transition:
			transform 0.2s ease,
			left 0.2s linear;
	}
	.ball.user {
		background: #60a5fa;
	}
</style>
