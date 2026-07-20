FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
RUN npm ci --workspace @silicon-canvas/backend --omit=dev
COPY backend ./backend
WORKDIR /app/backend
EXPOSE 8080
CMD ["node", "src/server.mjs"]
