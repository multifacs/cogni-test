# Используем официальный Node.js-образ
FROM node:lts-alpine AS builder

ARG PUBLIC_VAPID_SUBJECT
ARG PUBLIC_VAPID_KEY
ARG PRIVATE_VAPID_KEY
ARG MODE
ARG BUILD

# Для сборки
ENV PUBLIC_VAPID_SUBJECT=$PUBLIC_VAPID_SUBJECT
ENV PUBLIC_VAPID_KEY=$PUBLIC_VAPID_KEY
ENV PRIVATE_VAPID_KEY=$PRIVATE_VAPID_KEY
ENV MODE=$MODE
ENV BUILD=$BUILD

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

ARG PORT

# Объявляем для рантайма (можно переопределить при запуске)
ENV PUBLIC_VAPID_SUBJECT=""
ENV PUBLIC_VAPID_KEY=""
ENV PRIVATE_VAPID_KEY=""
ENV DATABASE_URL=""
ENV MODE=""
ENV PORT=""

# Указываем порт, который будем слушать (HTTPS)
EXPOSE $PORT

WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/index.js ./

# Запускаем сервер
CMD ["/bin/sh", "-c", "npm run init-db && npm run start"]
