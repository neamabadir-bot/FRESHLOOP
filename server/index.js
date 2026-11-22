// Starts the FRESHLOOP server. In production it also serves the built React app from /dist.
import express from 'express';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { openDb } from './db.js';
import { createApp } from './app.js';

// A --port=NNNN argument (used by `npm run dev`) wins over the PORT environment variable.
const portArg = process.argv.find((a) => a.startsWith('--port='));
const PORT = Number(portArg?.split('=')[1]) || Number(process.env.PORT) || 3001;
const db = openDb();
const app = createApp(db);

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile(join(dist, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`FRESHLOOP server running on http://localhost:${PORT}`);
});
