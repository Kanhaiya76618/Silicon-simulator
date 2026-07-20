FROM node:20-alpine
WORKDIR /app
COPY frontend ./frontend
WORKDIR /app/frontend
RUN npm install
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--port", "3000"]
