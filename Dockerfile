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

ARG PUBLIC_VAPID_SUBJECT=mailto:kiwi0tails@gmail.com
ARG PUBLIC_VAPID_KEY=BD9jplqlYOmo4t59X3RFsFGnjZqbRRPWUjaNT15vDHYe0xujD6CKHw-09JyJB5FthVQEBI0HgjWc0TFJcX7Mzdg
ARG PRIVATE_VAPID_KEY=VJC7Hf2IipUGCbHNCLIR6T1elkQFB1cO_LzSCwMwfWU

# Собираем SvelteKit-приложение
RUN mkdir ./data
RUN touch ./data/cogni.db
RUN npm run init-db
RUN npm run build-prod
# RUN rm -rf ./data

# Указываем порт, который будем слушать (HTTPS)
EXPOSE 443

# Запускаем сервер
CMD ["/bin/sh", "-c", "npm run init-db && npm run start"]
