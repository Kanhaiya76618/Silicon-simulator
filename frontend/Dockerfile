FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/vcd-core/package.json ./packages/vcd-core/package.json
RUN npm ci
COPY frontend ./frontend
COPY packages/shared ./packages/shared
COPY packages/vcd-core ./packages/vcd-core
RUN npm --workspace @silicon-canvas/frontend run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
