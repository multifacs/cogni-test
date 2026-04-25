# Используем официальный Node.js-образ
FROM node:lts-alpine AS builder

ARG MODE=DEV

# Для сборки
ENV MODE=$MODE

ENV CI=true

# Задаём рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем остальные файлы проекта
COPY . .

# Собираем SvelteKit-приложение
RUN npm run build

FROM node:lts-alpine AS runner

# Объявляем для рантайма (можно переопределить при запуске)
ENV CI=true

WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/src/lib ./src/lib
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/index.js ./

# Запускаем сервер
CMD ["/bin/sh", "-c", "npm i --omit=dev && npx drizzle-kit push --force && node index.js"]
