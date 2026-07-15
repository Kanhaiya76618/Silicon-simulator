import { createReadStream, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const root = new URL('.', import.meta.url).pathname;
const types = { '.css': 'text/css', '.js': 'text/javascript', '.html': 'text/html' };
createServer((request, response) => {
  const path = request.url === '/' ? '/index.html' : request.url.split('?')[0];
  const file = normalize(join(root, path));
  if (!file.startsWith(root) || !existsSync(file)) return response.writeHead(404).end('Not found');
  response.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(response);
}).listen(3000, () => console.log('Silicon Canvas web: http://localhost:3000'));
