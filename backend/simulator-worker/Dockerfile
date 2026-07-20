FROM alpine:3.21

RUN apk add --no-cache iverilog nodejs \
  && adduser -D -h /app simulator

WORKDIR /app
COPY backend/simulator-worker/server.mjs ./server.mjs
RUN chown simulator:simulator /app

USER simulator
EXPOSE 8090
CMD ["node", "server.mjs"]
