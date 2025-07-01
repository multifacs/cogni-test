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
RUN BUILD=node DATABASE_URL=file:/data/db.sqlite npm run build

# Указываем порт, который будем слушать (HTTPS)
EXPOSE 443

# Запускаем сервер
CMD ["node", "index.js"]
