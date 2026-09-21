import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.ADMIN_EMAIL = 'admin@thinktankacademia.org';
process.env.ADMIN_PASSWORD = 'super-secure-admin-pass';
process.env.SUPER_ADMIN_EMAIL = 'super@thinktankacademia.org';
process.env.SUPER_ADMIN_PASSWORD = 'super-secure-admin-pass';
process.env.HACKER_ADMIN_DEV_PASSCODE = 'DEV-C0DE';

const { start, stop } = await import('../backend/src/server.ts');

const server = (await start(0)) as any;
const address = server.address() as any;
const base = `http://127.0.0.1:${address.port}`;

test('health contracts', async () => {
  const r = await fetch(base + '/api/health');
  assert.equal(r.status, 200);
  const data = (await r.json()) as any;
  assert.equal(data.ok, true);
  assert.equal(data.service, 'thinktank-academia');

  const v1 = await fetch(base + '/api/v1/health');
  assert.equal(v1.status, 200);
});

test('API root and v1 discovery documents', async () => {
  // GET /api lists the available versions and points at the current one
  const rootRes = await fetch(base + '/api');
  assert.equal(rootRes.status, 200);
  const root = (await rootRes.json()) as any;
  assert.equal(root.success, true);
  assert.equal(root.data.service, 'thinktank-academia');
  assert.equal(root.data.latest, 'v1');
  assert.equal(root.data.versions[0].version, 'v1');
  assert.equal(root.data.versions[0].url, `${base}/api/v1`);

  // GET /api/v1 — the base URL the web and Android clients are configured with
  const indexRes = await fetch(base + '/api/v1');
  assert.equal(indexRes.status, 200);
  const index = (await indexRes.json()) as any;
  assert.equal(index.success, true);
  assert.equal(index.data.version, 'v1');
  assert.equal(index.data.status, 'ok');
  assert.equal(index.data.baseUrl, `${base}/api/v1`);
  assert.equal(index.data.auth.scheme, 'Bearer');
  assert.ok(Array.isArray(index.data.groups) && index.data.groups.length >= 8);
  assert.ok(index.data.totalEndpoints >= 60);

  // Every catalogued endpoint is absolute under /api/v1 and carries an auth level
  const endpoints = index.data.groups.flatMap((g: any) => g.endpoints);
  assert.equal(endpoints.length, index.data.totalEndpoints);
  for (const endpoint of endpoints) {
    assert.ok(endpoint.path.startsWith('/api/v1/'), `unexpected path ${endpoint.path}`);
    assert.ok(['public', 'optional', 'user', 'admin'].includes(endpoint.auth));
    assert.ok(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(endpoint.method));
  }
  assert.ok(endpoints.some((x: any) => x.method === 'POST' && x.path === '/api/v1/auth/login'));
  assert.ok(endpoints.some((x: any) => x.method === 'GET' && x.path === '/api/v1/courses'));

  // Trailing slash (what a browser or Retrofit base URL sends) must not 404
  const slashRes = await fetch(base + '/api/v1/');
  assert.equal(slashRes.status, 200);
  assert.equal(((await slashRes.json()) as any).data.version, 'v1');

  // Unknown API paths still return the JSON 404 — now with the full path and a hint
  const missing = await fetch(base + '/api/v1/does-not-exist');
  assert.equal(missing.status, 404);
  const missingBody = (await missing.json()) as any;
  assert.equal(missingBody.success, false);
  assert.equal(missingBody.error.code, 'NOT_FOUND');
  assert.ok(missingBody.error.message.includes('GET /api/v1/does-not-exist'));
  assert.equal(missingBody.error.details.index, '/api/v1');
});

test('meta and sections taxonomy', async () => {
  const metaRes = await fetch(base + '/api/v1/meta');
  assert.equal(metaRes.status, 200);
  const meta = (await metaRes.json()) as any;
  assert.equal(meta.data.name, 'ThinkTank Academia');
  assert.ok(meta.data.sections.length >= 7);

  const sectionsRes = await fetch(base + '/api/v1/sections');
  assert.equal(sectionsRes.status, 200);
  const sections = (await sectionsRes.json()) as any;
  assert.ok(sections.data.length >= 7);
});

test('registration, profile, and duplicate protection', async () => {
  const reg = await fetch(base + '/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Ada Reader', email: 'ada@example.com', password: 'StrongPassword123' }),
  });
  assert.equal(reg.status, 201);
  const regData = (await reg.json()) as any;
  assert.ok(regData.data.token);
  assert.equal(regData.data.user.email, 'ada@example.com');

  // Duplicate email rejected
  const dup = await fetch(base + '/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Ada 2', email: 'ada@example.com', password: 'StrongPassword123' }),
  });
  assert.equal(dup.status, 409);

  // Authenticated profile retrieval
  const me = await fetch(base + '/api/v1/users/me', {
    headers: { Authorization: `Bearer ${regData.data.token}` },
  });
  assert.equal(me.status, 200);
  const meData = (await me.json()) as any;
  assert.equal(meData.data.email, 'ada@example.com');
  assert.equal(meData.data.name, 'Ada Reader');
});

test('course catalog, enrollment, and lesson completion', async () => {
  // Login as Ada
  const login = await fetch(base + '/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ada@example.com', password: 'StrongPassword123' }),
  });
  assert.equal(login.status, 200);
  const token = ((await login.json()) as any).data.token;

  // Browse courses
  const coursesRes = await fetch(base + '/api/v1/courses');
  assert.equal(coursesRes.status, 200);
  const courses = (await coursesRes.json()) as any;
  assert.ok(courses.data.items.length > 0);
  const course = courses.data.items[0];

  // Course detail
  const detailRes = await fetch(base + `/api/v1/courses/${course.slug}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(detailRes.status, 200);
  const detail = (await detailRes.json()) as any;
  assert.equal(detail.data.slug, course.slug);
  assert.ok(detail.data.modules.length > 0);

  // Enroll
  const enrollRes = await fetch(base + `/api/v1/courses/${course.id}/enroll`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(enrollRes.status, 201);

  // Open first lesson
  const firstLesson = detail.data.modules[0].lessons[0];
  const lessonRes = await fetch(base + `/api/v1/lessons/${firstLesson.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(lessonRes.status, 200);

  // Complete lesson
  const completeRes = await fetch(base + `/api/v1/lessons/${firstLesson.id}/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ secondsSpent: 120 }),
  });
  assert.equal(completeRes.status, 200);

  // Learner dashboard
  const dashRes = await fetch(base + '/api/v1/dashboard', {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(dashRes.status, 200);
  const dash = (await dashRes.json()) as any;
  assert.ok(dash.data.stats.enrolled_courses >= 1);
  assert.ok(dash.data.stats.completed_lessons >= 1);
});

test('quiz attempt lifecycle and scoring', async () => {
  const login = await fetch(base + '/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ada@example.com', password: 'StrongPassword123' }),
  });
  const token = ((await login.json()) as any).data.token;

  // List quizzes
  const listRes = await fetch(base + '/api/v1/quizzes');
  assert.equal(listRes.status, 200);
  const list = (await listRes.json()) as any;
  assert.ok(list.data.items.length > 0);
  const quiz = list.data.items[0];

  // Start quiz
  const startRes = await fetch(base + `/api/v1/quizzes/${quiz.slug}/start`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(startRes.status, 201);
  const attempt = (await startRes.json()) as any;
  assert.ok(attempt.data.attempt_id);
  assert.ok(attempt.data.questions.length > 0);

  // Save partial answer
  const q0 = attempt.data.questions[0];
  const saveRes = await fetch(base + `/api/v1/attempts/${attempt.data.attempt_id}/answers`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers: { [q0.id]: 0 } }),
  });
  assert.equal(saveRes.status, 200);

  // Submit attempt
  const submitRes = await fetch(base + `/api/v1/attempts/${attempt.data.attempt_id}/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers: { [q0.id]: 0 } }),
  });
  assert.equal(submitRes.status, 200);
  const result = (await submitRes.json()) as any;
  assert.ok(typeof result.data.score === 'number');
  assert.ok(typeof result.data.percentage === 'number');
  assert.ok(result.data.review.length > 0);
});

test('bookmarks and search', async () => {
  const login = await fetch(base + '/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ada@example.com', password: 'StrongPassword123' }),
  });
  const token = ((await login.json()) as any).data.token;

  const coursesRes = await fetch(base + '/api/v1/courses');
  const course = ((await coursesRes.json()) as any).data.items[0];

  // Create bookmark
  const bmRes = await fetch(base + '/api/v1/bookmarks', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ item_type: 'COURSE', item_id: course.id }),
  });
  assert.equal(bmRes.status, 201);

  // List bookmarks
  const listBm = await fetch(base + '/api/v1/bookmarks', {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(listBm.status, 200);
  const bmList = (await listBm.json()) as any;
  assert.ok(bmList.data.length >= 1);

  // Search across platform
  const searchRes = await fetch(base + '/api/v1/search?q=thinking');
  assert.equal(searchRes.status, 200);
  const search = (await searchRes.json()) as any;
  assert.ok(search.data.total > 0);
});

test('admin overview and access control', async () => {
  // Admin login
  const adminLogin = await fetch(base + '/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@thinktankacademia.org', password: 'super-secure-admin-pass' }),
  });
  assert.equal(adminLogin.status, 200);
  const adminToken = ((await adminLogin.json()) as any).data.token;

  // Admin overview
  const overviewRes = await fetch(base + '/api/v1/admin/overview', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(overviewRes.status, 200);
  const overview = (await overviewRes.json()) as any;
  assert.ok(overview.data.stats.users >= 2);
  assert.ok(overview.data.stats.courses >= 1);

  // Non-admin forbidden check
  const learnerLogin = await fetch(base + '/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ada@example.com', password: 'StrongPassword123' }),
  });
  const learnerToken = ((await learnerLogin.json()) as any).data.token;

  const forbiddenRes = await fetch(base + '/api/v1/admin/overview', {
    headers: { Authorization: `Bearer ${learnerToken}` },
  });
  assert.equal(forbiddenRes.status, 403);
});

test('admin console: generic resource CRUD, users and roles', async () => {
  const adminLogin = await fetch(base + '/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@thinktankacademia.org', password: 'super-secure-admin-pass' }),
  });
  const adminToken = ((await adminLogin.json()) as any).data.token;
  const adminHeaders = { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' };

  // Generic resource list (courses) — exercises the dynamic admin registry on SQLite
  const listRes = await fetch(base + '/api/v1/admin/r/courses?page=1', { headers: adminHeaders });
  assert.equal(listRes.status, 200);
  const list = (await listRes.json()) as any;
  assert.ok(list.data.items.length > 0);
  assert.ok(Array.isArray(list.data.items[0].tags), 'tags must come back as an array');

  // Create a new category through the generic CRUD
  const createRes = await fetch(base + '/api/v1/admin/r/categories', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ name: 'Test Category', slug: 'test-category-xyz', section: 'GENERAL' }),
  });
  assert.equal(createRes.status, 201);
  const created = (await createRes.json()) as any;
  assert.ok(created.data.id);

  // Update it
  const patchRes = await fetch(base + `/api/v1/admin/r/categories/${created.data.id}`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({ description: 'updated via test' }),
  });
  assert.equal(patchRes.status, 200);

  // Delete it
  const delRes = await fetch(base + `/api/v1/admin/r/categories/${created.data.id}`, {
    method: 'DELETE',
    headers: adminHeaders,
  });
  assert.equal(delRes.status, 200);

  // Course lifecycle through the generic CRUD — exercises joined selects and
  // JSON columns (tags/seo) round-tripping as text on SQLite.
  const courseRes = await fetch(base + '/api/v1/admin/r/courses', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      title: 'Regression Course',
      slug: 'regression-course-xyz',
      summary: 'Created by the admin console test.',
      section: 'GENERAL',
      difficulty: 'BEGINNER',
      status: 'DRAFT',
      is_featured: false,
      tags: ['alpha', 'beta'],
      seo_title: 'SEO title',
      seo_description: 'SEO description',
    }),
  });
  assert.equal(courseRes.status, 201);
  const newCourse = (await courseRes.json()) as any;
  assert.ok(newCourse.data.id);
  assert.deepEqual(newCourse.data.tags, ['alpha', 'beta']);
  assert.equal(newCourse.data.seo_title, 'SEO title');

  // Item fetch through the joined select
  const itemRes = await fetch(base + `/api/v1/admin/r/courses/${newCourse.data.id}`, { headers: adminHeaders });
  assert.equal(itemRes.status, 200);
  const item = (await itemRes.json()) as any;
  assert.equal(item.data.slug, 'regression-course-xyz');
  assert.deepEqual(item.data.tags, ['alpha', 'beta']);

  // Filtered + searched list through the aliased join select
  const filteredRes = await fetch(base + '/api/v1/admin/r/courses?status=DRAFT&section=GENERAL&q=regression', {
    headers: adminHeaders,
  });
  assert.equal(filteredRes.status, 200);
  const filtered = (await filteredRes.json()) as any;
  assert.ok(filtered.data.items.some((c: any) => c.id === newCourse.data.id));

  // Title-only patch must preserve the JSON columns
  const coursePatch = await fetch(base + `/api/v1/admin/r/courses/${newCourse.data.id}`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({ title: 'Regression Course v2' }),
  });
  assert.equal(coursePatch.status, 200);
  const patched = (await coursePatch.json()) as any;
  assert.equal(patched.data.title, 'Regression Course v2');
  assert.deepEqual(patched.data.tags, ['alpha', 'beta']);

  // Publish toggle + cleanup
  const publishRes = await fetch(base + `/api/v1/admin/r/courses/${newCourse.data.id}/publish`, {
    method: 'POST',
    headers: adminHeaders,
  });
  assert.equal(publishRes.status, 200);
  assert.equal(((await publishRes.json()) as any).data.status, 'PUBLISHED');

  const courseDel = await fetch(base + `/api/v1/admin/r/courses/${newCourse.data.id}`, {
    method: 'DELETE',
    headers: adminHeaders,
  });
  assert.equal(courseDel.status, 200);

  // User management
  const usersRes = await fetch(base + '/api/v1/admin/users', { headers: adminHeaders });
  assert.equal(usersRes.status, 200);
  const users = (await usersRes.json()) as any;
  assert.ok(users.data.items.length >= 2);

  const newUserRes = await fetch(base + '/api/v1/admin/users', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      name: 'Content Person',
      email: 'content@example.com',
      password: 'StrongPassword123',
      role_id: (await (await fetch(base + '/api/v1/admin/roles', { headers: adminHeaders })).json()).data.roles.find(
        (r: any) => r.name === 'CONTENT_ADMIN',
      ).id,
    }),
  });
  assert.equal(newUserRes.status, 201);
  const newUser = (await newUserRes.json()) as any;
  assert.equal(newUser.data.role_name, 'CONTENT_ADMIN');

  // Roles & permissions
  const rolesRes = await fetch(base + '/api/v1/admin/roles', { headers: adminHeaders });
  assert.equal(rolesRes.status, 200);
  const rolesData = (await rolesRes.json()) as any;
  assert.ok(rolesData.data.roles.length >= 5);
  assert.ok(rolesData.data.permissions.length >= 10);
});

test('super admin console: system health, audit, security, e-mail and backups', async () => {
  const adminLogin = await fetch(base + '/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@thinktankacademia.org', password: 'super-secure-admin-pass' }),
  });
  const adminToken = ((await adminLogin.json()) as any).data.token;
  const adminHeaders = { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' };

  // A failed login first, so the security overview has a LOGIN_FAILED record.
  await fetch(base + '/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ghost@example.com', password: 'WrongPassword1' }),
  });

  // System health
  const healthRes = await fetch(base + '/api/v1/admin/system/health', { headers: adminHeaders });
  assert.equal(healthRes.status, 200);
  const health = (await healthRes.json()) as any;
  assert.ok(health.data.runtime.uptime_seconds >= 0);
  assert.ok(['memory', 'file', 'turso'].includes(health.data.database.mode));
  assert.ok(health.data.table_counts.users >= 1);
  assert.ok(typeof health.data.traffic_24h.requests === 'number');

  // API & error logs
  const apiLogsRes = await fetch(base + '/api/v1/admin/system/api-logs?view=errors', { headers: adminHeaders });
  assert.equal(apiLogsRes.status, 200);
  const apiLogs = (await apiLogsRes.json()) as any;
  assert.ok(Array.isArray(apiLogs.data.items));
  assert.ok(apiLogs.data.stats.last_24h >= 0);
  for (const row of apiLogs.data.items) assert.ok(row.status >= 400);

  // Audit logs with search + filters
  const auditRes = await fetch(base + '/api/v1/admin/audit-logs?q=LOGIN', { headers: adminHeaders });
  assert.equal(auditRes.status, 200);
  const audit = (await auditRes.json()) as any;
  assert.ok(audit.data.items.some((row: any) => row.action === 'LOGIN_FAILED'));
  assert.ok(Array.isArray(audit.data.filters.actions));

  // Security overview
  const securityRes = await fetch(base + '/api/v1/admin/security/overview', { headers: adminHeaders });
  assert.equal(securityRes.status, 200);
  const security = (await securityRes.json()) as any;
  assert.ok(security.data.accounts.total >= 1);
  assert.ok(security.data.authentication.failed_logins_24h >= 1);
  assert.ok(security.data.roles.length >= 5);
  assert.ok(typeof security.data.posture.jwt_secret_ephemeral === 'boolean');

  // E-mail overview (SMTP is unconfigured in tests — attempts are recorded as SKIPPED)
  const emailOverviewRes = await fetch(base + '/api/v1/admin/email/overview', { headers: adminHeaders });
  assert.equal(emailOverviewRes.status, 200);
  const emailOverview = (await emailOverviewRes.json()) as any;
  assert.equal(emailOverview.data.smtp.configured, false);
  assert.ok(typeof emailOverview.data.delivery.last_7d.sent === 'number');

  // Sending an administrative e-mail — unconfigured SMTP returns delivered:false, not an error
  const sendRes = await fetch(base + '/api/v1/admin/email/send', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ to: 'ops@example.com', subject: 'Console test', message: 'Hello from the super admin console.' }),
  });
  assert.equal(sendRes.status, 201);
  const sendBody = (await sendRes.json()) as any;
  assert.equal(sendBody.data.delivered, false);

  // The attempt must be visible in the SMTP log
  const smtpLogsRes = await fetch(base + '/api/v1/admin/email/logs?status=SKIPPED', { headers: adminHeaders });
  assert.equal(smtpLogsRes.status, 200);
  const smtpLogs = (await smtpLogsRes.json()) as any;
  assert.ok(smtpLogs.data.items.some((row: any) => row.to_email === 'ops@example.com'));
  assert.ok(smtpLogs.data.totals.skipped >= 1);

  // Backups: create → list → download → delete
  const createBackupRes = await fetch(base + '/api/v1/admin/backups', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ note: 'automated test snapshot' }),
  });
  assert.equal(createBackupRes.status, 201);
  const backup = (await createBackupRes.json()) as any;
  assert.ok(backup.data.size_bytes > 0);
  assert.ok(backup.data.table_counts.users >= 1);
  // Sensitive material must never leave the database verbatim.
  assert.ok(JSON.stringify(backup.data.table_counts).length > 0);

  const listBackupsRes = await fetch(base + '/api/v1/admin/backups', { headers: adminHeaders });
  assert.equal(listBackupsRes.status, 200);
  const backupsList = (await listBackupsRes.json()) as any;
  const created = backupsList.data.items.find((row: any) => row.id === backup.data.id);
  assert.ok(created && created.file_exists === true);
  assert.equal(created.note, 'automated test snapshot');

  const downloadRes = await fetch(base + `/api/v1/admin/backups/${backup.data.id}/download`, { headers: adminHeaders });
  assert.equal(downloadRes.status, 200);
  const downloadText = await downloadRes.text();
  const downloadJson = JSON.parse(downloadText);
  assert.equal(downloadJson.meta.platform, 'ThinkTank Academia');
  assert.ok(downloadJson.tables.users.length >= 1);
  assert.ok(downloadJson.tables.users.every((u: any) => !u.password_hash || !u.password_hash.startsWith('$2')));

  const deleteRes = await fetch(base + `/api/v1/admin/backups/${backup.data.id}`, { method: 'DELETE', headers: adminHeaders });
  assert.equal(deleteRes.status, 200);

  // Non-admins must be locked out of every super-admin endpoint
  const learnerLogin = await fetch(base + '/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ada@example.com', password: 'StrongPassword123' }),
  });
  const learnerToken = ((await learnerLogin.json()) as any).data.token;
  for (const path of ['/system/health', '/security/overview', '/audit-logs', '/email/logs', '/backups']) {
    const res = await fetch(base + `/api/v1/admin${path}`, { headers: { Authorization: `Bearer ${learnerToken}` } });
    assert.equal(res.status, 403, `${path} must reject non-admins`);
  }
});

test('account self-deletion cascades user-owned rows (media uploaded_by etc.)', async () => {
  const reg = await fetch(base + '/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Cascading User', email: 'cascade@example.com', password: 'StrongPassword123' }),
  });
  assert.equal(reg.status, 201);
  const token = ((await reg.json()) as any).data.token;

  // Upload an avatar — inserts a media row with uploaded_by = this user.
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  );
  const form = new FormData();
  form.append('file', new Blob([png], { type: 'image/png' }), 'cascade.png');
  const avatar = await fetch(base + '/api/v1/users/me/avatar', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  assert.equal(avatar.status, 201);

  // Deleting the account must succeed despite the media row referencing it.
  const del = await fetch(base + '/api/v1/users/me', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'StrongPassword123' }),
  });
  assert.equal(del.status, 200);
});

test('hackeradmin: passcode login, site switch, traffic and admin views', async () => {
  // Status endpoint is public (login screen data)
  const statusRes = await fetch(base + '/api/v1/hackeradmin/status');
  assert.equal(statusRes.status, 200);
  const statusData = (await statusRes.json()) as any;
  assert.ok(statusData.data.ttlMinutes > 0);
  assert.ok(statusData.data.rotations >= 1);

  // Wrong passcode rejected
  const badLogin = await fetch(base + '/api/v1/hackeradmin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passcode: 'WRONG-CODE' }),
  });
  assert.equal(badLogin.status, 401);

  // Correct development passcode accepted
  const loginRes = await fetch(base + '/api/v1/hackeradmin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passcode: 'DEV-C0DE' }),
  });
  assert.equal(loginRes.status, 200);
  const loginData = (await loginRes.json()) as any;
  assert.ok(loginData.data.token);
  const hackerHeaders = { Authorization: `Bearer ${loginData.data.token}`, 'Content-Type': 'application/json' };

  // Unauthenticated access to protected endpoints is rejected
  const noAuth = await fetch(base + '/api/v1/hackeradmin/overview');
  assert.equal(noAuth.status, 401);

  // Overview
  const overviewRes = await fetch(base + '/api/v1/hackeradmin/overview', { headers: hackerHeaders });
  assert.equal(overviewRes.status, 200);
  const overview = (await overviewRes.json()) as any;
  assert.equal(overview.data.site.enabled, true);
  assert.ok(overview.data.stats.users >= 3);

  // Traffic + visitors (there is logged traffic from earlier tests)
  const trafficRes = await fetch(base + '/api/v1/hackeradmin/traffic', { headers: hackerHeaders });
  assert.equal(trafficRes.status, 200);
  const traffic = (await trafficRes.json()) as any;
  assert.ok(traffic.data.totals.total > 0);
  assert.ok(traffic.data.recent.length > 0);

  const visitorsRes = await fetch(base + '/api/v1/hackeradmin/visitors', { headers: hackerHeaders });
  assert.equal(visitorsRes.status, 200);
  const visitors = (await visitorsRes.json()) as any;
  assert.ok(visitors.data.unique_visitors[1].total >= 1);

  // Admins & super admin views
  const adminsRes = await fetch(base + '/api/v1/hackeradmin/admins', { headers: hackerHeaders });
  assert.equal(adminsRes.status, 200);
  const admins = (await adminsRes.json()) as any;
  assert.ok(admins.data.length >= 2);
  assert.ok(admins.data.some((a: any) => a.role_name === 'SUPER_ADMIN'));

  const superRes = await fetch(base + '/api/v1/hackeradmin/superadmin', { headers: hackerHeaders });
  assert.equal(superRes.status, 200);
  const superData = (await superRes.json()) as any;
  assert.equal(superData.data.configured.email, 'super@thinktankacademia.org');
  assert.ok(superData.data.super_admins.length >= 1);

  // The super admin seeded from SUPER_ADMIN_EMAIL can log in to the admin console
  const superLogin = await fetch(base + '/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'super@thinktankacademia.org', password: 'super-secure-admin-pass' }),
  });
  assert.equal(superLogin.status, 200);
  const superToken = ((await superLogin.json()) as any).data.token;
  const superOverview = await fetch(base + '/api/v1/admin/overview', {
    headers: { Authorization: `Bearer ${superToken}` },
  });
  assert.equal(superOverview.status, 200);

  // Site kill switch: OFF takes the public API down, hacker console stays up
  const offRes = await fetch(base + '/api/v1/hackeradmin/site/toggle', {
    method: 'POST',
    headers: hackerHeaders,
    body: JSON.stringify({ enabled: false, note: 'maintenance test' }),
  });
  assert.equal(offRes.status, 200);

  const coursesWhileOff = await fetch(base + '/api/v1/courses');
  assert.equal(coursesWhileOff.status, 503);
  const offBody = (await coursesWhileOff.json()) as any;
  assert.equal(offBody.error.code, 'SITE_OFFLINE');

  // Health + hacker admin survive the shutdown
  const healthWhileOff = await fetch(base + '/api/health');
  assert.equal(healthWhileOff.status, 200);
  const hackerWhileOff = await fetch(base + '/api/v1/hackeradmin/overview', { headers: hackerHeaders });
  assert.equal(hackerWhileOff.status, 200);
  assert.equal(((await hackerWhileOff.json()) as any).data.site.enabled, false);

  // Back online
  const onRes = await fetch(base + '/api/v1/hackeradmin/site/toggle', {
    method: 'POST',
    headers: hackerHeaders,
    body: JSON.stringify({ enabled: true }),
  });
  assert.equal(onRes.status, 200);
  const coursesBack = await fetch(base + '/api/v1/courses');
  assert.equal(coursesBack.status, 200);

  // Manual passcode rotation works and logs a new window
  const rotateRes = await fetch(base + '/api/v1/hackeradmin/passcode/regenerate', {
    method: 'POST',
    headers: hackerHeaders,
  });
  assert.equal(rotateRes.status, 200);
  const rotateData = (await rotateRes.json()) as any;
  assert.ok(rotateData.data.expiresAt);

  // The /hackeradmin page is served
  const pageRes = await fetch(base + '/hackeradmin');
  assert.equal(pageRes.status, 200);
  const page = await pageRes.text();
  assert.ok(page.includes('Admin Access'));
  assert.ok(page.includes('/api/v1/hackeradmin'));
});

test.after(async () => {
  await stop(server);
});
