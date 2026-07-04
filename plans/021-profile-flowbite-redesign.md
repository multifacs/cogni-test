# 021 — Profile Page Redesign with Flowbite Patterns

**Дата:** 2026-07-04
**Ветка:** test
**Статус:** ✅ Завершено (изменения в рабочем дереве, требуется ручной commit)

---

## Цель

Переписать страницу профиля (`src/routes/(app)/profile/`) с использованием UI-паттернов Flowbite, адаптированных под тёмную тему проекта (gray-800 фон, gray-100 текст). Демонстрация возможностей Flowbite MCP.

## Использованные возможности Flowbite MCP

### 1. Ресурсы (документация с примерами кода)
- `flowbite://components/tabs` — паттерн pills-табов с ARIA
- `flowbite://forms/select` — стилизованный select для тёмной темы
- `flowbite://components/cards` — карточка с навигацией по табам
- `flowbite://overview/file` — обзор возможностей сервера

### 2. Инструменты (доступны, но не использованы в этом демо)
- `generate-theme` — генерация кастомной CSS-темы по брендовому цвету
- `convert-figma-to-code` — конвертация Figma-дизайнов в HTML-код

---

## Проблемы ДО редизайна

| Компонент | Проблема |
|-----------|----------|
| **Tabs.svelte** | Уродливые «недопилюли», обрезанные лейблы на мобильных, нет ARIA |
| **Table.svelte** | `<table>` для формы (семантически неверно), плоский вид |
| **TableRow.svelte** | `text-blue-100` на тёмном фоне (нечитаемо), нестилизованные select'ы |
| **Autocomplete.svelte** | Svelte 4 (`$:`, `export let`), светло-голубой dropdown на тёмном фоне |
| **+page.svelte** | Плоская структура, нет визуальных групп |

---

## Изменённые файлы (5)

### 1. `src/routes/(app)/profile/components/Tabs.svelte`
- **Паттерн:** Flowbite "Pills tabs"
- `rounded-lg` пилюли: `bg-blue-600 text-white` для active, `bg-gray-700 hover:bg-gray-600 text-gray-300` для inactive
- Full-width на мобильных (`max-md:flex-1`), нормальные пилюли на desktop
- Всегда полный label + emoji (без обрезки)
- `role="tablist"` / `role="tab"` / `aria-selected` / `aria-controls` / `tabindex`
- `{#each tabs as tab (tab.id)}` — ключ для корректного DOM-обновления
- Обёртка: `bg-gray-900 border border-gray-700 rounded-lg shadow-lg`

### 2. `src/routes/(app)/profile/components/Table.svelte`
- `<table>` → `<div>` с `bg-gray-900 border border-gray-700 rounded-lg shadow-lg`
- Flex-колонка вместо таблицы

### 3. `src/routes/(app)/profile/components/TableRow.svelte`
- Каждая строка: `flex flex-col md:flex-row md:items-center gap-1 md:gap-4 p-3 border-b border-gray-700 last:border-b-0`
- Span-заголовки секций: `bg-gray-800/50 px-4 py-2 font-semibold text-gray-300 text-sm`
- Select: `bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 text-sm appearance-none focus:ring-blue-500 focus:border-blue-500`
- Валидация незаполненных: `border-amber-500` + focus ring amber вместо кастомного shadow
- Number input: те же dark-классы + `text-gray-400 text-xs` для label диапазона
- Custom-choice: тёмные inputs, remove button: `text-red-400 hover:text-red-300`
- Исправлены TS-ошибки: `rows` с null-checks, `ensureTrailingEmptyRow` возвращает корректный тип

### 4. `src/routes/(app)/profile/components/Autocomplete.svelte`
- Миграция на Svelte 5 runes: `$state`, `$derived`, `$bindable()`
- Добавлен `City` интерфейс (устранены TS-ошибки `Property 'id' does not exist on type 'object'`)
- Dark dropdown: `bg-gray-700 border border-gray-600 rounded-lg`
- Hover items: `hover:bg-gray-600`, текст `text-gray-100`
- Input: `bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400`
- `{#each filtered as city (city.id)}` — ключ для корректного DOM-обновления
- `handleFocusOut` вместо `onfocusout` с inline setTimeout

### 5. `src/routes/(app)/profile/+page.svelte`
- Таб-контент обёрнут в карточку (Tabs компонент уже имеет обёртку)
- Null-guard на `$profileSurveyStore` в `handleSave` и шаблоне
- `role="tabpanel"`, `aria-labelledby`, `id` на каждый таб-контент
- `toFormData`: тип `Record<string, any>` вместо неявного `any`
- Все `bind:value={$profileSurveyStore.xxx}` сохранены без изменений

---

## Что НЕ менялось

- Бизнес-логика: `handleSave`, `subscribe/unsubscribe`, `toFormData`
- Привязки к stores: все `bind:value={$profileSurveyStore.xxx}`
- Компоненты `Button`, `Spinner` из `$lib/components/ui/`
- `russia-cities.json`
- Глобальные стили в `app.css`

---

## Результаты ревью

### Блокирующие → Исправлены
- 🔴 `{#each}` без ключа в Tabs → добавлен `(tab.id)`
- 🔴 `{#each}` без ключа в Autocomplete → добавлен `(city.id)`

### Неблокирующие (принято для демо)
- 🟠 `class:` директивы вместо clsx-style — legacy, но работает
- 🟡 `class:hidden` вместо `{#if}` для таб-панелей — SSR-рендер всех панелей
- 🟡 `isSaving` как строка вместо union type — не ломает логику
- 🟡 Дублированное обновление `activeTab` (и через bind, и через callback)
- 🟡 `JSON.stringify` для сравнения массивов в TableRow
- 🟡 `queueMicrotask` для сброса `isInternalUpdate`
- 🟡 Мёртвый `value` state в Autocomplete
- 🟡 `console.log($user)` в корне компонента

### Верификация
- `npm run check` — 0 новых ошибок в profile-файлах (32 pre-existing ошибки в других файлах)
- Prettier — 5 profile файлов проходят форматирование
- ESLint — не запущен из-за pre-existing проблемы с `@eslint/compat`

---

## Статистика

- **736 добавлений, 665 удалений** в 5 файлах
- **0 новых зависимостей** (использованы только Tailwind CSS паттерны)
- **0 новых файлов**, **0 удалённых файлов**
