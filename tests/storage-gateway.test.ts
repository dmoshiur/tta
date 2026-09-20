/**
 * Storage Gateway driver — exercised against an in-process mock that mirrors the
 * real "NGO File Cloud" Storage Bridge contract (dmoshiur/storage-gateway):
 *   • dual-token auth headers (X-AM-Storage-Key-Id / X-AM-Storage-Key-Secret)
 *   • POST /files multipart upload — PDF only (extension + MIME + magic bytes)
 *   • presigned init → PUT → complete flow for larger documents
 *   • GET /files/:id/download → short-lived signed URL
 *   • DELETE /files/:id → Trash
 *   • { success, data | error:{code,message}, requestId } envelopes
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';

// ── Mock gateway ────────────────────────────────────────────────────────────

const KEY_ID = 'ng_key_TESTKEYID0001';
const KEY_SECRET = 'ng_live_TESTSECRET_0123456789abcdefghijklmnopqrstuv';
const VERCEL_PAYLOAD_LIMIT = Math.floor(4.5 * 1024 * 1024);

interface MockFile {
  id: string;
  originalName: string;
  title: string;
  category: string;
  tags: string[];
  mimeType: string;
  size: number;
  status: 'uploading' | 'active' | 'trash';
  bytes: Buffer | null;
}

const files = new Map<string, MockFile>();
const calls: string[] = [];
const state = { rejectAuth: false, downloadCalls: 0, bearerAuths: 0, dualTokenAttempts: 0 };

function readBody(req: http.IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function json(res: http.ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json', 'X-Request-Id': crypto.randomUUID() });
  res.end(JSON.stringify(payload));
}
const okBody = (data: unknown) => ({ success: true, data, requestId: crypto.randomUUID() });
const errBody = (code: string, message: string) => ({ success: false, error: { code, message, requestId: crypto.randomUUID() } });

function serialize(file: MockFile) {
  return { id: file.id, originalName: file.originalName, title: file.title, category: file.category, tags: file.tags, mimeType: file.mimeType, size: file.size, status: file.status };
}

function isPdfName(name: string): boolean {
  return /\.pdf$/i.test(name);
}
function hasPdfSignature(bytes: Buffer): boolean {
  return bytes.subarray(0, 5).toString('latin1') === '%PDF-' && bytes.subarray(-64).toString('latin1').includes('%%EOF');
}

const mock = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://mock');
  const method = req.method ?? 'GET';
  calls.push(`${method} ${url.pathname}`);

  // Signed object URLs — no API auth, like a real blob store.
  if (url.pathname.startsWith('/blob/')) {
    const id = url.pathname.slice('/blob/'.length);
    const file = files.get(id);
    if (!file) return json(res, 404, errBody('NOT_FOUND', 'no such upload'));
    if (method === 'PUT') {
      file.bytes = await readBody(req);
      res.writeHead(200).end();
      return;
    }
    if (method === 'GET') {
      res.writeHead(200, { 'Content-Type': file.mimeType }).end(file.bytes ?? Buffer.alloc(0));
      return;
    }
  }

  if (!url.pathname.startsWith('/api/v1')) return json(res, 404, errBody('NOT_FOUND', 'unknown route'));
  const route = url.pathname.slice('/api/v1'.length) || '/';

  if (route === '/health') {
    return json(res, 200, { status: 'ok', service: 'NGO File Cloud', bridge: 'ready', mode: 'embedded', version: '2.0.0', auth: 'bearer|dual-token', blobConfigured: true });
  }

  // Authentication — mirrors the real bridge: ng_key_/ng_live_ keys are the
  // *bearer* family (Authorization: Bearer ng_live_…). X-AM-Storage-Key-* headers,
  // when present, take precedence and are validated against the bridge family —
  // so sending them with an ng_ key would be rejected exactly as it is here.
  if (req.headers['x-am-storage-key-id'] || req.headers['x-am-storage-key-secret'] || req.headers['x-am-storage-key']) {
    state.dualTokenAttempts += 1;
    return json(res, 401, errBody('INVALID_API_KEY', 'Missing or invalid API credential. Send X-AM-Storage-Key-Id with X-AM-Storage-Key-Secret.'));
  }
  const bearer = /^Bearer\s+(\S+)$/i.exec(String(req.headers.authorization ?? ''))?.[1];
  if (state.rejectAuth || bearer !== KEY_SECRET) {
    return json(res, 401, errBody('INVALID_API_KEY', 'Missing or invalid API key. Send Authorization: Bearer ng_live_….'));
  }
  state.bearerAuths += 1;

  // Direct multipart upload
  if (route === '/files' && method === 'POST') {
    const raw = await readBody(req);
    if (raw.length > VERCEL_PAYLOAD_LIMIT) {
      // Vercel rejects oversized payloads before application code runs — plain text, not JSON.
      res.writeHead(413, { 'Content-Type': 'text/plain' }).end('Request Entity Too Large');
      return;
    }
    const form = await new Response(new Uint8Array(raw), { headers: { 'content-type': String(req.headers['content-type']) } }).formData();
    const fileValue = form.get('file');
    if (!(fileValue instanceof File)) return json(res, 422, errBody('VALIDATION_ERROR', "The multipart form is missing the required 'file' field."));
    if (!isPdfName(fileValue.name)) return json(res, 400, errBody('INVALID_FILE_TYPE', 'Only PDF files can be uploaded.'));
    const mime = fileValue.type.split(';')[0].toLowerCase();
    if (mime && mime !== 'application/pdf' && mime !== 'application/octet-stream') return json(res, 400, errBody('INVALID_FILE_TYPE', 'Only application/pdf content is accepted.'));
    const bytes = Buffer.from(await fileValue.arrayBuffer());
    if (!hasPdfSignature(bytes)) return json(res, 400, errBody('INVALID_DOCUMENT', 'The file does not have a valid PDF header.'));
    const id = crypto.randomUUID();
    const tagsRaw = String(form.get('tags') ?? '');
    const file: MockFile = {
      id,
      originalName: fileValue.name,
      title: String(form.get('title') ?? ''),
      category: String(form.get('category') ?? ''),
      tags: tagsRaw.startsWith('[') ? JSON.parse(tagsRaw) : tagsRaw.split(',').filter(Boolean),
      mimeType: 'application/pdf',
      size: bytes.length,
      status: 'active',
      bytes,
    };
    files.set(id, file);
    return json(res, 201, okBody({ file: serialize(file), url: `http://127.0.0.1:${mockPort}/blob/${id}?sig=inline`, expiresAt: new Date(Date.now() + 3_600_000).toISOString(), filename: file.originalName, size: file.size }));
  }

  // Presigned flow
  if (route === '/storage/upload/init' && method === 'POST') {
    const body = JSON.parse((await readBody(req)).toString('utf8'));
    if (!isPdfName(String(body.originalName))) return json(res, 400, errBody('INVALID_FILE_TYPE', 'Only PDF files can be uploaded.'));
    if (!Number.isSafeInteger(body.size) || body.size <= 0) return json(res, 400, errBody('INVALID_FILE_SIZE', 'The PDF file size is invalid.'));
    const id = crypto.randomUUID();
    const file: MockFile = { id, originalName: body.originalName, title: body.title ?? '', category: body.category ?? '', tags: body.tags ?? [], mimeType: 'application/pdf', size: body.size, status: 'uploading', bytes: null };
    files.set(id, file);
    return json(res, 201, okBody({ file: serialize(file), uploadUrl: `http://127.0.0.1:${mockPort}/blob/${id}`, uploadMethod: 'PUT', uploadHeaders: { 'Content-Type': 'application/pdf' }, expiresAt: new Date(Date.now() + 600_000).toISOString() }));
  }
  if (route === '/storage/upload/complete' && method === 'POST') {
    const body = JSON.parse((await readBody(req)).toString('utf8'));
    const file = files.get(String(body.fileId));
    if (!file) return json(res, 404, errBody('FILE_NOT_FOUND', 'The requested file was not found.'));
    if (file.status === 'active') return json(res, 200, okBody({ file: serialize(file), url: `http://127.0.0.1:${mockPort}/blob/${file.id}`, expiresAt: new Date(Date.now() + 3_600_000).toISOString() }));
    if (!file.bytes || file.bytes.length !== file.size) return json(res, 400, errBody('UPLOAD_SIZE_MISMATCH', 'The uploaded PDF size could not be verified.'));
    if (!hasPdfSignature(file.bytes)) return json(res, 400, errBody('INVALID_DOCUMENT', 'The uploaded file is not a valid PDF.'));
    file.status = 'active';
    return json(res, 200, okBody({ file: serialize(file), url: `http://127.0.0.1:${mockPort}/blob/${file.id}`, expiresAt: new Date(Date.now() + 3_600_000).toISOString() }));
  }

  // Per-file routes
  const match = route.match(/^\/files\/([^/]+)(?:\/(download|restore))?$/);
  if (match) {
    const [, id, action] = match;
    const file = files.get(decodeURIComponent(id));
    if (action === 'download' && method === 'GET') {
      state.downloadCalls += 1;
      if (!file || file.status !== 'active') return json(res, 404, errBody('FILE_NOT_FOUND', 'The requested file was not found.'));
      return json(res, 200, okBody({ url: `http://127.0.0.1:${mockPort}/blob/${file.id}?sig=${crypto.randomBytes(8).toString('hex')}`, expiresAt: new Date(Date.now() + 3_600_000).toISOString(), filename: file.originalName, size: file.size, mimeType: file.mimeType }));
    }
    if (!action && method === 'DELETE') {
      if (!file) return json(res, 404, errBody('FILE_NOT_FOUND', 'The requested file was not found.'));
      file.status = 'trash';
      return json(res, 200, okBody({ file: serialize(file) }));
    }
    if (!action && method === 'GET') {
      if (!file || file.status !== 'active') return json(res, 404, errBody('FILE_NOT_FOUND', 'The requested file was not found.'));
      return json(res, 200, okBody({ file: serialize(file) }));
    }
  }

  return json(res, 404, errBody('UNKNOWN_BRIDGE_ROUTE', `No /api/v1 route matches '${url.pathname}'.`));
});

await new Promise<void>((resolve) => mock.listen(0, '127.0.0.1', resolve));
const mockPort = (mock.address() as any).port;

// ── Application under test (env must be set before the config module loads) ──

process.env.NODE_ENV = 'test';
process.env.ADMIN_EMAIL = 'admin@thinktankacademia.org';
process.env.ADMIN_PASSWORD = 'super-secure-admin-pass';
process.env.SUPER_ADMIN_EMAIL = 'super@thinktankacademia.org';
process.env.SUPER_ADMIN_PASSWORD = 'super-secure-admin-pass';
process.env.HACKER_ADMIN_DEV_PASSCODE = 'DEV-C0DE';
process.env.PUBLIC_URL = 'https://tta.example.org';
process.env.STORAGE_DRIVER = 'gateway';
process.env.STORAGE_GATEWAY_URL = `http://127.0.0.1:${mockPort}/api/v1/`; // trailing slash must be tolerated
process.env.STORAGE_GATEWAY_KEY_ID = KEY_ID;
process.env.STORAGE_GATEWAY_KEY_SECRET = KEY_SECRET;
process.env.MAX_UPLOAD_MB = '6';

const { start, stop } = await import('../backend/src/server.ts');
const { deleteUpload, checkGatewayHealth, gatewayAuthMode, GATEWAY_DIRECT_UPLOAD_MAX_BYTES } = await import('../backend/src/lib/storage.ts');
const { clearMediaLinkCache } = await import('../backend/src/routes/media.routes.ts');

const server = (await start(0)) as any;
const base = `http://127.0.0.1:${(server.address() as any).port}`;

test.after(async () => {
  await stop(server);
  await new Promise<void>((resolve) => mock.close(() => resolve()));
});

function pdf(bytes: number): Buffer {
  const head = Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n1 0 obj << /Type /Catalog >> endobj\n', 'latin1');
  const tail = Buffer.from('\ntrailer << /Root 1 0 R >>\nstartxref\n0\n%%EOF\n', 'latin1');
  const filler = Buffer.alloc(Math.max(0, bytes - head.length - tail.length), 0x20);
  return Buffer.concat([head, filler, tail]);
}

async function adminToken(): Promise<string> {
  const login = await fetch(base + '/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@thinktankacademia.org', password: 'super-secure-admin-pass' }),
  });
  assert.equal(login.status, 200);
  return ((await login.json()) as any).data.token;
}

async function uploadMedia(token: string, buffer: Buffer, name: string, type: string, folder = 'books') {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(buffer)], { type }), name);
  form.append('folder', folder);
  form.append('alt', name);
  return fetch(base + '/api/v1/admin/media/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
}

// ── Tests ───────────────────────────────────────────────────────────────────

test('gateway: health probe and platform meta', async () => {
  const health = await checkGatewayHealth();
  assert.equal(health.ok, true);
  assert.equal(health.service, 'NGO File Cloud');
  // ng_key_/ng_live_ credentials are the gateway's bearer family.
  assert.equal(gatewayAuthMode(), 'bearer');

  const meta = (await (await fetch(base + '/api/v1/meta')).json()) as any;
  assert.equal(meta.data.storage.driver, 'gateway');
  assert.equal(meta.data.storage.persistent, true);
});

test('gateway: non-PDF uploads fail with a clear, specific error (gateway is PDF-only)', async () => {
  const reg = await fetch(base + '/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Avatar User', email: 'avatar@example.com', password: 'StrongPassword123' }),
  });
  assert.equal(reg.status, 201);
  const token = ((await reg.json()) as any).data.token;

  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(png)], { type: 'image/png' }), 'me.png');
  const avatar = await fetch(base + '/api/v1/users/me/avatar', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
  assert.equal(avatar.status, 400);
  const body = (await avatar.json()) as any;
  assert.equal(body.success, false);
  assert.match(body.error.message, /PDF/i);
  assert.equal(body.error.details?.code, 'INVALID_FILE_TYPE');

  // A file that *claims* to be a PDF but is not one is caught by the gateway's byte sniffing.
  const admin = await adminToken();
  const fake = await uploadMedia(admin, Buffer.from('definitely not a pdf'), 'fake.pdf', 'application/pdf');
  assert.equal(fake.status, 400);
  assert.equal(((await fake.json()) as any).error.details?.code, 'INVALID_DOCUMENT');
});

test('gateway: PDF upload → permanent app URL → redirect to a signed link (cached)', async () => {
  const admin = await adminToken();
  const res = await uploadMedia(admin, pdf(20_000), 'Annual Report 2026.pdf', 'application/pdf', 'books');
  const payload = (await res.json()) as any;
  assert.equal(res.status, 201, JSON.stringify(payload));
  const data = payload.data;

  // Stored URL is this service's stable redirector, prefixed with PUBLIC_URL.
  assert.match(data.url, /^https:\/\/tta\.example\.org\/api\/v1\/media\/[0-9a-f-]{36}\/Annual-Report-2026\.pdf$/);
  assert.equal(data.original_name, 'Annual Report 2026.pdf');
  assert.equal(data.bytes, 20_000);

  // The gateway authenticated the call as a bearer key (never the X-AM bridge headers) and got the metadata.
  assert.ok(state.bearerAuths > 0);
  assert.equal(state.dualTokenAttempts, 0);
  const stored = [...files.values()].find((f) => f.originalName === 'Annual Report 2026.pdf')!;
  assert.ok(stored, 'gateway must have the document');
  assert.equal(stored.status, 'active');
  assert.equal(stored.category, 'books');
  assert.equal(stored.title, 'Annual Report 2026');
  assert.deepEqual(stored.tags, ['thinktank-academia', 'books']);

  // Redirector: first hit asks the gateway for a signed link, second is served from cache.
  const path = new URL(data.url).pathname;
  const before = state.downloadCalls;
  const first = await fetch(base + path, { redirect: 'manual' });
  assert.equal(first.status, 302);
  const location = first.headers.get('location')!;
  assert.match(location, new RegExp(`^http://127\\.0\\.0\\.1:${mockPort}/blob/${stored.id}\\?sig=`));
  assert.equal(first.headers.get('cache-control'), 'private, no-store');
  const second = await fetch(base + path, { redirect: 'manual' });
  assert.equal(second.status, 302);
  assert.equal(second.headers.get('location'), location);
  assert.equal(state.downloadCalls, before + 1, 'signed link must be cached');

  // Following the redirect yields the bytes.
  const followed = await fetch(base + path);
  assert.equal(followed.status, 200);
  assert.equal((await followed.arrayBuffer()).byteLength, 20_000);

  // Metadata endpoint and the id-only form of the URL.
  const meta = (await (await fetch(`${base}/api/v1/media/${stored.id}/meta`)).json()) as any;
  assert.equal(meta.data.filename, 'Annual Report 2026.pdf');
  assert.equal(meta.data.mimeType, 'application/pdf');
  assert.equal(meta.data.size, 20_000);
  const idOnly = await fetch(`${base}/api/v1/media/${stored.id}`, { redirect: 'manual' });
  assert.equal(idOnly.status, 302);

  // Unknown ids are a clean 404, not a gateway error leak.
  const missing = await fetch(`${base}/api/v1/media/${crypto.randomUUID()}`, { redirect: 'manual' });
  assert.equal(missing.status, 404);
  const bogus = await fetch(`${base}/api/v1/media/..%2F..%2Fetc`, { redirect: 'manual' });
  assert.equal(bogus.status, 404);
});

test('gateway: documents above the direct-upload limit use the presigned init → PUT → complete flow', async () => {
  const admin = await adminToken();
  const size = GATEWAY_DIRECT_UPLOAD_MAX_BYTES + 512 * 1024; // 4.5 MB — too big for a Vercel function payload
  calls.length = 0;
  const res = await uploadMedia(admin, pdf(size), 'Big Textbook.pdf', 'application/pdf', 'lessons');
  const payload = (await res.json()) as any;
  assert.equal(res.status, 201, JSON.stringify(payload));
  const data = payload.data;
  assert.equal(data.bytes, size);

  assert.ok(calls.includes('POST /api/v1/storage/upload/init'), 'must start with init');
  assert.ok(calls.some((c) => c.startsWith('PUT /blob/')), 'bytes must go straight to the object store');
  assert.ok(calls.includes('POST /api/v1/storage/upload/complete'), 'must finish with complete');
  assert.ok(!calls.includes('POST /api/v1/files'), 'must not attempt the direct route for large files');

  const stored = [...files.values()].find((f) => f.originalName === 'Big Textbook.pdf')!;
  assert.equal(stored.status, 'active');
  assert.equal(stored.bytes?.length, size);
  assert.equal(stored.category, 'lessons');
});

test('gateway: deleteUpload moves the document to Trash and the redirector stops serving it', async () => {
  const admin = await adminToken();
  const res = await uploadMedia(admin, pdf(4_096), 'Temporary.pdf', 'application/pdf');
  assert.equal(res.status, 201);
  const data = ((await res.json()) as any).data;
  const stored = [...files.values()].find((f) => f.originalName === 'Temporary.pdf')!;

  await deleteUpload(data.url, `gw:${stored.id}`);
  assert.equal(stored.status, 'trash');

  clearMediaLinkCache();
  const gone = await fetch(base + new URL(data.url).pathname, { redirect: 'manual' });
  assert.equal(gone.status, 404);

  // Legacy local keys are ignored by the gateway driver instead of hitting the gateway.
  calls.length = 0;
  await deleteUpload('/uploads/avatars/202609/x.png', 'avatars/202609/x.png');
  assert.equal(calls.length, 0);
});

test('gateway: revoked or wrong credentials surface as a configuration error, not a user error', async () => {
  const admin = await adminToken();
  state.rejectAuth = true;
  try {
    const res = await uploadMedia(admin, pdf(2_048), 'Doc.pdf', 'application/pdf');
    assert.equal(res.status, 502);
    const body = (await res.json()) as any;
    assert.equal(body.error.code, 'STORAGE_AUTH_FAILED');
    assert.match(body.error.message, /STORAGE_GATEWAY_KEY/);
  } finally {
    state.rejectAuth = false;
  }
});
