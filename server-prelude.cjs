// Next.js 16 checks globalThis.AsyncLocalStorage at module load time.
// Node.js doesn't expose it there by default, so we patch it before Next.js loads.
const { AsyncLocalStorage } = require('node:async_hooks');
globalThis.AsyncLocalStorage = AsyncLocalStorage;
