import { createServer } from 'node:http';

const port = Number(process.env.PORT ?? 8080);
createServer((request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ status: 'ok', service: 'silicon-canvas-api' }));
    return;
  }
  response.writeHead(404).end('Not found');
}).listen(port, () => console.log(`Silicon Canvas API: http://localhost:${port}`));
