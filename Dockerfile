# Используем официальный Node.js-образ
FROM node:20

# Задаём рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем остальные файлы проекта
COPY . .

# Собираем SvelteKit-приложение
RUN mkdir ./data
RUN touch ./data/cogni.db
RUN npx drizzle-kit push --force
RUN BUILD=node DATABASE_URL=file:./data/cogni.db npm run build
RUN rm -rf ./data

# Указываем порт, который будем слушать (HTTPS)
EXPOSE 443

# Запускаем сервер
CMD ["node", "index.js"]
