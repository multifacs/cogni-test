FROM nginx:alpine

# Копируем конфиги
COPY nginx.conf /etc/nginx/nginx.conf
COPY sites/cogni.conf /etc/nginx/sites/cogni.conf

# Создаем папку для статики
RUN mkdir -p /var/www/static

# Экспозим порт
EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]