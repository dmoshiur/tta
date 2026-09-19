import { z } from 'zod';
import { all, one, run } from '../db/index.ts';
import { ApiError, conflict, notFound } from '../lib/errors.ts';
import { json, ensureSlug, fromJson, fromArray } from '../lib/util.ts';
import { sanitizePlainText, sanitizeRichText } from '../lib/sanitize.ts';
import { SECTIONS } from '../db/taxonomy.ts';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'number'
  | 'select'
  | 'boolean'
  | 'tags'
  | 'json'
  | 'image'
  | 'slug'
  | 'datetime'
  | 'readonly';

export interface FieldOption {
  value: string;
  label: string;
}

export interface Field {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: FieldOption[];
  optionsFrom?: string;
  rows?: number;
  min?: number;
  max?: number;
  step?: number;
  /** Shown in the list table. */
  list?: boolean;
  /** Hidden from the create form (computed on the server). */
  createOnly?: boolean;
  width?: 'half' | 'full' | 'third';
}

export interface ResourceFilter {
  key: string;
  label: string;
  options?: FieldOption[];
  optionsFrom?: string;
}

export interface Resource {
  key: string;
  label: string;
  singular: string;
  group: string;
  table: string;
  permissions: { read: string; write: string; delete: string };
  orderBy: string;
  searchColumns: string[];
  filters: ResourceFilter[];
  fields: Field[];
  /** Base SELECT used for both list and detail (with joins for display names). */
  select: string;
  /** Maps validated input to database column values. */
  toColumns(input: any, existing?: Record<string, any>): Record<string, unknown>;
  /** Shapes a database row for the API/form. */
  fromRow(row: Record<string, any>): Record<string, any>;
  schema: z.ZodType<any>;
  /** Resources that need a parent id when creating. */
  parent?: { key: string; column: string; optionsFrom: string };
  afterSave?: (row: Record<string, any>, action: 'create' | 'update', actor: { id: string; name: string }) => Promise<void>;
}

const STATUSES: FieldOption[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const DIFFICULTIES: FieldOption[] = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
];

const SECTION_OPTIONS: FieldOption[] = SECTIONS.map((section) => ({ value: section.id, label: section.tagline }));

const slugField = (required = false): Field => ({
  key: 'slug',
  label: 'Slug',
  type: 'slug',
  required,
  help: 'Lowercase letters, numbers and hyphens. Generated from the title when left empty.',
  placeholder: 'example-slug',
});

/** Rejects duplicate slugs with a clear 409 so the admin UI can point at the conflict. */
export async function assertUniqueSlug(table: string, slug: string, ignoreId?: string): Promise<void> {
  const existing = await one<{ id: string }>(`SELECT id FROM ${table} WHERE slug = $1`, [slug]);
  if (existing && existing.id !== ignoreId) throw conflict(`The slug "${slug}" is already used by another record.`, 'SLUG_EXISTS');
}

/** Accepts an object or JSON text (SQLite rows) and returns a plain object. */
function parseJsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === 'string') {
    const text = value.trim();
    if (text.startsWith('{')) {
      try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
      } catch {
        /* not JSON — fall through */
      }
    }
  }
  return {};
}

/**
 * Accepts a value that may arrive as a real array (in-memory engines / UI
 * payloads) or as JSON text (SQLite/Turso rows) and returns an array either
 * way. Non-array, non-JSON input yields [].
 */
function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    const text = value.trim();
    if (text.startsWith('[')) {
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        /* not JSON — fall through */
      }
    }
  }
  return [];
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => sanitizePlainText(String(item))).filter(Boolean).slice(0, 20);
  const jsonish = asArray(value);
  if (value !== undefined && value !== null && value !== '' && jsonish.length && typeof value === 'string' && String(value).trim().startsWith('[')) {
    return jsonish.map((item) => sanitizePlainText(String(item))).filter(Boolean).slice(0, 20);
  }
  return String(value ?? '')
    .split(',')
    .map((item) => sanitizePlainText(item))
    .filter(Boolean)
    .slice(0, 20);
}

function normalizeSources(value: unknown): { title: string; url: string }[] {
  const list = asArray(value);
  return list
    .map((item: any) => ({ title: sanitizePlainText(String(item?.title ?? '')), url: String(item?.url ?? '').trim() }))
    .filter((item) => item.title && /^https?:\/\//.test(item.url))
    .slice(0, 30);
}

export const resources: Resource[] = [
  // ── Courses ──────────────────────────────────────────────────────────────
  {
    key: 'courses',
    label: 'Courses',
    singular: 'Course',
    group: 'Learning',
    table: 'courses',
    permissions: { read: 'courses:read', write: 'courses:write', delete: 'courses:delete' },
    orderBy: 'updated_at DESC',
    searchColumns: ['title', 'slug', 'summary', 'instructor_name'],
    filters: [
      { key: 'status', label: 'Status', options: STATUSES },
      { key: 'section', label: 'Section', options: SECTION_OPTIONS },
      { key: 'difficulty', label: 'Difficulty', options: DIFFICULTIES },
      { key: 'category_id', label: 'Category', optionsFrom: 'categories' },
      { key: 'is_featured', label: 'Featured', options: [{ value: 'true', label: 'Featured' }, { value: 'false', label: 'Not featured' }] },
    ],
    select: 'SELECT c.*, cat.name AS category_name FROM courses c LEFT JOIN categories cat ON cat.id = c.category_id',
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true, list: true, width: 'full' },
      slugField(),
      { key: 'summary', label: 'Short summary', type: 'textarea', rows: 2, help: 'One or two sentences shown on cards.', width: 'full' },
      { key: 'description', label: 'Description', type: 'textarea', rows: 4, width: 'full' },
      { key: 'body', label: 'Course overview (rich text)', type: 'richtext', width: 'full' },
      { key: 'section', label: 'Section', type: 'select', options: SECTION_OPTIONS, required: true, list: true, width: 'half' },
      { key: 'category_id', label: 'Category', type: 'select', optionsFrom: 'categories', width: 'half' },
      { key: 'instructor_name', label: 'Instructor', type: 'text', width: 'half' },
      { key: 'instructor_id', label: 'Instructor account', type: 'select', optionsFrom: 'users', help: 'Optional — links the course to a platform user.', width: 'half' },
      { key: 'difficulty', label: 'Difficulty', type: 'select', options: DIFFICULTIES, list: true, width: 'third' },
      { key: 'language', label: 'Language', type: 'text', placeholder: 'en', width: 'third' },
      { key: 'duration_minutes', label: 'Duration (minutes)', type: 'number', min: 0, width: 'third' },
      { key: 'thumbnail_url', label: 'Thumbnail', type: 'image', width: 'half' },
      { key: 'tags', label: 'Tags', type: 'tags', width: 'half' },
      { key: 'status', label: 'Status', type: 'select', options: STATUSES, required: true, list: true, width: 'third' },
      { key: 'is_featured', label: 'Featured on homepage', type: 'boolean', list: true, width: 'third' },
      { key: 'scheduled_at', label: 'Publish at', type: 'datetime', help: 'Used when status is Scheduled.', width: 'third' },
      { key: 'seo_title', label: 'SEO title', type: 'text', width: 'half' },
      { key: 'seo_description', label: 'SEO description', type: 'textarea', rows: 2, width: 'half' },
    ],
    schema: z.object({
      title: z.string().trim().min(3).max(160),
      slug: z.string().trim().max(120).optional(),
      summary: z.string().trim().max(500).optional(),
      description: z.string().trim().max(4000).optional(),
      body: z.string().max(200_000).optional(),
      section: z.string().max(30).optional(),
      category_id: z.string().nullable().optional(),
      instructor_name: z.string().trim().max(120).optional(),
      instructor_id: z.string().nullable().optional(),
      difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
      language: z.string().trim().max(10).optional(),
      duration_minutes: z.number().int().min(0).max(100_000).optional(),
      thumbnail_url: z.string().trim().max(600).nullable().optional(),
      tags: z.union([z.array(z.string()), z.string()]).optional(),
      status: z.enum(['DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED']).optional(),
      is_featured: z.boolean().optional(),
      scheduled_at: z.string().nullable().optional(),
      seo_title: z.string().max(200).optional(),
      seo_description: z.string().max(400).optional(),
    }),
    toColumns(input) {
      return {
        title: sanitizePlainText(input.title),
        summary: sanitizePlainText(input.summary ?? ''),
        description: sanitizePlainText(input.description ?? ''),
        body: sanitizeRichText(input.body ?? ''),
        section: input.section ?? 'GENERAL',
        category_id: input.category_id || null,
        instructor_name: sanitizePlainText(input.instructor_name ?? ''),
        instructor_id: input.instructor_id || null,
        difficulty: input.difficulty ?? 'BEGINNER',
        language: input.language || 'en',
        duration_minutes: input.duration_minutes ?? 0,
        thumbnail_url: input.thumbnail_url || null,
        tags: normalizeTags(input.tags),
        status: input.status ?? 'DRAFT',
        is_featured: Boolean(input.is_featured),
        scheduled_at: input.scheduled_at ? new Date(input.scheduled_at).toISOString() : null,
        seo: json({ title: input.seo_title ?? '', description: input.seo_description ?? '' }),
        updated_at: new Date().toISOString(),
      };
    },
    fromRow(row) {
      const seo = fromJson<Record<string, string>>(row.seo, {});
      return {
        ...row,
        tags: fromArray(row.tags),
        seo_title: seo.title ?? '',
        seo_description: seo.description ?? '',
        category_name: row.category_name ?? null,
      };
    },
    async afterSave(row, action, actor) {
      await run('INSERT INTO activity_log(id, actor_id, actor_name, action, entity_type, entity_id, entity_label) VALUES($1,$2,$3,$4,$5,$6,$7)', [
        cryptoId(),
        actor.id,
        actor.name,
        action === 'create' ? 'COURSE_CREATED' : 'COURSE_UPDATED',
        'COURSE',
        row.id,
        row.title,
      ]);
      if (action === 'create' && row.status === 'PUBLISHED') {
        await run(
          `INSERT INTO notifications(id, user_id, audience, title, message, type, link) VALUES($1, NULL, 'ALL', $2, $3, 'COURSE', $4)`,
          [cryptoId(), `New course: ${row.title}`, row.summary || 'A new course is available on ThinkTank Academia.', `/courses/${row.slug}`],
        );
      }
    },
  },

  // ── Modules ──────────────────────────────────────────────────────────────
  {
    key: 'modules',
    label: 'Modules',
    singular: 'Module',
    group: 'Learning',
    table: 'modules',
    permissions: { read: 'courses:read', write: 'courses:write', delete: 'courses:write' },
    orderBy: 'course_id, position',
    searchColumns: ['title'],
    filters: [{ key: 'course_id', label: 'Course', optionsFrom: 'courses' }],
    select: 'SELECT m.*, c.title AS course_title, c.slug AS course_slug FROM modules m JOIN courses c ON c.id = m.course_id',
    parent: { key: 'course_id', column: 'course_id', optionsFrom: 'courses' },
    fields: [
      { key: 'course_id', label: 'Course', type: 'select', optionsFrom: 'courses', required: true, list: true, width: 'half' },
      { key: 'title', label: 'Module title', type: 'text', required: true, list: true, width: 'half' },
      { key: 'summary', label: 'Summary', type: 'textarea', rows: 2, width: 'full' },
      { key: 'position', label: 'Position', type: 'number', min: 0, list: true, width: 'third' },
    ],
    schema: z.object({
      course_id: z.string().min(1),
      title: z.string().trim().min(2).max(160),
      summary: z.string().trim().max(500).optional(),
      position: z.number().int().min(0).max(999).optional(),
    }),
    toColumns(input) {
      return {
        course_id: input.course_id,
        title: sanitizePlainText(input.title),
        summary: sanitizePlainText(input.summary ?? ''),
        position: input.position ?? 0,
        updated_at: new Date().toISOString(),
      };
    },
    fromRow: (row) => row,
  },

  // ── Lessons ──────────────────────────────────────────────────────────────
  {
    key: 'lessons',
    label: 'Lessons',
    singular: 'Lesson',
    group: 'Learning',
    table: 'lessons',
    permissions: { read: 'courses:read', write: 'courses:write', delete: 'courses:write' },
    orderBy: 'module_id, position',
    searchColumns: ['title', 'summary'],
    filters: [
      { key: 'module_id', label: 'Module', optionsFrom: 'modules' },
      { key: 'status', label: 'Status', options: [{ value: 'DRAFT', label: 'Draft' }, { value: 'PUBLISHED', label: 'Published' }] },
      { key: 'kind', label: 'Type', options: [{ value: 'TEXT', label: 'Text' }, { value: 'VIDEO', label: 'Video' }, { value: 'QUIZ', label: 'Quiz' }] },
    ],
    select:
      'SELECT l.*, m.title AS module_title, c.id AS course_id, c.title AS course_title, c.slug AS course_slug FROM lessons l JOIN modules m ON m.id = l.module_id JOIN courses c ON c.id = m.course_id',
    parent: { key: 'module_id', column: 'module_id', optionsFrom: 'modules' },
    fields: [
      { key: 'module_id', label: 'Module', type: 'select', optionsFrom: 'modules', required: true, list: true, width: 'half' },
      { key: 'title', label: 'Lesson title', type: 'text', required: true, list: true, width: 'half' },
      { key: 'slug', label: 'Slug', type: 'slug', width: 'half' },
      { key: 'summary', label: 'Summary', type: 'textarea', rows: 2, width: 'half' },
      { key: 'content', label: 'Lesson content', type: 'richtext', width: 'full' },
      { key: 'kind', label: 'Type', type: 'select', options: [{ value: 'TEXT', label: 'Text' }, { value: 'VIDEO', label: 'Video' }, { value: 'QUIZ', label: 'Quiz' }], width: 'third', list: true },
      { key: 'video_url', label: 'Video URL', type: 'text', placeholder: 'https://…', width: 'third' },
      { key: 'duration_minutes', label: 'Duration (minutes)', type: 'number', min: 0, width: 'third', list: true },
      { key: 'notes', label: 'Downloadable notes (rich text)', type: 'richtext', width: 'full' },
      { key: 'attachments', label: 'Resources', type: 'json', help: 'Array of { title, url } links — lesson resources and downloads.', width: 'full' },
      { key: 'status', label: 'Status', type: 'select', options: [{ value: 'DRAFT', label: 'Draft' }, { value: 'PUBLISHED', label: 'Published' }], list: true, width: 'half' },
      { key: 'is_preview', label: 'Free preview (no enrolment needed)', type: 'boolean', width: 'half' },
      { key: 'position', label: 'Position', type: 'number', min: 0, list: true, width: 'third' },
    ],
    schema: z.object({
      module_id: z.string().min(1),
      title: z.string().trim().min(2).max(200),
      slug: z.string().trim().max(160).optional(),
      summary: z.string().trim().max(500).optional(),
      content: z.string().max(200_000).optional(),
      kind: z.enum(['TEXT', 'VIDEO', 'QUIZ']).optional(),
      video_url: z.string().trim().max(600).nullable().optional(),
      duration_minutes: z.number().int().min(0).max(6000).optional(),
      notes: z.string().max(100_000).optional(),
      attachments: z.any().optional(),
      status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
      is_preview: z.boolean().optional(),
      position: z.number().int().min(0).max(999).optional(),
    }),
    toColumns(input) {
      return {
        module_id: input.module_id,
        title: sanitizePlainText(input.title),
        slug: ensureSlug(input.slug || input.title, 'lesson'),
        summary: sanitizePlainText(input.summary ?? ''),
        content: sanitizeRichText(input.content ?? ''),
        kind: input.kind ?? 'TEXT',
        video_url: input.video_url || null,
        duration_minutes: input.duration_minutes ?? 0,
        notes: sanitizeRichText(input.notes ?? ''),
        attachments: json(normalizeSources(input.attachments)),
        status: input.status ?? 'DRAFT',
        is_preview: Boolean(input.is_preview),
        position: input.position ?? 0,
        updated_at: new Date().toISOString(),
      };
    },
    fromRow: (row) => ({ ...row, attachments: fromJson(row.attachments, []) }),
    async afterSave(row, action, actor) {
      await run('INSERT INTO activity_log(id, actor_id, actor_name, action, entity_type, entity_id, entity_label) VALUES($1,$2,$3,$4,$5,$6,$7)', [
        cryptoId(),
        actor.id,
        actor.name,
        action === 'create' ? 'LESSON_CREATED' : 'LESSON_UPDATED',
        'LESSON',
        row.id,
        row.title,
      ]);
      if (action === 'create' && row.status === 'PUBLISHED') {
        const enrolled = await all<{ user_id: string }>('SELECT user_id FROM enrollments WHERE course_id = $1', [row.course_id]);
        for (const enrollment of enrolled.slice(0, 500)) {
          await run(
            `INSERT INTO notifications(id, user_id, audience, title, message, type, link) VALUES($1,$2,'USER',$3,$4,'LESSON',$5)`,
            [cryptoId(), enrollment.user_id, `New lesson: ${row.title}`, row.summary || `Added to ${row.course_title ?? 'your course'}.`, `/lessons/${row.id}`],
          );
        }
      }
    },
  },

  // ── Assignments ──────────────────────────────────────────────────────────
  {
    key: 'assignments',
    label: 'Assignments',
    singular: 'Assignment',
    group: 'Learning',
    table: 'assignments',
    permissions: { read: 'courses:read', write: 'courses:write', delete: 'courses:write' },
    orderBy: 'course_id, position',
    searchColumns: ['title'],
    filters: [
      { key: 'course_id', label: 'Course', optionsFrom: 'courses' },
      { key: 'status', label: 'Status', options: [{ value: 'DRAFT', label: 'Draft' }, { value: 'PUBLISHED', label: 'Published' }] },
    ],
    select: 'SELECT a.*, c.title AS course_title FROM assignments a JOIN courses c ON c.id = a.course_id',
    parent: { key: 'course_id', column: 'course_id', optionsFrom: 'courses' },
    fields: [
      { key: 'course_id', label: 'Course', type: 'select', optionsFrom: 'courses', required: true, list: true, width: 'half' },
      { key: 'module_id', label: 'Module (optional)', type: 'select', optionsFrom: 'modules', width: 'half' },
      { key: 'title', label: 'Title', type: 'text', required: true, list: true, width: 'full' },
      { key: 'instructions', label: 'Instructions', type: 'richtext', width: 'full' },
      { key: 'points', label: 'Points', type: 'number', min: 0, width: 'third', list: true },
      { key: 'due_at', label: 'Due date', type: 'datetime', width: 'third' },
      { key: 'position', label: 'Position', type: 'number', min: 0, width: 'third' },
      { key: 'status', label: 'Status', type: 'select', options: [{ value: 'DRAFT', label: 'Draft' }, { value: 'PUBLISHED', label: 'Published' }], list: true, width: 'half' },
    ],
    schema: z.object({
      course_id: z.string().min(1),
      module_id: z.string().nullable().optional(),
      title: z.string().trim().min(3).max(200),
      instructions: z.string().max(100_000).optional(),
      points: z.number().int().min(0).max(1000).optional(),
      due_at: z.string().nullable().optional(),
      position: z.number().int().min(0).max(999).optional(),
      status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
    }),
    toColumns(input) {
      return {
        course_id: input.course_id,
        module_id: input.module_id || null,
        title: sanitizePlainText(input.title),
        instructions: sanitizeRichText(input.instructions ?? ''),
        points: input.points ?? 10,
        due_at: input.due_at ? new Date(input.due_at).toISOString() : null,
        position: input.position ?? 0,
        status: input.status ?? 'DRAFT',
        updated_at: new Date().toISOString(),
      };
    },
    fromRow: (row) => row,
  },

  // ── Quizzes ──────────────────────────────────────────────────────────────
  {
    key: 'quizzes',
    label: 'Quizzes & Model Tests',
    singular: 'Quiz',
    group: 'Assessment',
    table: 'quizzes',
    permissions: { read: 'quizzes:read', write: 'quizzes:write', delete: 'quizzes:delete' },
    orderBy: 'updated_at DESC',
    searchColumns: ['title', 'slug', 'description'],
    filters: [
      { key: 'status', label: 'Status', options: [{ value: 'DRAFT', label: 'Draft' }, { value: 'PUBLISHED', label: 'Published' }] },
      { key: 'kind', label: 'Kind', options: [{ value: 'QUIZ', label: 'Quiz' }, { value: 'MCQ', label: 'MCQ set' }, { value: 'MODEL_TEST', label: 'Model test' }] },
      { key: 'category_id', label: 'Category', optionsFrom: 'categories' },
      { key: 'course_id', label: 'Course', optionsFrom: 'courses' },
    ],
    select:
      'SELECT q.*, cat.name AS category_name, c.title AS course_title FROM quizzes q LEFT JOIN categories cat ON cat.id = q.category_id LEFT JOIN courses c ON c.id = q.course_id',
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true, list: true, width: 'full' },
      slugField(),
      { key: 'description', label: 'Description', type: 'textarea', rows: 3, width: 'full' },
      { key: 'kind', label: 'Kind', type: 'select', options: [{ value: 'QUIZ', label: 'Quiz' }, { value: 'MCQ', label: 'MCQ practice set' }, { value: 'MODEL_TEST', label: 'Model test' }], required: true, list: true, width: 'third' },
      { key: 'category_id', label: 'Category', type: 'select', optionsFrom: 'categories', width: 'third' },
      { key: 'course_id', label: 'Course (optional)', type: 'select', optionsFrom: 'courses', width: 'third' },
      { key: 'module_id', label: 'Module (optional)', type: 'select', optionsFrom: 'modules', width: 'third' },
      { key: 'duration_minutes', label: 'Duration (minutes)', type: 'number', min: 0, help: '0 means untimed.', list: true, width: 'third' },
      { key: 'question_count', label: 'Questions to draw', type: 'number', min: 0, help: 'For model tests, how many questions to select.', width: 'third' },
      { key: 'pass_marks', label: 'Pass marks', type: 'number', min: 0, step: 0.5, width: 'third' },
      { key: 'negative_mark', label: 'Negative marking per wrong answer', type: 'number', min: 0, step: 0.25, width: 'third' },
      { key: 'max_attempts', label: 'Maximum attempts', type: 'number', min: 0, help: '0 means unlimited.', width: 'third' },
      { key: 'shuffle_questions', label: 'Randomise question order', type: 'boolean', width: 'half' },
      { key: 'show_explanations', label: 'Show explanations after submit', type: 'boolean', width: 'half' },
      { key: 'status', label: 'Status', type: 'select', options: [{ value: 'DRAFT', label: 'Draft' }, { value: 'PUBLISHED', label: 'Published' }], list: true, width: 'third' },
      { key: 'is_featured', label: 'Featured', type: 'boolean', list: true, width: 'third' },
    ],
    schema: z.object({
      title: z.string().trim().min(3).max(200),
      slug: z.string().trim().max(160).optional(),
      description: z.string().trim().max(2000).optional(),
      kind: z.enum(['QUIZ', 'MCQ', 'MODEL_TEST']).optional(),
      category_id: z.string().nullable().optional(),
      course_id: z.string().nullable().optional(),
      module_id: z.string().nullable().optional(),
      duration_minutes: z.number().int().min(0).max(600).optional(),
      question_count: z.number().int().min(0).max(500).optional(),
      pass_marks: z.number().min(0).max(10_000).optional(),
      negative_mark: z.number().min(0).max(100).optional(),
      max_attempts: z.number().int().min(0).max(100).optional(),
      shuffle_questions: z.boolean().optional(),
      show_explanations: z.boolean().optional(),
      status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
      is_featured: z.boolean().optional(),
    }),
    toColumns(input) {
      return {
        title: sanitizePlainText(input.title),
        description: sanitizePlainText(input.description ?? ''),
        kind: input.kind ?? 'QUIZ',
        category_id: input.category_id || null,
        course_id: input.course_id || null,
        module_id: input.module_id || null,
        duration_minutes: input.duration_minutes ?? 0,
        question_count: input.question_count ?? 0,
        pass_marks: input.pass_marks ?? 0,
        negative_mark: input.negative_mark ?? 0,
        max_attempts: input.max_attempts ?? 0,
        shuffle_questions: input.shuffle_questions ?? true,
        show_explanations: input.show_explanations ?? true,
        status: input.status ?? 'DRAFT',
        is_featured: Boolean(input.is_featured),
        updated_at: new Date().toISOString(),
      };
    },
    fromRow: (row) => row,
  },

  // ── Questions (MCQ bank) ─────────────────────────────────────────────────
  {
    key: 'questions',
    label: 'Questions',
    singular: 'Question',
    group: 'Assessment',
    table: 'questions',
    permissions: { read: 'quizzes:read', write: 'quizzes:write', delete: 'quizzes:write' },
    orderBy: 'quiz_id, position',
    searchColumns: ['prompt', 'explanation', 'source'],
    filters: [
      { key: 'quiz_id', label: 'Quiz', optionsFrom: 'quizzes' },
      { key: 'difficulty', label: 'Difficulty', options: [{ value: 'EASY', label: 'Easy' }, { value: 'MEDIUM', label: 'Medium' }, { value: 'HARD', label: 'Hard' }] },
      { key: 'category_id', label: 'Category', optionsFrom: 'categories' },
      { key: 'kind', label: 'Type', options: [{ value: 'MCQ', label: 'Single answer' }, { value: 'MULTIPLE', label: 'Multiple answers' }, { value: 'TRUE_FALSE', label: 'True / false' }] },
    ],
    select:
      'SELECT q.*, quiz.title AS quiz_title, quiz.slug AS quiz_slug, cat.name AS category_name FROM questions q LEFT JOIN quizzes quiz ON quiz.id = q.quiz_id LEFT JOIN categories cat ON cat.id = q.category_id',
    fields: [
      { key: 'prompt', label: 'Question', type: 'textarea', rows: 3, required: true, list: true, width: 'full' },
      { key: 'quiz_id', label: 'Quiz', type: 'select', optionsFrom: 'quizzes', help: 'Leave empty to keep the question in the shared bank.', width: 'half' },
      { key: 'category_id', label: 'Category', type: 'select', optionsFrom: 'categories', width: 'half' },
      { key: 'kind', label: 'Type', type: 'select', options: [{ value: 'MCQ', label: 'Single answer' }, { value: 'MULTIPLE', label: 'Multiple answers' }, { value: 'TRUE_FALSE', label: 'True / false' }], list: true, width: 'third' },
      { key: 'difficulty', label: 'Difficulty', type: 'select', options: [{ value: 'EASY', label: 'Easy' }, { value: 'MEDIUM', label: 'Medium' }, { value: 'HARD', label: 'Hard' }], list: true, width: 'third' },
      { key: 'marks', label: 'Marks', type: 'number', min: 0.25, step: 0.25, width: 'third' },
      { key: 'options', label: 'Options', type: 'json', required: true, help: 'List of answer options, e.g. ["Paris","Dhaka","Cairo","Delhi"].', width: 'full' },
      { key: 'correct', label: 'Correct answer', type: 'json', required: true, help: 'Zero-based option index (e.g. 0) or a list of indexes for multiple answers (e.g. [0,2]).', width: 'half' },
      { key: 'explanation', label: 'Explanation', type: 'textarea', rows: 3, width: 'half' },
      { key: 'source', label: 'Source / reference', type: 'text', width: 'half' },
      { key: 'tags', label: 'Tags', type: 'tags', width: 'half' },
      { key: 'position', label: 'Position', type: 'number', min: 0, width: 'third' },
      { key: 'status', label: 'Status', type: 'select', options: [{ value: 'DRAFT', label: 'Draft' }, { value: 'PUBLISHED', label: 'Published' }], list: true, width: 'third' },
    ],
    schema: z.object({
      prompt: z.string().trim().min(3).max(4000),
      quiz_id: z.string().nullable().optional(),
      category_id: z.string().nullable().optional(),
      kind: z.enum(['MCQ', 'MULTIPLE', 'TRUE_FALSE']).optional(),
      difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
      marks: z.number().min(0.25).max(100).optional(),
      options: z.union([z.array(z.string().min(1).max(500)), z.string()]),
      correct: z.union([z.number().int().min(0), z.array(z.number().int().min(0)), z.string()]),
      explanation: z.string().trim().max(4000).optional(),
      source: z.string().trim().max(300).optional(),
      tags: z.union([z.array(z.string()), z.string()]).optional(),
      position: z.number().int().min(0).max(9999).optional(),
      status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
    }),
    toColumns(input) {
      const optionsFromJson = asArray(input.options);
      const options = optionsFromJson.length
        ? optionsFromJson.map((option: unknown) => sanitizePlainText(String(option))).filter(Boolean)
        : String(input.options ?? '')
            .split('\n')
            .map((option) => sanitizePlainText(option))
            .filter(Boolean);
      if (options.length < 2) throw new ApiError(400, 'VALIDATION_ERROR', 'A question needs at least two options.');
      const correctRaw = Array.isArray(input.correct) ? input.correct : asArray(input.correct).length ? asArray(input.correct) : [input.correct];
      const correct = correctRaw.map(Number);
      for (const index of correct) {
        if (!Number.isFinite(index) || index < 0 || index >= options.length) {
          throw new ApiError(400, 'VALIDATION_ERROR', `Correct answer index ${index} is outside the option list (0–${options.length - 1}).`);
        }
      }
      const kind = input.kind === 'TRUE_FALSE' ? 'TRUE_FALSE' : correct.length > 1 ? 'MULTIPLE' : (input.kind ?? 'MCQ');
      return {
        prompt: sanitizePlainText(input.prompt),
        quiz_id: input.quiz_id || null,
        category_id: input.category_id || null,
        kind,
        options: json(kind === 'TRUE_FALSE' && options.length < 2 ? ['True', 'False'] : options),
        correct: json(kind === 'MULTIPLE' ? correct : correct[0]),
        explanation: sanitizePlainText(input.explanation ?? ''),
        marks: input.marks ?? 1,
        difficulty: input.difficulty ?? 'MEDIUM',
        source: sanitizePlainText(input.source ?? ''),
        tags: normalizeTags(input.tags),
        position: input.position ?? 0,
        status: input.status ?? 'PUBLISHED',
        updated_at: new Date().toISOString(),
      };
    },
    fromRow: (row) => ({ ...row, options: fromJson(row.options, []), correct: fromJson(row.correct, 0), tags: fromArray(row.tags) }),
    async afterSave(row, action, actor) {
      if (action === 'create' && row.quiz_id) {
        await run('INSERT INTO quiz_questions(quiz_id, question_id, position) VALUES($1,$2,$3) ON CONFLICT (quiz_id, question_id) DO NOTHING', [
          row.quiz_id,
          row.id,
          row.position ?? 0,
        ]);
        await syncQuizTotals(row.quiz_id);
      }
      if (action === 'update' && row.quiz_id) await syncQuizTotals(row.quiz_id);
    },
  },

  // ── Editorial content ────────────────────────────────────────────────────
  {
    key: 'content',
    label: 'Articles & Sections',
    singular: 'Item',
    group: 'Editorial',
    table: 'content',
    permissions: { read: 'content:read', write: 'content:write', delete: 'content:delete' },
    orderBy: 'updated_at DESC',
    searchColumns: ['title', 'slug', 'excerpt', 'author_name'],
    filters: [
      { key: 'type', label: 'Section', options: [{ value: 'ARTICLE', label: 'Article' }, { value: 'KNOWLEDGE', label: 'Knowledge' }, { value: 'WORLD', label: 'World' }, { value: 'HUMANITY', label: 'Humanity' }, { value: 'SOCIETY', label: 'Society' }] },
      { key: 'status', label: 'Status', options: STATUSES },
      { key: 'stance', label: 'Stance', options: [{ value: 'FACT', label: 'Fact' }, { value: 'ANALYSIS', label: 'Analysis' }, { value: 'OPINION', label: 'Opinion' }] },
      { key: 'category_id', label: 'Category', optionsFrom: 'categories' },
    ],
    select: 'SELECT c.*, cat.name AS category_name, u.name AS author_account FROM content c LEFT JOIN categories cat ON cat.id = c.category_id LEFT JOIN users u ON u.id = c.author_id',
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true, list: true, width: 'full' },
      slugField(),
      { key: 'type', label: 'Section', type: 'select', required: true, list: true, width: 'third', options: [{ value: 'ARTICLE', label: 'Article' }, { value: 'KNOWLEDGE', label: 'Knowledge' }, { value: 'WORLD', label: 'World Affairs' }, { value: 'HUMANITY', label: 'Humanity' }, { value: 'SOCIETY', label: 'Society' }] },
      { key: 'category_id', label: 'Category', type: 'select', optionsFrom: 'categories', width: 'third' },
      { key: 'stance', label: 'Stance', type: 'select', options: [{ value: 'FACT', label: 'Fact' }, { value: 'ANALYSIS', label: 'Analysis' }, { value: 'OPINION', label: 'Opinion' }], help: 'World Affairs items must declare whether they report facts, analyse them, or argue an opinion.', list: true, width: 'third' },
      { key: 'excerpt', label: 'Excerpt', type: 'textarea', rows: 2, width: 'full' },
      { key: 'body', label: 'Body (rich text)', type: 'richtext', required: true, width: 'full' },
      { key: 'cover_url', label: 'Cover image', type: 'image', width: 'half' },
      { key: 'author_name', label: 'Author display name', type: 'text', width: 'half' },
      { key: 'author_id', label: 'Author account', type: 'select', optionsFrom: 'users', width: 'half' },
      { key: 'tags', label: 'Tags', type: 'tags', width: 'half' },
      { key: 'sources', label: 'Sources', type: 'json', help: 'Array of { title, url } references cited in the piece.', width: 'full' },
      { key: 'meta', label: 'Structured fields (World Affairs)', type: 'json', help: 'Optional object: { event, background, causes[], actors[], perspectives[], implications[] }.', width: 'full' },
      { key: 'status', label: 'Status', type: 'select', options: STATUSES, required: true, list: true, width: 'third' },
      { key: 'is_featured', label: 'Featured', type: 'boolean', list: true, width: 'third' },
      { key: 'scheduled_at', label: 'Publish at', type: 'datetime', width: 'third' },
      { key: 'seo_title', label: 'SEO title', type: 'text', width: 'half' },
      { key: 'seo_description', label: 'SEO description', type: 'textarea', rows: 2, width: 'half' },
    ],
    schema: z.object({
      title: z.string().trim().min(3).max(220),
      slug: z.string().trim().max(160).optional(),
      type: z.enum(['ARTICLE', 'KNOWLEDGE', 'WORLD', 'HUMANITY', 'SOCIETY']).optional(),
      category_id: z.string().nullable().optional(),
      stance: z.enum(['FACT', 'ANALYSIS', 'OPINION']).optional(),
      excerpt: z.string().trim().max(600).optional(),
      body: z.string().min(10).max(400_000),
      cover_url: z.string().trim().max(600).nullable().optional(),
      author_name: z.string().trim().max(120).optional(),
      author_id: z.string().nullable().optional(),
      tags: z.union([z.array(z.string()), z.string()]).optional(),
      sources: z.any().optional(),
      meta: z.any().optional(),
      status: z.enum(['DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED']).optional(),
      is_featured: z.boolean().optional(),
      scheduled_at: z.string().nullable().optional(),
      seo_title: z.string().max(200).optional(),
      seo_description: z.string().max(400).optional(),
    }),
    toColumns(input) {
      const body = sanitizeRichText(input.body);
      return {
        title: sanitizePlainText(input.title),
        type: input.type ?? 'ARTICLE',
        category_id: input.category_id || null,
        stance: input.stance ?? 'ANALYSIS',
        excerpt: sanitizePlainText(input.excerpt ?? ''),
        body,
        cover_url: input.cover_url || null,
        author_name: sanitizePlainText(input.author_name ?? ''),
        author_id: input.author_id || null,
        tags: normalizeTags(input.tags),
        sources: json(normalizeSources(input.sources)),
        meta: json(parseJsonObject(input.meta)),
        reading_minutes: Math.max(1, Math.round(body.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length / 220)),
        status: input.status ?? 'DRAFT',
        is_featured: Boolean(input.is_featured),
        scheduled_at: input.scheduled_at ? new Date(input.scheduled_at).toISOString() : null,
        seo: json({ title: input.seo_title ?? '', description: input.seo_description ?? '' }),
        updated_at: new Date().toISOString(),
      };
    },
    fromRow(row) {
      const seo = fromJson<Record<string, string>>(row.seo, {});
      return {
        ...row,
        tags: fromArray(row.tags),
        sources: fromJson(row.sources, []),
        meta: fromJson(row.meta, {}),
        seo_title: seo.title ?? '',
        seo_description: seo.description ?? '',
      };
    },
    async afterSave(row, action, actor) {
      await run('INSERT INTO activity_log(id, actor_id, actor_name, action, entity_type, entity_id, entity_label) VALUES($1,$2,$3,$4,$5,$6,$7)', [
        cryptoId(),
        actor.id,
        actor.name,
        action === 'create' ? 'CONTENT_CREATED' : 'CONTENT_UPDATED',
        'CONTENT',
        row.id,
        row.title,
      ]);
      if (row.status === 'PUBLISHED' && action === 'create') {
        await run(`INSERT INTO notifications(id, user_id, audience, title, message, type, link) VALUES($1, NULL, 'ALL', $2, $3, 'ANNOUNCEMENT', $4)`, [
          cryptoId(),
          `New in ${String(row.type).toLowerCase()}: ${row.title}`,
          row.excerpt || 'A new piece has been published on ThinkTank Academia.',
          `/read/${row.slug}`,
        ]);
      }
    },
  },

  // ── Books ────────────────────────────────────────────────────────────────
  {
    key: 'books',
    label: 'Books',
    singular: 'Book',
    group: 'Editorial',
    table: 'books',
    permissions: { read: 'content:read', write: 'content:write', delete: 'content:delete' },
    orderBy: 'updated_at DESC',
    searchColumns: ['title', 'author_name', 'slug', 'description'],
    filters: [
      { key: 'status', label: 'Status', options: STATUSES },
      { key: 'category_id', label: 'Category', optionsFrom: 'categories' },
      { key: 'is_featured', label: 'Featured', options: [{ value: 'true', label: 'Featured' }, { value: 'false', label: 'Not featured' }] },
    ],
    select: 'SELECT b.*, cat.name AS category_name, u.name AS author_account FROM books b LEFT JOIN categories cat ON cat.id = b.category_id LEFT JOIN users u ON u.id = b.author_id',
    fields: [
      { key: 'title', label: 'Book title', type: 'text', required: true, list: true, width: 'half' },
      { key: 'author_name', label: 'Author', type: 'text', required: true, list: true, width: 'half' },
      slugField(),
      { key: 'published_year', label: 'First published', type: 'number', min: 0, max: 2100, width: 'third' },
      { key: 'pages', label: 'Pages', type: 'number', min: 0, width: 'third' },
      { key: 'rating', label: 'Rating (0–5)', type: 'number', min: 0, max: 5, step: 0.1, list: true, width: 'third' },
      { key: 'cover_url', label: 'Cover image', type: 'image', width: 'half' },
      { key: 'category_id', label: 'Category', type: 'select', optionsFrom: 'categories', width: 'half' },
      { key: 'description', label: 'Short description', type: 'textarea', rows: 2, width: 'full' },
      { key: 'summary', label: 'Summary', type: 'richtext', width: 'full' },
      { key: 'key_ideas', label: 'Key ideas', type: 'json', help: 'Array of { title, detail } objects.', width: 'full' },
      { key: 'lessons', label: 'Important lessons', type: 'json', help: 'Array of short strings.', width: 'full' },
      { key: 'context', label: 'Author & context', type: 'richtext', width: 'full' },
      { key: 'applications', label: 'Practical applications', type: 'richtext', width: 'full' },
      { key: 'review', label: 'Critical review', type: 'richtext', width: 'full' },
      { key: 'recommendation', label: 'Reading recommendations', type: 'richtext', width: 'full' },
      { key: 'related', label: 'Related books', type: 'json', help: 'Array of { slug, title }.', width: 'full' },
      { key: 'sources', label: 'Sources', type: 'json', width: 'full' },
      { key: 'tags', label: 'Tags', type: 'tags', width: 'half' },
      { key: 'status', label: 'Status', type: 'select', options: STATUSES, list: true, width: 'third' },
      { key: 'is_featured', label: 'Featured', type: 'boolean', list: true, width: 'third' },
      { key: 'seo_title', label: 'SEO title', type: 'text', width: 'half' },
      { key: 'seo_description', label: 'SEO description', type: 'textarea', rows: 2, width: 'half' },
    ],
    schema: z.object({
      title: z.string().trim().min(2).max(220),
      author_name: z.string().trim().min(2).max(160),
      slug: z.string().trim().max(160).optional(),
      published_year: z.number().int().min(0).max(2100).nullable().optional(),
      pages: z.number().int().min(0).max(100_000).nullable().optional(),
      rating: z.number().min(0).max(5).optional(),
      cover_url: z.string().trim().max(600).nullable().optional(),
      category_id: z.string().nullable().optional(),
      description: z.string().trim().max(1000).optional(),
      summary: z.string().max(200_000).optional(),
      key_ideas: z.any().optional(),
      lessons: z.any().optional(),
      context: z.string().max(100_000).optional(),
      applications: z.string().max(100_000).optional(),
      review: z.string().max(100_000).optional(),
      recommendation: z.string().max(100_000).optional(),
      related: z.any().optional(),
      sources: z.any().optional(),
      tags: z.union([z.array(z.string()), z.string()]).optional(),
      status: z.enum(['DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED']).optional(),
      is_featured: z.boolean().optional(),
      seo_title: z.string().max(200).optional(),
      seo_description: z.string().max(400).optional(),
    }),
    toColumns(input) {
      const keyIdeas = asArray(input.key_ideas)
        .map((idea: any) => ({ title: sanitizePlainText(String(idea?.title ?? '')), detail: sanitizePlainText(String(idea?.detail ?? '')) })).filter((idea: any) => idea.title);
      const lessonsList = asArray(input.lessons);
      const lessons = lessonsList.length
        ? lessonsList.map((lesson: unknown) => sanitizePlainText(String(lesson))).filter(Boolean)
        : String(input.lessons ?? '')
            .split('\n')
            .map((lesson) => sanitizePlainText(lesson))
            .filter(Boolean);
      return {
        title: sanitizePlainText(input.title),
        author_name: sanitizePlainText(input.author_name),
        published_year: input.published_year || null,
        pages: input.pages || null,
        rating: input.rating ?? 0,
        cover_url: input.cover_url || null,
        category_id: input.category_id || null,
        description: sanitizePlainText(input.description ?? ''),
        summary: sanitizeRichText(input.summary ?? ''),
        key_ideas: json(keyIdeas),
        lessons: json(lessons),
        context: sanitizeRichText(input.context ?? ''),
        applications: sanitizeRichText(input.applications ?? ''),
        review: sanitizeRichText(input.review ?? ''),
        recommendation: sanitizeRichText(input.recommendation ?? ''),
        related: json(asArray(input.related)),
        sources: json(normalizeSources(input.sources)),
        tags: normalizeTags(input.tags),
        status: input.status ?? 'DRAFT',
        is_featured: Boolean(input.is_featured),
        seo: json({ title: input.seo_title ?? '', description: input.seo_description ?? '' }),
        updated_at: new Date().toISOString(),
      };
    },
    fromRow(row) {
      const seo = fromJson<Record<string, string>>(row.seo, {});
      return {
        ...row,
        key_ideas: fromJson(row.key_ideas, []),
        lessons: fromJson(row.lessons, []),
        related: fromJson(row.related, []),
        sources: fromJson(row.sources, []),
        tags: fromArray(row.tags),
        seo_title: seo.title ?? '',
        seo_description: seo.description ?? '',
      };
    },
  },

  // ── Categories ───────────────────────────────────────────────────────────
  {
    key: 'categories',
    label: 'Categories',
    singular: 'Category',
    group: 'Editorial',
    table: 'categories',
    permissions: { read: 'content:read', write: 'categories:write', delete: 'categories:write' },
    orderBy: 'section, position, name',
    searchColumns: ['name', 'slug', 'description'],
    filters: [{ key: 'section', label: 'Section', options: SECTION_OPTIONS }],
    select: 'SELECT * FROM categories',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true, list: true, width: 'half' },
      slugField(true),
      { key: 'section', label: 'Section', type: 'select', options: SECTION_OPTIONS, required: true, list: true, width: 'half' },
      { key: 'description', label: 'Description', type: 'textarea', rows: 2, width: 'full' },
      { key: 'icon', label: 'Icon (emoji or short label)', type: 'text', width: 'third' },
      { key: 'position', label: 'Position', type: 'number', min: 0, list: true, width: 'third' },
      { key: 'is_active', label: 'Active', type: 'boolean', list: true, width: 'third' },
    ],
    schema: z.object({
      name: z.string().trim().min(2).max(120),
      slug: z.string().trim().min(2).max(120),
      section: z.string().min(2).max(30),
      description: z.string().trim().max(600).optional(),
      icon: z.string().trim().max(16).optional(),
      position: z.number().int().min(0).max(9999).optional(),
      is_active: z.boolean().optional(),
    }),
    toColumns(input) {
      return {
        name: sanitizePlainText(input.name),
        section: input.section,
        description: sanitizePlainText(input.description ?? ''),
        icon: sanitizePlainText(input.icon ?? ''),
        position: input.position ?? 0,
        is_active: input.is_active ?? true,
      };
    },
    fromRow: (row) => row,
  },

  // ── Media library ────────────────────────────────────────────────────────
  {
    key: 'media',
    label: 'Media Library',
    singular: 'File',
    group: 'Operations',
    table: 'media',
    permissions: { read: 'media:write', write: 'media:write', delete: 'media:write' },
    orderBy: 'created_at DESC',
    searchColumns: ['original_name', 'alt', 'folder'],
    filters: [{ key: 'folder', label: 'Folder', options: ['avatars', 'courses', 'lessons', 'articles', 'books', 'logos', 'general'].map((value) => ({ value, label: value })) }],
    select: 'SELECT m.*, u.name AS uploader FROM media m LEFT JOIN users u ON u.id = m.uploaded_by',
    fields: [
      { key: 'url', label: 'URL', type: 'readonly', list: true, width: 'full' },
      { key: 'alt', label: 'Alt text', type: 'text', width: 'half' },
      { key: 'folder', label: 'Folder', type: 'select', options: ['avatars', 'courses', 'lessons', 'articles', 'books', 'logos', 'general'].map((value) => ({ value, label: value })), list: true, width: 'third' },
      { key: 'bytes', label: 'Size (bytes)', type: 'readonly', list: true, width: 'third' },
      { key: 'original_name', label: 'Original file name', type: 'readonly', list: true, width: 'half' },
      { key: 'mime', label: 'MIME type', type: 'readonly', list: true, width: 'half' },
    ],
    schema: z.object({
      url: z.string().trim().max(600).optional(),
      alt: z.string().trim().max(300).optional(),
      folder: z.string().max(30).optional(),
    }),
    toColumns(input, existing) {
      return {
        alt: sanitizePlainText(input.alt ?? ''),
        folder: input.folder ?? existing?.folder ?? 'general',
        url: input.url ?? existing?.url,
      };
    },
    fromRow: (row) => row,
  },

  // ── Contact messages ─────────────────────────────────────────────────────
  {
    key: 'contacts',
    label: 'Messages',
    singular: 'Message',
    group: 'Operations',
    table: 'contacts',
    permissions: { read: 'contacts:read', write: 'contacts:read', delete: 'contacts:read' },
    orderBy: 'created_at DESC',
    searchColumns: ['name', 'email', 'subject', 'message'],
    filters: [{ key: 'status', label: 'Status', options: [{ value: 'NEW', label: 'New' }, { value: 'READ', label: 'Read' }, { value: 'REPLIED', label: 'Replied' }, { value: 'ARCHIVED', label: 'Archived' }] }],
    select: 'SELECT * FROM contacts',
    fields: [
      { key: 'name', label: 'Name', type: 'readonly', list: true, width: 'third' },
      { key: 'email', label: 'Email', type: 'readonly', list: true, width: 'third' },
      { key: 'subject', label: 'Subject', type: 'readonly', list: true, width: 'third' },
      { key: 'message', label: 'Message', type: 'readonly', width: 'full' },
      { key: 'status', label: 'Status', type: 'select', options: [{ value: 'NEW', label: 'New' }, { value: 'READ', label: 'Read' }, { value: 'REPLIED', label: 'Replied' }, { value: 'ARCHIVED', label: 'Archived' }], list: true, width: 'half' },
      { key: 'created_at', label: 'Received', type: 'readonly', list: true, width: 'half' },
    ],
    schema: z.object({ status: z.enum(['NEW', 'READ', 'REPLIED', 'ARCHIVED']).optional() }),
    toColumns(input, existing) {
      return { status: input.status ?? existing?.status ?? 'NEW' };
    },
    fromRow: (row) => row,
  },

  // ── Newsletter subscribers ───────────────────────────────────────────────
  {
    key: 'subscribers',
    label: 'Newsletter',
    singular: 'Subscriber',
    group: 'Operations',
    table: 'subscribers',
    permissions: { read: 'notifications:send', write: 'notifications:send', delete: 'notifications:send' },
    orderBy: 'created_at DESC',
    searchColumns: ['email'],
    filters: [{ key: 'status', label: 'Status', options: [{ value: 'SUBSCRIBED', label: 'Subscribed' }, { value: 'UNSUBSCRIBED', label: 'Unsubscribed' }] }],
    select: 'SELECT * FROM subscribers',
    fields: [
      { key: 'email', label: 'Email', type: 'readonly', list: true, width: 'half' },
      { key: 'status', label: 'Status', type: 'select', options: [{ value: 'SUBSCRIBED', label: 'Subscribed' }, { value: 'UNSUBSCRIBED', label: 'Unsubscribed' }], list: true, width: 'half' },
      { key: 'created_at', label: 'Subscribed at', type: 'readonly', list: true, width: 'half' },
    ],
    schema: z.object({ status: z.enum(['SUBSCRIBED', 'UNSUBSCRIBED']).optional() }),
    toColumns(input, existing) {
      return { status: input.status ?? existing?.status ?? 'SUBSCRIBED' };
    },
    fromRow: (row) => row,
  },
];

export const resourceMap = new Map(resources.map((resource) => [resource.key, resource]));

export function getResource(key: string): Resource {
  const resource = resourceMap.get(key);
  if (!resource) throw notFound(`Unknown admin resource "${key}".`);
  return resource;
}

function cryptoId(): string {
  // Imported lazily to keep the registry free of Node globals at module scope.
  return globalThis.crypto.randomUUID();
}

/** Recalculates question_count / total_marks for a quiz from its question set. */
export async function syncQuizTotals(quizId: string): Promise<void> {
  if (!quizId) return;
  const questions = await all<{ id: string; marks: unknown }>(
    'SELECT q.id, q.marks FROM questions q JOIN quiz_questions qq ON qq.question_id = q.id WHERE qq.quiz_id = $1',
    [quizId],
  );
  const linked = questions.length
    ? questions
    : await all<{ id: string; marks: unknown }>('SELECT id, marks FROM questions WHERE quiz_id = $1', [quizId]);
  const totalMarks = linked.reduce((sum, question) => sum + Number(question.marks ?? 1), 0);
  await run('UPDATE quizzes SET total_marks = $1, updated_at = NOW() WHERE id = $2 AND question_count = 0', [totalMarks, quizId]);
}

/** Publishes scheduled courses/content whose scheduled_at has passed. */
export async function publishScheduled(): Promise<number> {
  const now = Date.now();
  let published = 0;
  for (const table of ['courses', 'content'] as const) {
    const due = await all<{ id: string; scheduled_at: unknown }>(
      `SELECT id, scheduled_at FROM ${table} WHERE status = 'SCHEDULED' AND scheduled_at IS NOT NULL`,
    );
    for (const row of due) {
      const when = row.scheduled_at ? new Date(String(row.scheduled_at)).getTime() : 0;
      if (when && when <= now) {
        await run(`UPDATE ${table} SET status = 'PUBLISHED', published_at = NOW(), scheduled_at = NULL WHERE id = $1`, [row.id]);
        published += 1;
      }
    }
  }
  return published;
}
