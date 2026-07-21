FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/vcd-core/package.json ./packages/vcd-core/package.json
RUN npm ci
COPY frontend ./frontend
COPY packages/shared ./packages/shared
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm --workspace @silicon-canvas/frontend run build

FROM nginx:1.27-alpine

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html

EXPOSE 80
