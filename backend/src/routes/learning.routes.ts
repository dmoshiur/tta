import { Router } from 'express';
import { z } from 'zod';
import { all, insert, one, run, count } from '../db/index.ts';
import { badRequest, forbidden, notFound } from '../lib/errors.ts';
import { like, ok, pagination, paged, parse, route } from '../lib/http.ts';
import { fromJson, newId, percentage, fromArray } from '../lib/util.ts';
import { sanitizePlainText } from '../lib/sanitize.ts';
import { authenticate, optionalAuth } from '../middleware/auth.ts';
import { SECTIONS } from '../db/taxonomy.ts';
import { logActivity, notify } from '../services/notifications.ts';

const param = (p: unknown): string => (Array.isArray(p) ? String(p[0] ?? '') : String(p ?? ''));

export const learningRoutes = Router();

const SORTS: Record<string, string> = {
  newest: 'published_at DESC',
  oldest: 'published_at ASC',
  title: 'title ASC',
  popular: 'views DESC',
  featured: 'is_featured DESC, published_at DESC',
};

function publicCourse(row: Record<string, any>) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    description: row.description,
    section: row.section,
    section_label: row.section_label ?? null,
    category: row.category ?? null,
    category_slug: row.category_slug ?? null,
    instructor: (row.instructor_name || row.instructor) ?? null,
    difficulty: row.difficulty,
    language: row.language,
    duration_minutes: Number(row.duration_minutes ?? 0),
    thumbnail_url: row.thumbnail_url ?? null,
    tags: fromArray(row.tags),
    is_featured: Boolean(row.is_featured),
    status: row.status,
    views: Number(row.views ?? 0),
    lesson_count: Number(row.lesson_count ?? 0),
    published_at: row.published_at,
    created_at: row.created_at,
  };
}

// ── Taxonomy ────────────────────────────────────────────────────────────────

learningRoutes.get(
  '/categories',
  route(async (req, res) => {
    const section = typeof req.query.section === 'string' && req.query.section ? req.query.section.toUpperCase() : null;
    const rows = await all<Record<string, any>>(
      `SELECT c.id, c.name, c.slug, c.section, c.description, c.icon, c.position
         FROM categories c
        WHERE c.is_active = TRUE${section ? ' AND c.section = $1' : ''}
        ORDER BY c.section, c.position, c.name`,
      section ? [section] : [],
    );

    const counts = await all<{ category_id: string; total: number }>(
      "SELECT category_id, COUNT(*)::int AS total FROM courses WHERE status = 'PUBLISHED' AND category_id IS NOT NULL GROUP BY category_id",
    );
    const countMap = new Map(counts.map((row) => [row.category_id, Number(row.total)]));

    ok(res, rows.map((row) => ({ ...row, course_count: countMap.get(row.id) ?? 0 })));
  }),
);

/** Section metadata (labels, paths, descriptions) plus live counts — drives the nav and homepage. */
learningRoutes.get(
  '/sections',
  route(async (_req, res) => {
    const courseCounts = await all<{ section: string; total: number }>(
      "SELECT section, COUNT(*)::int AS total FROM courses WHERE status = 'PUBLISHED' GROUP BY section",
    );
    const contentCounts = await all<{ type: string; total: number }>(
      "SELECT type, COUNT(*)::int AS total FROM content WHERE status = 'PUBLISHED' GROUP BY type",
    );
    const bookCount = await count('books', "status = 'PUBLISHED'");
    const quizCount = await count('quizzes', "status = 'PUBLISHED'");

    const sectionTotals = new Map(courseCounts.map((row) => [row.section, Number(row.total)]));
    const contentTotals = new Map(contentCounts.map((row) => [row.type, Number(row.total)]));

    ok(
      res,
      SECTIONS.map((section) => ({
        id: section.id,
        label: section.label,
        tagline: section.tagline,
        description: section.description,
        path: section.path,
        category_count: section.categories.length,
        course_count: sectionTotals.get(section.id) ?? 0,
        content_count: contentTotals.get(section.id) ?? 0,
        book_count: section.id === 'BOOKS' ? bookCount : 0,
        quiz_count: section.id === 'JOB_PREP' ? quizCount : 0,
      })),
    );
  }),
);

// ── Courses ─────────────────────────────────────────────────────────────────

learningRoutes.get(
  '/courses',
  route(async (req, res) => {
    const page = pagination(req.query as Record<string, unknown>);
    const sort = SORTS[String(req.query.sort ?? 'featured')] ?? SORTS.featured;
    const term = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const section = typeof req.query.section === 'string' && req.query.section ? req.query.section.toUpperCase() : null;
    const category = typeof req.query.category === 'string' && req.query.category ? req.query.category : null;
    const difficulty = typeof req.query.difficulty === 'string' && req.query.difficulty ? req.query.difficulty.toUpperCase() : null;
    const featured = req.query.featured === 'true' || req.query.featured === '1';

    const where: string[] = ["c.status = 'PUBLISHED'"];
    const params: unknown[] = [];
    if (term) {
      params.push(like(term));
      where.push(`(c.title ILIKE $${params.length} OR c.summary ILIKE $${params.length} OR c.description ILIKE $${params.length})`);
    }
    if (section) {
      params.push(section);
      where.push(`c.section = $${params.length}`);
    }
    if (difficulty) {
      params.push(difficulty);
      where.push(`c.difficulty = $${params.length}`);
    }
    if (featured) where.push('c.is_featured = TRUE');
    if (category) {
      params.push(category);
      where.push(`(cat.slug = $${params.length} OR cat.name ILIKE $${params.length})`);
    }
    const whereSql = where.join(' AND ');

    const totalRow = await one<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM courses c LEFT JOIN categories cat ON cat.id = c.category_id WHERE ${whereSql}`,
      params,
    );
    const rows = await all<Record<string, any>>(
      `SELECT c.*, cat.name AS category, cat.slug AS category_slug
         FROM courses c
         LEFT JOIN categories cat ON cat.id = c.category_id
        WHERE ${whereSql}
        ORDER BY ${sort}, c.created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, page.limit, page.offset],
    );

    const lessonCounts = await lessonCountByCourse(rows.map((row) => row.id));
    ok(
      res,
      paged(
        rows.map((row) => publicCourse({ ...row, lesson_count: lessonCounts.get(row.id) ?? 0 })),
        page,
        Number(totalRow?.total ?? 0),
      ),
    );
  }),
);

/** Published-lesson counts for a set of courses, in one grouped query. */
async function lessonCountByCourse(courseIds: string[]): Promise<Map<string, number>> {
  if (!courseIds.length) return new Map();
  const placeholders = courseIds.map((_, index) => `$${index + 1}`).join(', ');
  const rows = await all<{ course_id: string; total: number }>(
    `SELECT m.course_id, COUNT(l.id)::int AS total
       FROM lessons l JOIN modules m ON m.id = l.module_id
      WHERE l.status = 'PUBLISHED' AND m.course_id IN (${placeholders})
      GROUP BY m.course_id`,
    courseIds,
  );
  return new Map(rows.map((row) => [row.course_id, Number(row.total)]));
}

async function findCourse(slugOrId: string) {
  return one<Record<string, any>>(
    `SELECT c.*, cat.name AS category, cat.slug AS category_slug
       FROM courses c LEFT JOIN categories cat ON cat.id = c.category_id
      WHERE c.slug = $1 OR c.id = $1`,
    [slugOrId],
  );
}

learningRoutes.get(
  '/courses/:slug',
  optionalAuth,
  route(async (req, res) => {
    const course = await findCourse(param(req.params.slug));
    if (!course || (course.status !== 'PUBLISHED' && req.user?.roleName === 'USER')) throw notFound('Course not found.');

    const modules = await all<Record<string, any>>(
      'SELECT id, title, summary, position FROM modules WHERE course_id = $1 ORDER BY position, created_at',
      [course.id],
    );
    let lessons: Record<string, any>[] = [];
    if (modules.length) {
      const placeholders = modules.map((_, index) => `$${index + 1}`).join(', ');
      lessons = await all<Record<string, any>>(
        `SELECT id, module_id, title, slug, summary, kind, video_url, duration_minutes, position, is_preview, status
           FROM lessons WHERE module_id IN (${placeholders}) ORDER BY position, created_at`,
        modules.map((module) => module.id),
      );
    }

    const enrollment = req.user
      ? await one<Record<string, any>>('SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2', [req.user.id, course.id])
      : undefined;
    const isAdminViewer = Boolean(req.user && req.user.roleName !== 'USER');

    const progressRows = req.user
      ? await all<{ lesson_id: string; completed: boolean }>(
          'SELECT lesson_id, completed FROM lesson_progress WHERE user_id = $1',
          [req.user.id],
        )
      : [];
    const completedIds = new Set(progressRows.filter((row) => row.completed).map((row) => row.lesson_id));

    const quizzes = await all<Record<string, any>>(
      `SELECT id, title, slug, kind, duration_minutes, question_count, total_marks, status
         FROM quizzes WHERE course_id = $1${isAdminViewer ? '' : " AND status = 'PUBLISHED'"} ORDER BY created_at`,
      [course.id],
    );

    const visibleLessons = lessons.filter((lesson) => lesson.status === 'PUBLISHED' || isAdminViewer);
    const completedCount = visibleLessons.filter((lesson) => completedIds.has(lesson.id)).length;
    const durationMinutes =
      Number(course.duration_minutes) || visibleLessons.reduce((sum, lesson) => sum + Number(lesson.duration_minutes ?? 0), 0);

    const related = await all<Record<string, any>>(
      `SELECT c.id, c.title, c.slug, c.summary, c.difficulty, c.thumbnail_url, c.section, cat.name AS category
         FROM courses c LEFT JOIN categories cat ON cat.id = c.category_id
        WHERE c.status = 'PUBLISHED' AND c.section = $1 AND c.id <> $2
        ORDER BY c.is_featured DESC, c.published_at DESC LIMIT 4`,
      [course.section, course.id],
    );
    const relatedCounts = await lessonCountByCourse(related.map((row) => row.id));

    if (req.user) {
      await run(
        `INSERT INTO recently_viewed(user_id, item_type, item_id, item_title, item_slug, viewed_at)
         VALUES($1, 'COURSE', $2, $3, $4, NOW())
         ON CONFLICT (user_id, item_type, item_id) DO UPDATE SET viewed_at = NOW(), item_title = $3`,
        [req.user.id, course.id, course.title, course.slug],
      );
    }
    run('UPDATE courses SET views = views + 1 WHERE id = $1', [course.id]).catch(() => undefined);

    ok(res, {
      ...publicCourse({ ...course, lesson_count: visibleLessons.length }),
      body: course.body || '',
      seo: fromJson(course.seo, {}),
      duration_minutes: durationMinutes,
      modules: modules.map((module) => ({
        ...module,
        lessons: visibleLessons
          .filter((lesson) => lesson.module_id === module.id)
          .map((lesson) => ({ ...lesson, completed: completedIds.has(lesson.id) })),
      })),
      quizzes,
      related: related.map((row) => ({ ...row, tags: fromArray(row.tags), lesson_count: relatedCounts.get(row.id) ?? 0 })),
      enrollment: enrollment
        ? {
            enrolled: true,
            status: enrollment.status,
            enrolled_at: enrollment.enrolled_at,
            last_lesson_id: enrollment.last_lesson_id,
            completed_at: enrollment.completed_at,
          }
        : { enrolled: false },
      progress: {
        total_lessons: visibleLessons.length,
        completed_lessons: completedCount,
        percentage: percentage(completedCount, visibleLessons.length),
      },
    });
  }),
);

learningRoutes.post(
  '/courses/:id/enroll',
  authenticate,
  route(async (req, res) => {
    const courseId = param(req.params.id);
    const course = await one<Record<string, any>>('SELECT id, title, slug, status FROM courses WHERE id = $1 OR slug = $1', [courseId]);
    if (!course) throw notFound('Course not found.');
    if (course.status !== 'PUBLISHED' && req.user!.roleName === 'USER') throw forbidden('This course is not open for enrolment yet.');

    await run(
      `INSERT INTO enrollments(user_id, course_id, status, enrolled_at) VALUES($1, $2, 'ACTIVE', NOW())
       ON CONFLICT (user_id, course_id) DO UPDATE SET status = 'ACTIVE'`,
      [req.user!.id, course.id],
    );
    await notify({
      userId: req.user!.id,
      title: 'Enrolment confirmed',
      message: `You are enrolled in "${course.title}".`,
      type: 'COURSE',
      link: `/courses/${course.slug}`,
    });
    await logActivity({
      actorId: req.user!.id,
      actorName: req.user!.name,
      action: 'ENROLLED',
      entityType: 'COURSE',
      entityId: course.id,
      entityLabel: course.title,
    });
    ok(res, { enrolled: true, courseId: course.id, slug: course.slug }, 201);
  }),
);

learningRoutes.delete(
  '/courses/:id/enroll',
  authenticate,
  route(async (req, res) => {
    const courseId = param(req.params.id);
    const course = await one<{ id: string }>('SELECT id FROM courses WHERE id = $1 OR slug = $1', [courseId]);
    if (!course) throw notFound('Course not found.');
    await run('DELETE FROM enrollments WHERE user_id = $1 AND course_id = $2', [req.user!.id, course.id]);
    await run('DELETE FROM lesson_progress WHERE user_id = $1 AND lesson_id IN (SELECT l.id FROM lessons l JOIN modules m ON m.id = l.module_id WHERE m.course_id = $2)', [
      req.user!.id,
      course.id,
    ]);
    ok(res, { enrolled: false });
  }),
);

// ── Lessons and progress ────────────────────────────────────────────────────

async function lessonContext(lessonId: string) {
  const lesson = await one<Record<string, any>>(
    `SELECT l.*, m.course_id, m.title AS module_title, c.title AS course_title, c.slug AS course_slug, c.status AS course_status
       FROM lessons l
       JOIN modules m ON m.id = l.module_id
       JOIN courses c ON c.id = m.course_id
      WHERE l.id = $1 OR l.slug = $1`,
    [lessonId],
  );
  if (!lesson) throw notFound('Lesson not found.');
  return lesson;
}

learningRoutes.get(
  '/lessons/:id',
  optionalAuth,
  route(async (req, res) => {
    const lesson = await lessonContext(param(req.params.id));
    const isAdminViewer = Boolean(req.user && req.user.roleName !== 'USER');
    const enrollment = req.user
      ? await one<Record<string, any>>('SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2', [req.user.id, lesson.course_id])
      : undefined;

    if (!isAdminViewer && lesson.status !== 'PUBLISHED') throw notFound('Lesson not found.');
    if (!isAdminViewer && !lesson.is_preview && !enrollment) {
      throw forbidden('Enrol in this course to unlock the lesson. The first lesson of each course is free to preview.');
    }

    const progress = req.user
      ? await one<{ completed: boolean; completed_at: string }>('SELECT completed, completed_at FROM lesson_progress WHERE user_id = $1 AND lesson_id = $2', [
          req.user.id,
          lesson.id,
        ])
      : undefined;

    const siblings = await all<{ id: string; title: string; slug: string; position: number }>(
      "SELECT id, title, slug, position FROM lessons WHERE module_id = $1 AND status = 'PUBLISHED' ORDER BY position",
      [lesson.module_id],
    );
    const index = siblings.findIndex((item) => item.id === lesson.id);

    if (req.user) {
      await run('UPDATE enrollments SET last_lesson_id = $1, last_accessed_at = NOW() WHERE user_id = $2 AND course_id = $3', [
        lesson.id,
        req.user.id,
        lesson.course_id,
      ]);
      await run(
        `INSERT INTO recently_viewed(user_id, item_type, item_id, item_title, item_slug, viewed_at)
         VALUES($1, 'LESSON', $2, $3, $4, NOW())
         ON CONFLICT (user_id, item_type, item_id) DO UPDATE SET viewed_at = NOW(), item_title = $3`,
        [req.user.id, lesson.id, lesson.title, lesson.slug],
      );
    }

    ok(res, {
      id: lesson.id,
      title: lesson.title,
      slug: lesson.slug,
      summary: lesson.summary,
      content: lesson.content,
      kind: lesson.kind,
      video_url: lesson.video_url,
      attachments: fromJson(lesson.attachments, []),
      notes: lesson.notes,
      duration_minutes: Number(lesson.duration_minutes ?? 0),
      module: { id: lesson.module_id, title: lesson.module_title },
      course: { id: lesson.course_id, title: lesson.course_title, slug: lesson.course_slug },
      completed: Boolean(progress?.completed),
      completed_at: progress?.completed_at ?? null,
      enrolled: Boolean(enrollment) || isAdminViewer,
      navigation: {
        previous: index > 0 ? siblings[index - 1] : null,
        next: index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null,
      },
    });
  }),
);

learningRoutes.post(
  '/lessons/:id/complete',
  authenticate,
  route(async (req, res) => {
    const lesson = await lessonContext(param(req.params.id));
    const data = parse(z.object({ secondsSpent: z.number().int().min(0).max(86_400).optional() }).optional(), req.body ?? {});

    const enrollment = await one<{ course_id: string }>('SELECT course_id FROM enrollments WHERE user_id = $1 AND course_id = $2', [
      req.user!.id,
      lesson.course_id,
    ]);
    if (!enrollment && req.user!.roleName === 'USER') throw forbidden('Enrol in the course before recording progress.');

    await run(
      `INSERT INTO lesson_progress(user_id, lesson_id, completed, seconds_spent, completed_at)
       VALUES($1, $2, TRUE, $3, NOW())
       ON CONFLICT (user_id, lesson_id) DO UPDATE SET completed = TRUE, completed_at = NOW(), seconds_spent = $3`,
      [req.user!.id, lesson.id, data?.secondsSpent ?? 0],
    );
    await run('UPDATE enrollments SET last_lesson_id = $1, last_accessed_at = NOW() WHERE user_id = $2 AND course_id = $3', [
      lesson.id,
      req.user!.id,
      lesson.course_id,
    ]);

    // Course completion: when every published lesson of the course is done.
    const lessons = await all<{ id: string }>(
      `SELECT l.id FROM lessons l JOIN modules m ON m.id = l.module_id
        WHERE m.course_id = $1 AND l.status = 'PUBLISHED'`,
      [lesson.course_id],
    );
    const completed = await all<{ lesson_id: string }>(
      'SELECT lesson_id FROM lesson_progress WHERE user_id = $1 AND completed = TRUE',
      [req.user!.id],
    );
    const completedSet = new Set(completed.map((row) => row.lesson_id));
    const allDone = lessons.length > 0 && lessons.every((row) => completedSet.has(row.id));

    if (allDone) {
      const updated = await run('UPDATE enrollments SET completed_at = NOW(), status = $1 WHERE user_id = $2 AND course_id = $3 AND completed_at IS NULL', [
        'COMPLETED',
        req.user!.id,
        lesson.course_id,
      ]);
      if (updated) {
        await notify({
          userId: req.user!.id,
          title: 'Course completed',
          message: `You finished "${lesson.course_title}". Well done.`,
          type: 'COURSE',
          link: `/courses/${lesson.course_slug}`,
        });
        await logActivity({
          actorId: req.user!.id,
          actorName: req.user!.name,
          action: 'COMPLETED_COURSE',
          entityType: 'COURSE',
          entityId: lesson.course_id,
          entityLabel: lesson.course_title,
        });
      }
    }

    ok(res, {
      completed: true,
      lessonId: lesson.id,
      courseCompleted: allDone,
      progress: { completed_lessons: lessons.filter((row) => completedSet.has(row.id)).length, total_lessons: lessons.length },
    });
  }),
);

learningRoutes.delete(
  '/lessons/:id/complete',
  authenticate,
  route(async (req, res) => {
    const lesson = await lessonContext(param(req.params.id));
    await run('DELETE FROM lesson_progress WHERE user_id = $1 AND lesson_id = $2', [req.user!.id, lesson.id]);
    await run("UPDATE enrollments SET status = 'ACTIVE', completed_at = NULL WHERE user_id = $1 AND course_id = $2", [
      req.user!.id,
      lesson.course_id,
    ]);
    ok(res, { completed: false });
  }),
);

// ── Assignments ─────────────────────────────────────────────────────────────

learningRoutes.get(
  '/assignments',
  optionalAuth,
  route(async (req, res) => {
    const courseId = String(req.query.courseId ?? '');
    if (!courseId) throw badRequest('Provide a courseId.');
    const assignments = await all<Record<string, any>>(
      `SELECT a.id, a.title, a.instructions, a.points, a.due_at, a.position, a.course_id, a.module_id
         FROM assignments a
        WHERE a.course_id = $1 AND (a.status = 'PUBLISHED' OR $2 = TRUE)
        ORDER BY a.position, a.created_at`,
      [courseId, Boolean(req.user && req.user.roleName !== 'USER')],
    );

    const submissions = req.user
      ? await all<Record<string, any>>('SELECT assignment_id, id, score, feedback, submitted_at, graded_at FROM assignment_submissions WHERE user_id = $1', [
          req.user.id,
        ])
      : [];
    const byAssignment = new Map(submissions.map((row) => [row.assignment_id, row]));

    ok(
      res,
      assignments.map((assignment) => ({ ...assignment, submission: byAssignment.get(assignment.id) ?? null })),
    );
  }),
);

learningRoutes.post(
  '/assignments/:id/submit',
  authenticate,
  route(async (req, res) => {
    const data = parse(
      z.object({ body: z.string().trim().min(10).max(20_000), attachmentUrl: z.string().trim().max(500).optional() }),
      req.body,
    );
    const assignment = await one<Record<string, any>>('SELECT * FROM assignments WHERE id = $1', [param(req.params.id)]);
    if (!assignment) throw notFound('Assignment not found.');

    const id = newId();
    await insert('assignment_submissions', {
      id,
      assignment_id: assignment.id,
      user_id: req.user!.id,
      body: sanitizePlainText(data.body),
      attachment_url: data.attachmentUrl ?? null,
    });
    ok(res, { id, submitted: true }, 201);
  }),
);

// ── Learner dashboard ───────────────────────────────────────────────────────

learningRoutes.get(
  '/dashboard',
  authenticate,
  route(async (req, res) => {
    const userId = req.user!.id;

    const enrollments = await all<Record<string, any>>(
      `SELECT c.id, c.title, c.slug, c.summary, c.section, c.difficulty, c.thumbnail_url, cat.name AS category,
              en.status AS enrollment_status, en.enrolled_at, en.last_lesson_id, en.completed_at, en.last_accessed_at
         FROM enrollments en
         JOIN courses c ON c.id = en.course_id
         LEFT JOIN categories cat ON cat.id = c.category_id
        WHERE en.user_id = $1
        ORDER BY en.last_accessed_at DESC, en.enrolled_at DESC`,
      [userId],
    );

    const progressRows = await all<{ lesson_id: string; completed: boolean; completed_at: string }>(
      'SELECT lesson_id, completed, completed_at FROM lesson_progress WHERE user_id = $1',
      [userId],
    );
    const completedLessons = new Set(progressRows.filter((row) => row.completed).map((row) => row.lesson_id));

    const courseIds = enrollments.map((row) => row.id);
    const lessonTotals = new Map<string, { total: number; ids: string[] }>();
    if (courseIds.length) {
      const placeholders = courseIds.map((_, index) => `$${index + 1}`).join(', ');
      const lessonRows = await all<{ course_id: string; id: string }>(
        `SELECT m.course_id, l.id FROM lessons l JOIN modules m ON m.id = l.module_id
          WHERE l.status = 'PUBLISHED' AND m.course_id IN (${placeholders})`,
        courseIds,
      );
      for (const row of lessonRows) {
        const entry = lessonTotals.get(row.course_id) ?? { total: 0, ids: [] };
        entry.total += 1;
        entry.ids.push(row.id);
        lessonTotals.set(row.course_id, entry);
      }
    }

    const courses = enrollments.map((enrollment) => {
      const entry = lessonTotals.get(enrollment.id) ?? { total: 0, ids: [] };
      const done = entry.ids.filter((id) => completedLessons.has(id)).length;
      return {
        ...enrollment,
        total_lessons: entry.total,
        completed_lessons: done,
        progress: percentage(done, entry.total),
        completed: Boolean(enrollment.completed_at),
      };
    });

    const inProgress = courses.filter((course) => !course.completed && course.completed_lessons > 0);
    const notStarted = courses.filter((course) => !course.completed && course.completed_lessons === 0);
    const completedCourses = courses.filter((course) => course.completed);

    const attempts = await all<Record<string, any>>(
      `SELECT a.id, a.score, a.total, a.percentage, a.passed, a.correct_count, a.wrong_count, a.unanswered_count,
              a.status, a.submitted_at, a.started_at, q.title AS quiz_title, q.slug AS quiz_slug, q.kind AS quiz_kind
         FROM attempts a JOIN quizzes q ON q.id = a.quiz_id
        WHERE a.user_id = $1
        ORDER BY a.started_at DESC LIMIT 8`,
      [userId],
    );

    // Counts are issued separately: scalar subqueries in a SELECT list are not
    // portable across every PostgreSQL-compatible engine we run against, and the
    // in-memory development database is not safe for concurrent statements.
    const quizzesTaken = await count('attempts', "user_id = $1 AND status = 'SUBMITTED'", [userId]);
    const bookmarksTotal = await count('bookmarks', 'user_id = $1', [userId]);
    const unreadNotifications = await count('notifications', "(user_id = $1 OR (user_id IS NULL AND audience = 'ALL')) AND read_at IS NULL", [userId]);

    const bestAttempts = await all<{ best: number }>(
      "SELECT percentage AS best FROM attempts WHERE user_id = $1 AND status = 'SUBMITTED' ORDER BY percentage DESC LIMIT 1",
      [userId],
    );

    const recent = await all<Record<string, any>>(
      'SELECT item_type, item_id, item_title, item_slug, viewed_at FROM recently_viewed WHERE user_id = $1 ORDER BY viewed_at DESC LIMIT 8',
      [userId],
    );

    const bookmarkRows = await all<Record<string, any>>(
      'SELECT item_type, item_id, created_at FROM bookmarks WHERE user_id = $1 ORDER BY created_at DESC LIMIT 8',
      [userId],
    );

    ok(res, {
      stats: {
        enrolled_courses: courses.length,
        completed_lessons: completedLessons.size,
        completed_courses: completedCourses.length,
        quizzes_taken: quizzesTaken,
        best_percentage: Number(bestAttempts[0]?.best ?? 0),
        bookmarks: bookmarksTotal,
        unread_notifications: unreadNotifications,
      },
      continue_learning: [...inProgress, ...notStarted].slice(0, 6),
      courses,
      completed_courses: completedCourses,
      attempts,
      recently_viewed: recent,
      bookmarks: bookmarkRows,
    });
  }),
);
