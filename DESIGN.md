# Cogni Test — Design System: «Мягкое стекло»

> **Язык:** русский.  
> **Статус:** единственный источник правды для агентов, верстающих новые экраны. Все значения взяты из реальных файлов.

---

## 1. Философия системы

«Мягкое стекло» — комбинация:

1. **Градиентная сцена** — мягкий переход от холодного голубого к тёплому терракотовому.
2. **Размытые blob'ы** — `border-radius: 50%` + `filter: blur(80px)`; парят за контентом, не перехватывают события.
3. **Полупрозрачные карточки** — `rgba(255, 255, 255, 0.72)` с `backdrop-filter: blur(12px)`; при отсутствии поддержки blur → `#ffffff`.
4. **Воздух вокруг контента** — осознанный приём: `padding: 2rem 1.5rem`, `gap: 1.5rem`.
5. **Глубина через слои** — `фон → blob'ы (.glass-bg) → карточки (.glass-card) → контент`.

---

## 2. Токены (`:root` из `src/app.css`)

| Токен                    | Значение                                                                                                                                                                       | Назначение                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `--main-bg-color`        | `#e8f0fe`                                                                                                                                                                      | Плоский цвет (бывший фон body). Сейчас — только `color` в munsterberg `Playground`. |
| `--main-text-color`      | `#2c3e50`                                                                                                                                                                      | Главный цвет текста.                                                   |
| `--main-accent-color`    | `#d48c7a`                                                                                                                                                                      | **Брендовый терракотовый** — полоса карточки упражнения, blob.        |
| `--avatar-bg-color`      | `#d48c7a`                                                                                                                                                                      | **Фолбэк** фона аватара (в рантайме переопределяется динамикой).      |
| `--avatar-text-color`    | `#4a241a`                                                                                                                                                                      | **Фолбэк** текста аватара (см. §7).                                    |
| `--button-green`         | `#a8d5b9` / hover `#93c9a8` / текст `#123f23`                                                                                                                                 | **Единственный CTA-акцент** (основные действия).                       |
| `--button-red`           | `#f5b8ae` / hover `#efa79a` / текст `#6f2a1f`                                                                                                                                  | Деструктивное / второстепенное действие.                               |
| `--button-blue`          | `#b3d0f5` / hover `#9dbff1` / текст `#1f3d7a`                                                                                                                                  | Второстепенное действие («Отписаться»).                               |
| `--app-bg`               | `radial-gradient(ellipse 120% 80% at 20% 10%, rgba(100, 149, 237, 0.25), transparent 60%), radial-gradient(ellipse 100% 100% at 80% 90%, rgba(212, 140, 122, 0.2), transparent 55%), linear-gradient(180deg, #e8f0fe 0%, #dce8fb 100%)` | **Глобальный трёхслойный градиент** — фон `body` на всех страницах приложения. |
| `--font-weight-black`    | Tailwind v4                                                                                                                                                                    | `h1` (через `var(--font-weight-black)`).                              |
| `--font-weight-bold`     | Tailwind v4                                                                                                                                                                    | `Header`, `ExerciseCard`, `RecommendationCard`.                       |
| `--font-weight-medium`   | Tailwind v4                                                                                                                                                                    | `h2`, `h3`, `h4` по умолчанию.                                        |
| `--font-weight-semibold` | Tailwind v4                                                                                                                                                                    | `label`.                                                               |

> `--font-weight-*` не объявлены вручную в `:root`; Tailwind v4 декларирует эти кастомные свойства в своём `theme`, а глобальный `h2` в `app.css` наследует их (поэтому scoped-класс с явным `font-weight: 800` обязателен для главных заголовков).

### 2.1 Кнопочная палитра: пастель + тёмный текст в тон

**Принцип: светлая пастельная заливка + тёмный текст в том же тоне.** Не «светлая заливка + белый текст» — белый на пастели не даёт WCAG 4.5:1. Полный набор на цвет (заливка / hover / текст):

| Цвет   | Заливка   | Hover     | Текст    | Контраст |
| ------ | --------- | --------- | -------- | -------- |
| green  | `#a8d5b9` | `#93c9a8` | `#123f23` | 7.3:1    |
| red    | `#f5b8ae` | `#efa79a` | `#6f2a1f` | 6.1:1    |
| blue   | `#b3d0f5` | `#9dbff1` | `#1f3d7a` | 6.6:1    |

- Hover — та же заливка, чуть темнее: контраст при наведении **растёт**, не падает.
- Токены соответствуют гамме «Мята» (выбрана из трёх вариантов превью: Мята / Пудра / Графит).
- Остальные цвета `Button` (`gray`, `yellow`, `purple`, …) пока на Tailwind-классах с `text-white` — используются вне glass-экранов.

---

## 3. Общие CSS-классы (`src/app.css`)

### `.glass-scene`

```css
.glass-scene {
  position: relative;
  min-height: 100%;
  overflow: hidden;       /* НЕ auto — иначе вложенный скролл */
  /* фон не задан: прозрачен, глобальный градиент — на body (var(--app-bg)) */
}
```

- **Корневая обёртка** контента внутри `(app)/+layout.svelte`.
- Фон `body` (`var(--app-bg)`) задаётся глобально в `app.css` — `.glass-scene` его не перекрывает.
- Сам логин (`+page.svelte`) использует собственную `.login-wrapper`, не `.glass-scene`.
- Внутренние страницы добавляют локально:
    ```css
    .glass-scene {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      width: 100%;
    }
    ```

### `.glass-bg`

```css
.glass-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}
```

- Контейнер для blob'ов; первый ребёнок `.glass-scene`.
- **Обязательно:** `aria-hidden="true"`.

### `.glass-blob` + модификаторы

```css
.glass-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
  z-index: 0;
}

.glass-blob--top {
  width: 28rem;
  height: 28rem;
  top: -6rem;
  left: -8rem;
  background: rgba(144, 202, 249, 0.35);
}

.glass-blob--bottom {
  width: 24rem;
  height: 24rem;
  bottom: -6rem;
  right: -8rem;
  background: rgba(212, 140, 122, 0.25);
}
```

**Разметка (из `profile/+page.svelte`):**

```svelte
<div class="glass-scene">
  <div class="glass-bg" aria-hidden="true">
    <div class="glass-blob glass-blob--top"></div>
    <div class="glass-blob glass-blob--bottom"></div>
  </div>
  <!-- контент -->
</div>
```

### `.glass-card`

```css
.glass-card {
  position: relative;
  z-index: 1;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 1.5rem;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.04),
    0 8px 24px rgba(0, 0, 0, 0.08),
    0 24px 64px rgba(30, 60, 114, 0.12);
}

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .glass-card {
    background: #ffffff;
  }
}
```

- Паддинг **не задан глобально** — добавляйте локально (`padding: 1.5rem` для крупных, `1.25rem` для мелких).

### `.glass-ghost-btn`

```css
.glass-ghost-btn {
  background: transparent;
  color: #6b7280;
  border: none;
  cursor: pointer;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  font: inherit;
}

.glass-ghost-btn:hover {
  background: rgba(107, 114, 128, 0.1);
}
```

- Для второстепенных / завершающих действий (например, **«Выйти»**).
- Не для основных CTA — используй `<Button color="green">`.

---

## 4. Паттерны вёрстки

### 4.1 Fullscreen-страница (логин)

Файл: `src/routes/+page.svelte`.

```css
.login-wrapper {
  position: relative;
  overflow-y: auto;
  min-height: 100dvh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  /* фон не задан: прозрачен, глобальный градиент — на body (var(--app-bg)) */
}
```

- Это **единственный скролл-контейнер** на логине; у страницы нет layout с `.main`.
- Карточка `.login-card` дублирует `.glass-card` локально, `max-width: 28rem`.

### 4.2 Страница внутри `(app)`-layout

Файлы: `profile/+page.svelte`, `tests/+page.svelte`.

- **Единственный скролл-контейнер** — `.main` (из `(app)/+layout.svelte`):
    ```css
    .main {
      grid-area: main;
      padding: 4%;
      min-height: 0;
      overflow-x: hidden;
      overflow-y: auto;
      min-width: 0;
    }
    ```
- Внутри `.main` создаём `.glass-scene`, а внутри него — колонку контента.
- `.glass-scene` **должен иметь** `overflow: hidden` + `min-height: 100%`. **НЕ `overflow: auto`** — иначе вложенный скролл.

### 4.3 Колонка контента по центру

```css
.profile-content,
.tests-content {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 64rem;
  margin: 0 auto;
  padding: 2rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
```

- На мобильных (`max-width: 639px`): `padding: 1rem; gap: 1rem;`.

### 4.4 Grid-области layout

Файл: `src/routes/(app)/+layout.svelte`.

```css
.container {
  grid-template-areas:
    'banner'
    'main'
    'low-content'
    'nav';
}
.main { grid-area: main; }
.low-content { grid-area: low-content; }
```

- **DOM-иерархию grid-областей НЕ меняй**: `.low-content` — sibling после `<main>`, не вложенный элемент.
- `.low-content` оформляется локальными стилями страницы.

---

## 5. Типографика

- **Шрифт:** `Roboto`, sans-serif.
- **Глобальные размеры:**

| Элемент | Размер                            | font-weight               |
| ------- | --------------------------------- | ------------------------- |
| `h1`    | `clamp(1.5rem, 4vw, 2.5rem)`      | `--font-weight-black`     |
| `h2`    | `clamp(1rem, 3vw, 1.5rem)`        | `--font-weight-medium` ⚠️ |
| `h3`    | `clamp(0.75rem, 2vw, 1.125rem)`   | `--font-weight-medium`    |
| `label` | `clamp(0.75rem, 1.5vw, 0.875rem)` | `--font-weight-semibold`  |

> Важно: `h2` глобально — `medium`. Для главных заголовков (имя, CTA) задавай scoped-класс с `font-weight: 800`:
>
> ```css
> .profile-name { font-weight: 800; font-size: 1.75rem; }
> .cta-headline { font-weight: 800; }
> ```

**Иерархия метрик (профиль):**

```css
.metric-title  { font-size: 0.875rem; opacity: 0.8; }     /* label */
.metric-value  { font-size: 1.5rem;  font-weight: 700; } /* value */
.metric-caption{ font-size: 0.75rem;  color: #9ca3af; }   /* caption */
```

---

## 6. Цветовая дисциплина

| Роль              | Значение                                  | Где                                         |
| ----------------- | ----------------------------------------- | ------------------------------------------- |
| Бренд / акцент    | `#d48c7a` (`--main-accent-color`)         | Полоса `ExerciseCard`, тёплый blob.         |
| CTA-основной      | `#a8d5b9` + текст `#123f23`               | `<Button color="green">`                    |
| CTA-второстепенный| `#b3d0f5` + текст `#1f3d7a`                | `<Button color="blue">` («Отписаться»)      |
| CTA-деструктивный | `#f5b8ae` + текст `#6f2a1f`               | `<Button color="red">` («Выйти»)           |
| Ghost             | `transparent` + `#6b7280`                 | `.glass-ghost-btn`                          |
| Текст             | `#2c3e50` (`--main-text-color`)           | Везде                                       |
| Caption           | `#6b7280`, `#9ca3af`                      | Подписи «нет данных», хинты                 |
| Аватар            | динамический `hsl(H 45% 78%/22%)`         | см. §7                                      |

- **Антипример (удалён):** розовый `#FCE7F3` баннер на `/tests`.
- **Правило:** не добавляй новые цвета без обоснования. Пастельные кнопки с тёмным текстом — норма системы; тёмные насыщенные заливки с белым текстом (`rgb(15,132,15)`, `#bf3023`) — устаревший подход, не возвращаться к нему.

---

## 7. Avatar / Initials паттерн

Файл: `src/routes/(app)/profile/+page.svelte`.

### 7.1 Динамический пастельный цвет

Цвет аватара вычисляется из `u.id` — **детерминированно**: один и тот же юзер на любом устройстве и при любых перезагрузках видит один и тот же цвет.

```ts
function avatarStyle(id: string | number): string {
	let h = 0;
	for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
	const hue = h % 360;
	return `--avatar-bg-color: hsl(${hue} 45% 78%); --avatar-text-color: hsl(${hue} 45% 22%);`;
}
```

```svelte
<div style={avatarStyle(u.id)} class="... bg-(--avatar-bg-color) text-(--avatar-text-color) ...">
	{getInitials(u.firstname, u.lastname)}
</div>
```

- Фон — `hsl(hue 45% 78%)` (пастель), текст — `hsl(hue 45% 22%)` (тёмный в тон). Контраст ≥ 6.0:1 на любом оттенке (посчитано по WCAG для всех 360 hue).
- Насыщенность 45% / светлота 78% согласованы с пастельной кнопочной гаммой — аватар не спорит с системой, но остаётся индивидуальным.
- Токены `--avatar-bg-color` / `--avatar-text-color` в `app.css` — **статический фолбэк**; inline-переменные из `avatarStyle()` их переопределяют. Tailwind-классы `bg-(--avatar-bg-color)` / `text-(--avatar-text-color)` неизменны — меняются только значения переменных.
- **Не меняй формат** (насыщенность/светлоту) без пересчёта контраста.

### 7.2 Инициалы

```svelte
<div class="avatar">{getInitials(u.firstname, u.lastname)}</div>
```

**Guard на пустые поля:**

```ts
function getInitials(firstname?: string, lastname?: string): string {
	const f = firstname?.[0] ?? '';
	const l = lastname?.[0] ?? '';
	const initials = (f + l).trim();
	return initials ? initials.toUpperCase() : '?';
}
```

- Если имя/фамилия пустые — показывается **«?»**.
- На мобильных: `3.5rem / font-size: 1.25rem` (`max-sm:h-14 max-sm:w-14 max-sm:text-xl`).
- **Имена в БД хранятся в uppercase** и выводятся как есть (`displayName()`) — без пересборки регистра. Не добавляй `capitalize()`/`titleCase` в отображение имени.

---

## 8. Empty-state паттерн

### 8.1 Метрики: MetricTile с «—» + «нет данных»

Компонент: `src/routes/(app)/profile/components/MetricTile.svelte`. Пустым считается только `null` / `undefined` / `''` — `value={0}` валиден и отображается («Тренировок: 0»), не используй falsy-проверки.

```svelte
<!-- placeholder-плитки без value — задел под будущую статистику -->
<MetricTile title="Когн. возраст" value={...} />
<MetricTile title="Дата проверки" />
<MetricTile title="Тренировок" />
<MetricTile title="Серия" />
```

- «Когн. возраст» заполняется из серверного лоадера (`+page.server.ts` → `getFeaturesFromDB` → `runAgeModel`): «23 года» — округление + склонение `pluralAge()`.
- «Дата проверки» / «Тренировок» / «Серия» — **осознанные placeholder'ы**, не мёртвый UI; данные подключатся позже.
- Сетка: `grid-cols-4` → `2×2` на мобильных.

### 8.2 Отсутствие возраста: «??» + title

```svelte
<span title="Пройдите хотя бы один раз каждый тест">??</span>
```

- «??» используй только когда нет контейнера `.metric-tile` (например, блок `predictedAge` на `/tests`).

### 8.3 Возраст: склонение

```ts
function pluralAge(n: number): string {
	const n10 = n % 10;
	const n100 = n % 100;
	if (n10 === 1 && n100 !== 11) return 'год';
	if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return 'года';
	return 'лет';
}
```

- Всегда парой: `{n} {pluralAge(n)}` — «21 год», «22 года», «25 лет». Не хардкодь «лет».

---

## 9. Что НЕ трогать (Do-not-touch)

| Компонент / файл       | Почему                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------- |
| `Button.svelte`        | Единый компонент; используй `<Button color="green">` + классы.                     |
| `Card.svelte`          | Базовый компонент; glass-карточки — это `.glass-card`.                             |
| `(app)/+layout.svelte` | Grid-структура `.container`, `.main`, `NavBar`, `Header` — не менять DOM-иерархию. |
| `src/app.css`          | **Additive-only.** Новые классы/токены — OK; существующие селекторы — не трогать.  |

**Запрещено:** дублировать glass-стили локально без причины — используй глобальные классы.  
Локальное дублирование допустимо **только** когда готовый `.glass-card` не подходит (другой `border-radius`, позиционирование и т.д. — пример: `.low-content` на `/tests`, где радиус и позиция отличаются); при копировании значений — брать строго из `src/app.css`.

---

## 10. Чек-лист верификации нового / изменённого экрана

- [ ] Разрешения: 1440×900 (desktop) и 390×844 (mobile).
- [ ] Нет горизонтального overflow: `overflow-x: hidden` на `.main`.
- [ ] Нет вложенного скролла: скроллит только `.main`; `.glass-scene` — `overflow: hidden`.
- [ ] NavBar / grid-области не перекрыты: контент в `grid-area: main`.
- [ ] Главные заголовки — `font-weight: 800` (проверить `getComputedStyle`).
- [ ] Пустые состояния по паттерну (метрики — «—» + «нет данных», возраст — «??» + `title`).
- [ ] Blob'ы: `aria-hidden="true"`, `pointer-events: none`.
- [ ] Карточки: `.glass-card` с `@supports`-фоллбеком.
- [ ] Цвета только из токенов; нет случайных hex'ов.
- [ ] Кнопки red/green/blue: текст из `-text`-токенов (тёмный в тон), не `text-white`; контраст пары заливка/текст ≥ 4.5:1 (включая hover).
- [ ] Возраст: `{n} {pluralAge(n)}` — склонение «год/года/лет».
- [ ] Аватар: цвет через `avatarStyle(u.id)`; не хардкодить фон.

---

## Источники данных

| Раздел           | Файл                                        | Строки                             |
| ---------------- | ------------------------------------------- | ---------------------------------- |
| Токены (`:root`) | `src/app.css`                               | 3–38                               |
| Кнопочные токены | `src/app.css`                               | 10–19                              |
| Общие CSS-классы | `src/app.css`                               | 113–183                            |
| Fullscreen-логин | `src/routes/+page.svelte`                   | 39–141, 176–198                    |
| Профиль          | `src/routes/(app)/profile/+page.svelte`     | 95–199                             |
| Лоадер профиля   | `src/routes/(app)/profile/+page.server.ts`  | весь файл                          |
| MetricTile       | `src/routes/(app)/profile/components/MetricTile.svelte` | весь файл              |
| Tests            | `src/routes/(app)/tests/+page.svelte`       | 59–158                             |
| ExerciseCard     | `src/lib/components/ui/ExerciseCard.svelte` | 26–60                              |
| Layout структура | `src/routes/(app)/+layout.svelte`           | 110–177                            |
| Font-weight vars | `src/app.css` + Tailwind v4                 | 47–73; `grep` по `--font-weight-*` |
