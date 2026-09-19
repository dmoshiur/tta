import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.ADMIN_EMAIL = 'admin@thinktankacademia.org';
process.env.ADMIN_PASSWORD = 'super-secure-admin-pass';

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

test.after(async () => {
  await stop(server);
});
