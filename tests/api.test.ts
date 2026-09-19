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
  assert.ok(page.includes('HACKER ADMIN'));
});

test.after(async () => {
  await stop(server);
});
