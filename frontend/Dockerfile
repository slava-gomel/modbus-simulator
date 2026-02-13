FROM node:20-alpine AS base

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# Dev target для тестирования
FROM base AS dev
CMD ["npm", "test"]

# Build target для production
FROM base AS build
RUN npm run build

# Production target
FROM nginx:1.27-alpine AS production

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

