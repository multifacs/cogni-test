# Follow-up: Сессии ГТО-М

Дата: 2026-07-04
Ветка: gto

## Приоритет: Высокий

### 1. Обернуть `createGtoSession` в `db.transaction()`
- **Файл:** `src/lib/server/db/controllers/gto.ts`
- **Проблема:** Создание сессии выполняет 3+ INSERT последовательно. Если INSERT участников прошёл, а слов упал — сессия останется без слов.
- **Решение:** Обернуть всю операцию в `await db.transaction(async (tx) => { ... })`, использовать `tx` вместо `db` для всех запросов внутри.

### 2. Вынести `play/+server.ts` из `words/+server.ts`
- **Файл:** `src/routes/(app)/gto/session/[id]/words/+server.ts`
- **Проблема:** Один endpoint обрабатывает 3 разных действия (save-result, complete, submit-words). Нарушение SRP, запутанная маршрутизация.
- **Решение:** Создать `src/routes/(app)/gto/session/[id]/play/+server.ts` с обработкой `save-result` и `complete`. В `words/+server.ts` оставить только submit-words. Обновить fetch URL в `play/+page.svelte`.

### 3. Добавить авторизацию в `words/+server.ts`
- **Файл:** `src/routes/(app)/gto/session/[id]/words/+server.ts`
- **Проблема:** POST endpoint не проверяет, что пользователь является участником данной сессии. Любой авторизованный пользователь может отправить слова за другого.
- **Решение:** Перед обработкой action проверить участие через `getGtoSessionById` + найти participant по userId.

## Приоритет: Средний

### 4. Добавить `await` и обработку ошибок в inline fetch
- **Файл:** `src/routes/(app)/admin/gto/[id]/+page.svelte`
- **Проблема:** Кнопка сохранения метрик отправляет fetch без await, без проверки response.ok. Потеря данных при быстром переходе.
- **Решение:** Добавить `await`, индикацию загрузки, проверку `response.ok`, toast/уведомление об ошибке.

### 5. Обработать ошибки в `handleRename` / `handleComplete`
- **Файл:** `src/routes/(app)/admin/gto/[id]/+page.svelte`
- **Проблема:** После fetch нет проверки `response.ok` — ошибки молча игнорируются.
- **Решение:** Проверить `response.ok`, показать уведомление об ошибке если не 2xx.

### 6. N+1 запросы в `getGtoSessionMetrics`
- **Файл:** `src/lib/server/db/controllers/gto.ts`
- **Проблема:** Для каждого участника выполняются отдельные запросы к profileSurvey, session, и 6 таблицам попыток. При 20 участниках — 140+ запросов.
- **Решение:** Загрузить все данные батчами: 1 запрос на всех участников, 1 на все survey, 1 на все test sessions, и т.д. Сгруппировать попытки по sessionId в памяти.

### 7. `updateEditableMetrics` не проверяет существование записи
- **Файл:** `src/lib/server/db/controllers/gto.ts`
- **Проблема:** `db.update(...).where(...)` молча пропускает обновление, если participantId не найден.
- **Решение:** Проверить `rowsAffected` после update, выбросить Error если 0.

## Приоритет: Низкий

### 8. Заменить `alert()` на toast-уведомление
- **Файл:** `src/routes/(app)/gto/session/[id]/words/+page.svelte`
- **Проблема:** Нативный `alert()` для ошибки — плохой UX, может быть заблокирован браузером.
- **Решение:** Использовать кастомный toast/snackbar компонент.

### 9. Keyed `{#each}` в таблицах
- **Файл:** `src/routes/(app)/admin/gto/+page.svelte`, `src/routes/(app)/admin/gto/[id]/+page.svelte`
- **Проблема:** `{#each data.users as u}` без key — Svelte не оптимально обновляет DOM.
- **Решение:** Добавить `(u.id)` как key: `{#each data.users as u (u.id)}`

### 10. Вынести `TEST_ORDER` в общий модуль
- **Файлы:** `src/routes/(app)/gto/session/[id]/play/+page.server.ts`, `src/routes/(app)/gto/session/[id]/play/+page.svelte`
- **Проблема:** Дублирование массива порядка тестов.
- **Решение:** Вынести в `src/lib/tests/index.ts` или отдельный константы-файл.

### 11. Улучшить инструкции перед каждым тестом
- **Файл:** `src/routes/(app)/gto/session/[id]/play/+page.svelte`
- **Проблема:** Текущие инструкции минимальны — только название теста и кнопка "Начать". По требованиям: «сначала идёт инструкция, а далее тело теста».
- **Решение:** Загружать и показывать About-компонент каждого теста (из testRegistry) как инструкцию перед началом.

### 12. Добавить checkpoint при прерывании тестирования
- **Файл:** `src/routes/(app)/gto/session/[id]/play/+page.svelte`
- **Проблема:** Если пользователь закрыл вкладку, при возврате начнёт с 0-го теста (currentTestIndex не обновляется в БД при переходе между тестами).
- **Решение:** После каждого теста обновлять `gto_session.currentTestIndex` через API. При загрузке страницы читать currentTestIndex из сессии.
