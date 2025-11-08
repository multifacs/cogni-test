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
RUN npm run init-db
RUN npm run build

# Указываем порт, который будем слушать (HTTPS)
EXPOSE 443

# Запускаем сервер
CMD ["/bin/sh", "-c", "npm run init-db && npm run start"]
