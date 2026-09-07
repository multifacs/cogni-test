# Используем официальный Node.js-образ
FROM node:current-slim AS builder

ARG MODE=DEV

ENV CI=true
ENV MODE=$MODE
ENV DATABASE_URL=:memory:

# Задаём рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем остальные файлы проекта
COPY . .

# Собираем SvelteKit-приложение
RUN npx drizzle-kit generate
RUN npm run build
RUN rm -rf node_modules/onnxruntime-node/bin/napi-v6/darwin \
           node_modules/onnxruntime-node/bin/napi-v6/win32 \
           node_modules/onnxruntime-node/bin/napi-v6/linux/arm64

# Удаляем devDependencies после сборки
RUN npm prune --omit=dev

FROM node:current-slim AS runner

ENV CI=true

WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/src/lib ./src/lib
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/index.js ./

EXPOSE 80

# Запускаем сервер
CMD ["sh", "-c", "node index.js"]
