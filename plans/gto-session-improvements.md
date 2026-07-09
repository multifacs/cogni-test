# План улучшений: Сессии ГТО-М

Дата: 2026-07-05
Ветка: gto

## Выполнено в этой сессии

- ✅ currentTestIndex перенесён с gtoSession на gtoSessionParticipant (независимый прогресс)
- ✅ Прогресс тестирования на главной /gto (кнопка «Продолжить», модалка с прогрессом)
- ✅ Кнопка генерации случайных слов при создании сессии
- ✅ Фикс 405 на PATCH ?/updateMetrics и ?/complete (FormData вместо JSON)
- ✅ Удалена колонка currentTestIndex из gtoSession

---

## Оставшиеся задачи

### 1. Приостановка сессии (pause)

**Приоритет:** Высокий

**Проблема:** Нет возможности поставить сессию на паузу. Если нужно временно запретить прохождение тестов, единственный вариант — завершить сессию, что необратимо.

**Решение:**
- Добавить статус `paused` в `gtoSession` (enum check: `['active', 'paused', 'completed']`)
- В админке: кнопка «Приостановить» / «Возобновить» вместо только «Завершить»
- На странице `/gto`: если сессия на паузе, показывать «Сессия приостановлена» вместо кнопки «Начать/Продолжить»
- На странице `play/+page.server.ts`: если сессия `paused`, редирект на `/gto` с сообщением
- Контроллер: добавить `pauseGtoSession(id)` / `resumeGtoSession(id)`

**Файлы:**
- `src/lib/server/db/models/gto.ts` — статус `paused` в enum check
- `src/lib/server/db/controllers/gto.ts` — функции pause/resume + обновить `getActiveGtoSessionsForUser` (фильтр по active + paused)
- `src/routes/(app)/admin/gto/[id]/+page.server.ts` — action pause/resume
- `src/routes/(app)/admin/gto/[id]/+page.svelte` — кнопка паузы
- `src/routes/(app)/gto/+page.svelte` — отображение «На паузе»
- `src/routes/(app)/gto/session/[id]/play/+page.server.ts` — блокировка при paused

---

### 2. Рестарт текущего теста при повторном входе

**Приоритет:** Высокий

**Проблема:** Если пользователь закрыл страницу во время прохождения теста, при возвращении `currentTestIndex` показывает тот же тест, но состояние теста (прогресс внутри теста) теряется.

**Решение:**
- Текущая логика уже корректна: при входе показывается фаза `instructions`, пользователь нажимает «Начать» — это и есть рестарт
- Опционально: добавить текст «Вы вышли из теста. Начните заново» при `currentTestIndex > 0`

**Файлы:**
- `src/routes/(app)/gto/session/[id]/play/+page.svelte` — опциональный текст

---

### 3. Таблица пользователей с поиском и фильтром «Недавно вошедшие»

**Приоритет:** Высокий

**Проблема:** При создании ГТО-сессии таблица пользователей — обычный HTML без поиска, без фильтрации.

**Решение:**
- Использовать Flowbite MCP для получения компонента таблицы
- Добавить текстовое поле поиска вверху таблицы — одно поле, ищет по всем параметрам (имя, фамилия, ID, ГТО-М ID, пол, незаполненные поля)
- Добавить чекбокс/кнопку «Недавно вошедшие» — фильтр по `lastLoginAt` (см. задачу 4)
- Поиск и фильтрация на клиенте

**Файлы:**
- `src/routes/(app)/admin/gto/+page.svelte` — поиск + фильтр + таблица

---

### 4. Добавить lastActiveAt в user

**Приоритет:** Средний (блокирует задачу 3)

**Проблема:** В таблице `user` нет поля последней активности — только `createdAt`. Невозможно отфильтровать пользователей, которые недавно заходили на сайт.

**Требование:** Фиксировать не логин, а любое открытие сайта залогиненным пользователем. Запрос должен отправляться один раз при открытии/перезагрузке сайта, а не при каждой навигации между роутами.

**Решение:**

#### 4a. Схема
- Добавить в `user`: `lastActiveAt: text('last_active_at')` (nullable, по умолчанию null)
- Имя `lastActiveAt` (не `lastLoginAt`) — потому что фиксируем активность, а не конкретно логин

#### 4b. API-эндпоинт `POST /api/ping`
- Новый файл `src/routes/api/ping/+server.ts`
- Проверяет `user_id` cookie — если есть, обновляет `lastActiveAt` в БД
- **Rate-limit:** не обновлять если `lastActiveAt` был установлен менее 5 минут назад (читаем текущее значение, сравниваем). Это предотвращает спам при частых перезагрузках
- Возвращает `{ success: true }` — минимум данных, быстрый ответ
- Если `user_id` нет — возвращает 401

#### 4c. Клиентская часть
- В `src/routes/(app)/+layout.svelte` — в существующем `onMount` добавить:
  ```ts
  fetch('/api/ping', { method: 'POST' }).catch(() => {});
  ```
- `onMount` в корневом layout вызывается **один раз** при открытии/перезагрузке сайта, а не при навигации между роутами — это именно то что нужно
- `catch(() => {})` — ошибка пинга не должна ломать пользовательский опыт

#### 4d. Интеграция с админкой
- Добавить `lastActiveAt` в тип `AuthorizedUser` и в `getAuthorizedUsers`
- В таблице пользователей на `/admin/gto` показывать «Последняя активность»
- Фильтр «Недавно вошедшие» — участники с `lastActiveAt` за последние N дней

**Почему не обновлять в layout load:**
`+layout.server.ts` в `(app)` выполняется при **каждой** серверной навигации между роутами. Если обновлять `lastActiveAt` прямо в load, будет WRITE в БД на каждый клик. API-эндпоинт + `onMount` гарантируют один запрос за сессию.

**Файлы:**
- `src/lib/server/db/schema.ts` — добавить lastActiveAt в user
- `src/routes/api/ping/+server.ts` — новый эндпоинт (создать)
- `src/routes/(app)/+layout.svelte` — добавить fetch('/api/ping') в onMount
- `src/lib/server/db/controllers/gto.ts` — добавить lastActiveAt в AuthorizedUser + getAuthorizedUsers

---

### 5. ГТО-М ID и E-mail в профиле

**Приоритет:** Высокий

**Проблема:** В анкете пользователя (вкладка «Основное» на /profile) нет полей для ГТО-М ID и E-mail. Эти данные нужны для идентификации участников в исследованиях.

**Решение:**
- Добавить в `profileSurvey` таблицу:
  - `gtoId: text('gto_id')` — строковый ГТО-М идентификатор участника
  - `email: text('email')` — email участника
- Добавить поля на вкладку «Основное» в `/profile`
- Сохранять через существующий механизм `updateProfileSurvey`
- Добавить `gtoId` и `email` в `SURVEY_FIELDS` в gto.ts (чтобы они попадали в missingSurveyFields)
- В админке `/admin/gto` показывать ГТО-М ID в таблице участников

**Файлы:**
- `src/lib/server/db/models/survey.ts` — добавить gtoId и email
- `src/routes/(app)/profile/+page.svelte` — поля ввода на вкладке «Основное»
- `src/lib/server/db/controllers/gto.ts` — добавить gtoId в SURVEY_FIELDS, AuthorizedUser, getAuthorizedUsers
- `src/routes/(app)/admin/gto/+page.svelte` — колонка ГТО-М ID
- `src/routes/(app)/admin/gto/[id]/+page.svelte` — колонка ГТО-М ID в таблице метрик

---

### 6. Перечисление незаполненных полей вместо счётчика

**Приоритет:** Средний

**Проблема:** В таблице участников в админке колонка «Незап.» показывает только число (например «5 полей»), но не говорит, какие именно поля не заполнены.

**Решение:**
- Заменить числовой счётчик на список названий незаполненных полей
- Показывать как tooltip при наведении или как компактный список
- Названия полей должны быть на русском (маппинг английских ключей → русские названия)
- Маппинг: birthCity → «Город рождения», currentCityType → «Тип населённого пункта», education → «Образование», и т.д.

**Файлы:**
- `src/routes/(app)/admin/gto/+page.svelte` — tooltip/список незаполненных полей
- `src/routes/(app)/admin/gto/[id]/+page.svelte` — то же в таблице метрик
- `src/lib/server/db/controllers/gto.ts` — опционально: вернуть человекочитаемые названия вместо ключей

---

### 7. Сеты слов (Word Sets)

**Приоритет:** Высокий

**Проблема:** Сейчас слова задаются один раз при создании сессии и одинаковый набор показывается всем участникам. Нужна возможность:
- Создавать/генерировать множество наборов слов (сетов) с уникальными номерами
- Назначать каждому участнику свой сет слов
- Проверять ответы участника по его конкретному сету

**Решение:**

#### 7a. Новая таблица `gto_word_set`
- `id: text` (PK)
- `setNumber: integer('set_number').notNull()` — номер сета (1, 2, 3...)
- `word1: text('word1').notNull()`
- `word2: text('word2').notNull()`
- `word3: text('word3').notNull()`
- `word4: text('word4').notNull()`
- `word5: text('word5').notNull()`
- `createdAt: text`

#### 7b. Админка: страница управления сетами слов
- Новый маршрут `/admin/gto/word-sets` (или секция на `/admin/gto`)
- Таблица существующих сетов (номер, слова, дата создания)
- Кнопка «Сгенерировать сеты» — генерирует N сетов (по 5 случайных слов из `/words`)
- Кнопка «Добавить вручную» — ввести слова вручную
- Удаление сетов

#### 7c. Назначение сета участнику
- В `gtoSessionParticipant` добавить `wordSetId: text('word_set_id').references(() => gtoWordSet.id)` (nullable)
- На странице сессии в админке — колонка «Сет слов» с dropdown для выбора номера сета
- При изменении сета — PATCH-запрос на сервер

#### 7d. Логика проверки слов
- Если участнику задан `wordSetId` (сет назначен ДО прохождения):
  - Страница `/words` получает слова из его сета
  - При отправке — проверка правильности, подсчёт `wordScore`
- Если участнику НЕ задан `wordSetId` (сет ещё не назначен):
  - Страница `/words` принимает любое количество слов (без проверки)
  - Ответы сохраняются в новую таблицу `gto_word_response`:
    - `id: text` (PK)
    - `participantId: text` (FK → gtoSessionParticipant)
    - `position: integer` — порядковый номер слова
    - `word: text` — введённое слово
  - `hasSubmittedWords` устанавливается в true
  - Когда админ назначает сет — запускается проверка: сравниваются сохранённые ответы с сетом, вычисляется `wordScore`

**Файлы:**
- `src/lib/server/db/models/gto.ts` — таблицы gtoWordSet, gtoWordResponse; колонка wordSetId в participant
- `src/lib/server/db/controllers/gto.ts` — CRUD для сетов, назначение сета, проверка ответов
- `src/routes/(app)/admin/gto/+page.svelte` или новый маршрут — управление сетами
- `src/routes/(app)/admin/gto/[id]/+page.svelte` — колонка «Сет слов» с dropdown
- `src/routes/(app)/gto/session/[id]/words/+page.server.ts` — выбор источника слов (сет или свободный ввод)
- `src/routes/(app)/gto/session/[id]/words/+page.svelte` — UI адаптация
- `src/routes/(app)/gto/session/[id]/words/+server.ts` — логика проверки или сохранения

---

### 8. Недостающие колонки в админке сессии

**Приоритет:** Средний

**Проблема:** В БД `gtoEditableMetric` есть `mazeVRFileName` и `buttonTestFileName`, но в UI админки нет полей для их ввода. Также не хватает колонок «Логика» и «Сет последовательности слов».

**Решение:**
- Добавить поля для `mazeVRFileName` и `buttonTestFileName` в таблицу метрик (они уже есть в модели, но нет input в UI)
- Добавить колонку «Логика» (`logic`) в `gtoEditableMetric` — integer, допустимые значения 0 и 1
- Добавить колонку «Сет посл. слов» (`wordSetNumber`) в `gtoEditableMetric` — integer, любое число (номер сета слов)
- Добавить соответствующие input-ы в таблицу админки

**Файлы:**
- `src/lib/server/db/models/gto.ts` — добавить logic и wordSetNumber в gtoEditableMetric
- `src/routes/(app)/admin/gto/[id]/+page.svelte` — input для mazeVRFileName, buttonTestFileName, logic, wordSetNumber

---

### 9. Фикс 405 на ?/updateMetrics и ?/complete

**Статус:** ✅ Выполнено

PATCH handler в `+server.ts` теперь парсит FormData вместо JSON. Фронтенд отправляет `action` в FormData и использует `fetch('', { method: 'PATCH' })`.
