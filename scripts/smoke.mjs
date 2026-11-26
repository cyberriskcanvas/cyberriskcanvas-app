#!/usr/bin/env node
// Smoke test of authenticated product routes and CI token enforcement.
//
//   BASE_URL=http://localhost:3000 ADMIN_EMAIL=... ADMIN_PASSWORD=... DATABASE_URL=... node scripts/smoke.mjs
//
// DATABASE_URL is used once, to put a project in the database so the editor and the reports page can be opened.
import pg from 'pg';

const base = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const email = process.env.ADMIN_EMAIL ?? 'smoke@example.com';
const password = process.env.ADMIN_PASSWORD ?? 'Smoke-test-1';

let failed = 0;
const check = (ok, what) => { console.warn(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failed++; };

const jar = new Map();
const keepCookies = (res) => { for (const c of res.headers.getSetCookie()) { const [kv] = c.split(';'); const i = kv.indexOf('='); jar.set(kv.slice(0, i), kv.slice(i + 1)); } };
const cookie = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
const get = async (path, { auth = true } = {}) => {
  const res = await fetch(base + path, { redirect: 'manual', headers: auth ? { cookie: cookie() } : {} });
  keepCookies(res);
  return res;
};

// ── anonymous ────────────────────────────────────────────────────────────────
check((await get('/login', { auth: false })).status === 200, 'GET /login is 200');
check((await get('/api/openapi.json', { auth: false })).status === 200, 'GET /api/openapi.json is 200');
const anon = (await get('/dashboard', { auth: false })).status;
check(anon === 307 || anon === 302, `GET /dashboard without a session redirects (${anon})`);
const proApi = (await get('/api/ci/gate', { auth: false })).status;
check(proApi === 401, `GET /api/ci/gate is 401 (needs a token) (${proApi})`);

// ── login ────────────────────────────────────────────────────────────────────
const csrf = await (await fetch(`${base}/api/auth/csrf`).then((r) => { keepCookies(r); return r; })).json();
const login = await fetch(`${base}/api/auth/callback/credentials`, {
  method: 'POST', redirect: 'manual',
  headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: cookie() },
  body: new URLSearchParams({ csrfToken: csrf.csrfToken, email, password, json: 'true' }),
});
keepCookies(login);
const session = await (await get('/api/auth/session')).json();
check(session?.user?.email === email, `login as ${email}`);
if (!session?.user?.id) { console.warn('no session: stopping'); process.exit(1); }

// ── a project, so the editor and the reports page have something to open ────
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
let diagramId = null;
if (process.env.DATABASE_URL) {
  await db.connect();
  const id = `smoke${Date.now()}`;
  await db.query('INSERT INTO projects (id, name, "ownerId", "updatedAt") VALUES ($1, $2, $3, now())', [id, 'Smoke product', session.user.id]);
  await db.query('INSERT INTO diagrams (id, "projectId", name, "updatedAt") VALUES ($1, $2, $3, now())', [`${id}d`, id, 'Smoke diagram']);
  await db.query('INSERT INTO project_versions (id, "projectId", number) VALUES ($1, $2, 1)', [`${id}v`, id]);
  await db.end();
  diagramId = `${id}d`;
}

// ── pages of a signed-in admin ───────────────────────────────────────────────
for (const path of ['/dashboard', '/organisation', '/settings', '/admin', ...(diagramId ? [`/diagram/${diagramId}`, `/diagram/${diagramId}/dashboard`] : [])]) {
  const res = await get(path);
  check(res.status === 200, `GET ${path} is 200 (${res.status})`);
}
const security = (await get('/security')).status;
check(security === 200, `GET /security is 200 (${security})`);

// ── project routes of the Pro part ──────────────────────────────────────────
if (diagramId) {
  const projectId = diagramId.slice(0, -1);
  const sbom = (await get(`/api/projects/${projectId}/vulnerabilities`)).status;
  check(sbom === 200, `GET /api/projects/…/vulnerabilities is 200 (${sbom})`);
}

console.warn(failed === 0 ? '\nsmoke test: all checks passed' : `\nsmoke test: ${failed} check(s) failed`);
process.exit(failed === 0 ? 0 : 1);
