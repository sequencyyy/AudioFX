# Сборка приложения
FROM node:18-alpine AS builder

# Установите рабочую директорию
WORKDIR /app

# Копируйте package.json и package-lock.json
COPY package*.json ./

# Установите зависимости
RUN npm install

# Копируйте остальные файлы проекта
COPY . .

# Соберите проект в production-режиме
RUN npm run build

# Запуск приложения с помощью nginx
FROM nginx:alpine

# Удалите стандартный конфиг nginx
RUN rm /etc/nginx/conf.d/default.conf

# Скопируйте пользовательский конфиг nginx
COPY nginx.conf /etc/nginx/conf.d

# Скопируйте собранные файлы из первого этапа
COPY --from=builder /app/dist /usr/share/nginx/html

# Откройте порт 80 для nginx
EXPOSE 80

# Запустите nginx
CMD ["nginx", "-g", "daemon off;"]