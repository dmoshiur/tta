import { Router } from 'express';
import { z } from 'zod';
import { all, insert, one, run, count } from '../db/index.ts';
import { badRequest, forbidden, notFound } from '../lib/errors.ts';
import { like, ok, pagination, paged, parse, route } from '../lib/http.ts';
import { fromJson, json, newId, percentage, round, shuffle, toNumber } from '../lib/util.ts';
import { authenticate, optionalAuth } from '../middleware/auth.ts';
import type { SessionUser } from '../security/session.ts';
import { logActivity, notify } from '../services/notifications.ts';

const param = (p: unknown): string => (Array.isArray(p) ? String(p[0] ?? '') : String(p ?? ''));

export const quizRoutes = Router();

interface QuestionRow extends Record<string, any> {
  id: string;
  prompt: string;
  kind: string;
  options: unknown;
  correct: unknown;
  explanation: string;
  marks: unknown;
  difficulty: string;
}

function normalizeCorrect(value: unknown): number[] {
  const parsed = fromJson<unknown>(value, value);
  const list = Array.isArray(parsed) ? parsed : [parsed];
  return list.map((item) => Number(item)).filter((item) => Number.isFinite(item));
}

function normalizeAnswer(value: unknown): number[] {
  if (value === null || value === undefined || value === '') return [];
  const list = Array.isArray(value) ? value : [value];
  return list
    .map((item) => (typeof item === 'boolean' ? (item ? 0 : 1) : Number(item)))
    .filter((item) => Number.isFinite(item))
    .sort((a, b) => a - b);
}

function sameAnswer(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function publicQuestion(question: QuestionRow, index: number) {
  const options = fromJson<string[]>(question.options, []);
  return {
    id: question.id,
    position: index + 1,
    prompt: question.prompt,
    kind: question.kind,
    options,
    marks: toNumber(question.marks, 1),
    difficulty: question.difficulty,
    multiple: question.kind === 'MULTIPLE',
  };
}

function publicQuiz(row: Record<string, any>) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    kind: row.kind,
    category: row.category ?? null,
    category_slug: row.category_slug ?? null,
    course_id: row.course_id ?? null,
    course_title: row.course_title ?? null,
    duration_minutes: Number(row.duration_minutes ?? 0),
    question_count: Number(row.question_count ?? 0),
    total_marks: toNumber(row.total_marks, 0),
    pass_marks: toNumber(row.pass_marks, 0),
    negative_mark: toNumber(row.negative_mark, 0),
    shuffle_questions: Boolean(row.shuffle_questions),
    show_explanations: Boolean(row.show_explanations),
    max_attempts: Number(row.max_attempts ?? 0),
    is_featured: Boolean(row.is_featured),
    attempts_count: Number(row.attempts_count ?? 0),
    status: row.status,
    published_at: row.published_at,
  };
}

/**
 * Builds the question set for an attempt. Quizzes use their linked questions;
 * model tests may also draw from the shared bank by category up to `question_count`.
 */
async function selectQuestions(quiz: Record<string, any>): Promise<QuestionRow[]> {
  let questions = await all<QuestionRow>(
    `SELECT q.* FROM quiz_questions qq JOIN questions q ON q.id = qq.question_id
      WHERE qq.quiz_id = $1 ORDER BY qq.position`,
    [quiz.id],
  );

  if (!questions.length) {
    questions = await all<QuestionRow>(
      "SELECT * FROM questions WHERE quiz_id = $1 AND status = 'PUBLISHED' ORDER BY position, created_at",
      [quiz.id],
    );
  }

  const wanted = Number(quiz.question_count ?? 0);
  if (quiz.kind === 'MODEL_TEST' && wanted > questions.length && quiz.category_id) {
    const bank = await all<QuestionRow>(
      `SELECT * FROM questions
        WHERE quiz_id IS NULL AND status = 'PUBLISHED' AND category_id = $1 AND difficulty = $2`,
      [quiz.category_id, 'MEDIUM'],
    );
    const anyBank = await all<QuestionRow>(
      "SELECT * FROM questions WHERE quiz_id IS NULL AND status = 'PUBLISHED' AND category_id = $1",
      [quiz.category_id],
    );
    const extra = [...bank, ...anyBank.filter((item) => !bank.some((b) => b.id === item.id))];
    questions = [...questions, ...extra.filter((item) => !questions.some((q) => q.id === item.id))];
  }

  const ordered = quiz.shuffle_questions ? shuffle(questions) : questions;
  return wanted > 0 ? ordered.slice(0, wanted) : ordered;
}

/**
 * Grades an attempt: compares each stored answer with the question's correct
 * answer, applies negative marking, persists the result and notifies the learner.
 * Used by both `/attempts/:id/submit` and `/quizzes/:slug/submit`.
 */
async function submitAttempt(user: SessionUser, attemptId: string, submitted: Record<string, unknown>) {
  const attempt = await one<Record<string, any>>('SELECT * FROM attempts WHERE id = $1', [attemptId]);
  if (!attempt) throw notFound('Attempt not found.');
  if (attempt.user_id !== user.id && user.roleName === 'USER') throw forbidden('This attempt belongs to another learner.');
  if (attempt.status === 'SUBMITTED') throw badRequest('This attempt has already been submitted.');

  const quiz = await one<Record<string, any>>('SELECT * FROM quizzes WHERE id = $1', [attempt.quiz_id]);
  if (!quiz) throw notFound('Quiz not found.');

  const questionIds = fromJson<string[]>(attempt.question_ids, []);
  if (!questionIds.length) throw badRequest('This attempt has no questions.');
  const placeholders = questionIds.map((_, index) => `$${index + 1}`).join(', ');
  const questions = await all<QuestionRow>(`SELECT * FROM questions WHERE id IN (${placeholders})`, questionIds);
  const byId = new Map(questions.map((question) => [question.id, question]));
  const ordered = questionIds.map((id) => byId.get(id)).filter(Boolean) as QuestionRow[];

  const answers: Record<string, unknown> = { ...fromJson<Record<string, unknown>>(attempt.answers, {}), ...submitted };
  const negative = toNumber(quiz.negative_mark, 0);
  const showExplanations = Boolean(quiz.show_explanations);

  let score = 0;
  let total = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let unanswered = 0;
  const review: Record<string, unknown>[] = [];

  for (const question of ordered) {
    const marks = toNumber(question.marks, 1);
    const correct = normalizeCorrect(question.correct);
    const given = normalizeAnswer(answers[question.id]);
    total += marks;

    let isCorrect = false;
    if (!given.length) {
      unanswered += 1;
    } else if (sameAnswer(given, correct)) {
      isCorrect = true;
      correctCount += 1;
      score += marks;
    } else {
      wrongCount += 1;
      score -= negative;
    }

    const options = fromJson<string[]>(question.options, []);
    review.push({
      id: question.id,
      prompt: question.prompt,
      kind: question.kind,
      options,
      your_answer: given.length ? given : null,
      your_answer_text: given.length ? given.map((index) => options[index]).filter(Boolean) : null,
      correct_answer: correct,
      correct_answer_text: correct.map((index) => options[index]).filter(Boolean),
      is_correct: isCorrect,
      marks,
      awarded: isCorrect ? marks : given.length ? -negative : 0,
      difficulty: question.difficulty,
      explanation: showExplanations ? question.explanation : '',
    });
  }

  score = round(Math.max(0, score), 2);
  const pct = round(Math.max(0, percentage(score, total)), 2);
  const passMarks = toNumber(quiz.pass_marks, 0);
  const passed = passMarks > 0 ? score >= passMarks : pct >= 50;
  const secondsSpent = Math.max(0, Math.round((Date.now() - new Date(attempt.started_at).getTime()) / 1000));
  const expired = attempt.expires_at ? new Date(attempt.expires_at).getTime() < Date.now() : false;

  await run(
    `UPDATE attempts
        SET answers = $1, review = $2, score = $3, total = $4, correct_count = $5, wrong_count = $6,
            unanswered_count = $7, percentage = $8, passed = $9, seconds_spent = $10,
            status = 'SUBMITTED', submitted_at = NOW()
      WHERE id = $11`,
    [json(answers), json(review), score, total, correctCount, wrongCount, unanswered, pct, passed, secondsSpent, attempt.id],
  );
  await run('UPDATE quizzes SET attempts_count = attempts_count + 1 WHERE id = $1', [quiz.id]);

  await notify({
    userId: attempt.user_id,
    title: `Quiz result: ${quiz.title}`,
    message: `You scored ${score} of ${total} (${pct}%). ${correctCount} correct, ${wrongCount} wrong, ${unanswered} unanswered.`,
    type: 'QUIZ_RESULT',
    link: `/quiz-results/${attempt.id}`,
  });
  await logActivity({
    actorId: attempt.user_id,
    actorName: user.name,
    action: 'QUIZ_SUBMITTED',
    entityType: 'QUIZ',
    entityId: quiz.id,
    entityLabel: `${quiz.title} — ${pct}%`,
    meta: { score, total, percentage: pct },
  });

  return {
    attempt_id: attempt.id,
    quiz: publicQuiz(quiz),
    score,
    total,
    percentage: pct,
    passed,
    correct_count: correctCount,
    wrong_count: wrongCount,
    unanswered_count: unanswered,
    seconds_spent: secondsSpent,
    time_expired: expired,
    review,
    submitted_at: new Date().toISOString(),
  };
}

// ── Public catalogue ────────────────────────────────────────────────────────

quizRoutes.get(
  '/quizzes',
  route(async (req, res) => {
    const page = pagination(req.query as Record<string, unknown>);
    const term = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const kind = typeof req.query.kind === 'string' && req.query.kind ? req.query.kind.toUpperCase() : null;
    const category = typeof req.query.category === 'string' && req.query.category ? req.query.category : null;
    const courseId = typeof req.query.courseId === 'string' && req.query.courseId ? req.query.courseId : null;

    const where = ["q.status = 'PUBLISHED'"];
    const params: unknown[] = [];
    if (term) {
      params.push(like(term));
      where.push(`(q.title ILIKE $${params.length} OR q.description ILIKE $${params.length})`);
    }
    if (kind) {
      params.push(kind);
      where.push(`q.kind = $${params.length}`);
    }
    if (category) {
      params.push(category);
      where.push(`(cat.slug = $${params.length} OR cat.name ILIKE $${params.length})`);
    }
    if (courseId) {
      params.push(courseId);
      where.push(`(q.course_id = $${params.length} OR c.slug = $${params.length})`);
    }
    const whereSql = where.join(' AND ');

    const total = await one<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM quizzes q
         LEFT JOIN categories cat ON cat.id = q.category_id
         LEFT JOIN courses c ON c.id = q.course_id
        WHERE ${whereSql}`,
      params,
    );
    const rows = await all<Record<string, any>>(
      `SELECT q.*, cat.name AS category, cat.slug AS category_slug, c.title AS course_title
         FROM quizzes q
         LEFT JOIN categories cat ON cat.id = q.category_id
         LEFT JOIN courses c ON c.id = q.course_id
        WHERE ${whereSql}
        ORDER BY q.is_featured DESC, q.published_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, page.limit, page.offset],
    );

    ok(res, paged(rows.map(publicQuiz), page, Number(total?.total ?? 0)));
  }),
);

quizRoutes.get(
  '/quizzes/:slug',
  optionalAuth,
  route(async (req, res) => {
    const slug = param(req.params.slug);
    const quiz = await one<Record<string, any>>(
      `SELECT q.*, cat.name AS category, cat.slug AS category_slug, c.title AS course_title, c.slug AS course_slug
         FROM quizzes q
         LEFT JOIN categories cat ON cat.id = q.category_id
         LEFT JOIN courses c ON c.id = q.course_id
        WHERE q.slug = $1 OR q.id = $1`,
      [slug],
    );
    if (!quiz || (quiz.status !== 'PUBLISHED' && req.user?.roleName === 'USER')) throw notFound('Quiz not found.');

    const questions = await selectQuestions(quiz);
    const attempts = req.user
      ? await all<Record<string, any>>(
          `SELECT id, score, total, percentage, passed, correct_count, wrong_count, unanswered_count, status, started_at, submitted_at
             FROM attempts WHERE user_id = $1 AND quiz_id = $2 ORDER BY started_at DESC`,
          [req.user.id, quiz.id],
        )
      : [];

    const submitted = attempts.filter((attempt) => attempt.status === 'SUBMITTED');
    const maxAttempts = Number(quiz.max_attempts ?? 0);

    ok(res, {
      ...publicQuiz(quiz),
      course_slug: quiz.course_slug ?? null,
      available_questions: questions.length,
      total_marks: questions.length ? round(questions.reduce((sum, question) => sum + toNumber(question.marks, 1), 0), 2) : toNumber(quiz.total_marks, 0),
      attempts_left: maxAttempts > 0 ? Math.max(0, maxAttempts - submitted.length) : null,
      my_attempts: attempts,
      best_percentage: submitted.length ? Math.max(...submitted.map((attempt) => Number(attempt.percentage ?? 0))) : 0,
    });
  }),
);

// ── Attempt lifecycle ───────────────────────────────────────────────────────

quizRoutes.post(
  '/quizzes/:slug/start',
  authenticate,
  route(async (req, res) => {
    const slug = param(req.params.slug);
    const quiz = await one<Record<string, any>>('SELECT * FROM quizzes WHERE slug = $1 OR id = $1', [slug]);
    if (!quiz) throw notFound('Quiz not found.');
    if (quiz.status !== 'PUBLISHED' && req.user!.roleName === 'USER') throw forbidden('This quiz is not published yet.');

    const maxAttempts = Number(quiz.max_attempts ?? 0);
    if (maxAttempts > 0) {
      const used = await count('attempts', "user_id = $1 AND quiz_id = $2 AND status = 'SUBMITTED'", [req.user!.id, quiz.id]);
      if (used >= maxAttempts) throw forbidden(`You have used all ${maxAttempts} allowed attempts for this quiz.`);
    }

    // Resume an unfinished attempt instead of creating duplicates.
    const open = await one<Record<string, any>>(
      "SELECT * FROM attempts WHERE user_id = $1 AND quiz_id = $2 AND status = 'IN_PROGRESS' ORDER BY started_at DESC",
      [req.user!.id, quiz.id],
    );

    const questions = await selectQuestions(quiz);
    if (!questions.length) throw badRequest('This quiz has no published questions yet.');

    const durationMinutes = Number(quiz.duration_minutes ?? 0);
    if (open) {
      const expiresAt = open.expires_at ? new Date(open.expires_at) : null;
      const expired = expiresAt ? expiresAt.getTime() < Date.now() : false;
      if (!expired) {
        const ids = fromJson<string[]>(open.question_ids, questions.map((question) => question.id));
        const selected = questions.filter((question) => ids.includes(question.id));
        const ordered = ids.map((id) => selected.find((question) => question.id === id)).filter(Boolean) as QuestionRow[];
        return ok(res, {
          attempt_id: open.id,
          resumed: true,
          quiz: publicQuiz(quiz),
          expires_at: open.expires_at,
          seconds_remaining: expiresAt ? Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 1000)) : null,
          saved_answers: fromJson<Record<string, unknown>>(open.answers, {}),
          questions: ordered.map(publicQuestion),
        });
      }
    }

    const id = newId();
    const expiresAt = durationMinutes > 0 ? new Date(Date.now() + durationMinutes * 60_000).toISOString() : null;
    await insert('attempts', {
      id,
      quiz_id: quiz.id,
      user_id: req.user!.id,
      question_ids: json(questions.map((question) => question.id)),
      answers: json({}),
      status: 'IN_PROGRESS',
      started_at: new Date().toISOString(),
      expires_at: expiresAt,
    });

    ok(
      res,
      {
        attempt_id: id,
        resumed: false,
        quiz: publicQuiz(quiz),
        expires_at: expiresAt,
        seconds_remaining: durationMinutes > 0 ? durationMinutes * 60 : null,
        saved_answers: {},
        questions: questions.map(publicQuestion),
      },
      201,
    );
  }),
);

/** Autosave — timed model tests keep partial answers if the browser closes. */
quizRoutes.post(
  '/attempts/:id/answers',
  authenticate,
  route(async (req, res) => {
    const data = parse(z.object({ answers: z.record(z.string(), z.union([z.number(), z.array(z.number()), z.boolean(), z.null()])) }), req.body);
    const attempt = await one<Record<string, any>>('SELECT * FROM attempts WHERE id = $1', [param(req.params.id)]);
    if (!attempt) throw notFound('Attempt not found.');
    if (attempt.user_id !== req.user!.id && req.user!.roleName === 'USER') throw forbidden('This attempt belongs to another learner.');
    if (attempt.status === 'SUBMITTED') throw badRequest('This attempt has already been submitted.');

    const merged = { ...fromJson<Record<string, unknown>>(attempt.answers, {}), ...data.answers };
    await run('UPDATE attempts SET answers = $1 WHERE id = $2', [json(merged), attempt.id]);
    ok(res, { saved: true, answered: Object.keys(merged).filter((key) => merged[key] !== null).length });
  }),
);

quizRoutes.post(
  '/attempts/:id/submit',
  authenticate,
  route(async (req, res) => {
    const data = parse(
      z.object({ answers: z.record(z.string(), z.union([z.number(), z.array(z.number()), z.boolean(), z.null()])).optional() }),
      req.body ?? {},
    );
    ok(res, await submitAttempt(req.user!, param(req.params.id), data.answers ?? {}));
  }),
);

/** Convenience alias: submit the learner's in-progress attempt for a quiz without knowing the attempt id. */
quizRoutes.post(
  '/quizzes/:slug/submit',
  authenticate,
  route(async (req, res) => {
    const data = parse(
      z.object({ answers: z.record(z.string(), z.union([z.number(), z.array(z.number()), z.boolean(), z.null()])).optional() }),
      req.body ?? {},
    );
    const quiz = await one<{ id: string }>('SELECT id FROM quizzes WHERE slug = $1 OR id = $1', [param(req.params.slug)]);
    if (!quiz) throw notFound('Quiz not found.');

    const attempt = await one<Record<string, any>>(
      "SELECT id FROM attempts WHERE quiz_id = $1 AND user_id = $2 AND status = 'IN_PROGRESS' ORDER BY started_at DESC",
      [quiz.id, req.user!.id],
    );
    if (!attempt) throw notFound('No attempt is in progress. Start the quiz first.');
    ok(res, await submitAttempt(req.user!, attempt.id, data.answers ?? {}));
  }),
);

quizRoutes.get(
  '/attempts',
  authenticate,
  route(async (req, res) => {
    const page = pagination(req.query as Record<string, unknown>, 10, 50);
    const scope = req.query.scope === 'all' && req.user!.roleName !== 'USER';
    const total = await one<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM attempts a${scope ? '' : ' WHERE a.user_id = $1'}`,
      scope ? [] : [req.user!.id],
    );
    const rows = await all<Record<string, any>>(
      `SELECT a.id, a.score, a.total, a.percentage, a.passed, a.correct_count, a.wrong_count, a.unanswered_count,
              a.status, a.started_at, a.submitted_at, a.seconds_spent, q.title AS quiz_title, q.slug AS quiz_slug,
              q.kind AS quiz_kind, u.name AS learner
         FROM attempts a
         JOIN quizzes q ON q.id = a.quiz_id
         JOIN users u ON u.id = a.user_id
        ${scope ? '' : 'WHERE a.user_id = $1'}
        ORDER BY a.started_at DESC
        LIMIT $${scope ? 1 : 2} OFFSET $${scope ? 2 : 3}`,
      scope ? [page.limit, page.offset] : [req.user!.id, page.limit, page.offset],
    );
    ok(res, paged(rows, page, Number(total?.total ?? 0)));
  }),
);

quizRoutes.get(
  '/attempts/:id',
  authenticate,
  route(async (req, res) => {
    const attempt = await one<Record<string, any>>(
      `SELECT a.*, q.title AS quiz_title, q.slug AS quiz_slug, q.kind AS quiz_kind, q.show_explanations,
              u.name AS learner, u.email AS learner_email
         FROM attempts a
         JOIN quizzes q ON q.id = a.quiz_id
         JOIN users u ON u.id = a.user_id
        WHERE a.id = $1`,
      [param(req.params.id)],
    );
    if (!attempt) throw notFound('Attempt not found.');
    if (attempt.user_id !== req.user!.id && req.user!.roleName === 'USER') throw forbidden('This attempt belongs to another learner.');

    const review = fromJson<Record<string, any>[]>(attempt.review, []);
    ok(res, {
      ...attempt,
      review: Boolean(attempt.show_explanations)
        ? review
        : review.map((item) => ({ ...item, explanation: '', correct_answer: undefined, correct_answer_text: undefined })),
      answers: fromJson(attempt.answers, {}),
      question_ids: fromJson(attempt.question_ids, []),
    });
  }),
);
