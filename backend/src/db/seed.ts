import bcrypt from 'bcryptjs';
import { config } from '../config.ts';
import { logger } from '../lib/logger.ts';
import { json, newId, readingMinutes, slugify } from '../lib/util.ts';
import { sanitizeRichText } from '../lib/sanitize.ts';
import { all, count, insert, one, run } from './index.ts';
import { PERMISSIONS, ROLES, SECTIONS } from './taxonomy.ts';
import { SEED_COURSES, SEED_QUIZZES } from './seed-library.ts';
import { SEED_BOOKS, SEED_CONTENT } from './seed-editorial.ts';
import { SCHEMA_VERSION, schema } from './schema.ts';

export const DEFAULT_SETTINGS: Record<string, { value: unknown; isPublic: boolean }> = {
  site: {
    isPublic: true,
    value: {
      name: config.site.name,
      tagline: config.site.tagline,
      positioning: 'A Learning & Knowledge Platform for Education, Ideas and Humanity.',
      email: 'hello@thinktankacademia.org',
      contactEmail: 'contact@thinktankacademia.org',
      address: '',
      social: { facebook: '', youtube: '', x: '', linkedin: '' },
      footerNote: 'Learn • Think • Understand • Unite',
    },
  },
  homepage: {
    isPublic: true,
    value: {
      heroEyebrow: 'MULTIDISCIPLINARY LEARNING',
      heroTitle: 'Learn. Think.',
      heroTitleAccent: 'Understand. Unite.',
      heroText: 'A multidisciplinary learning and knowledge platform for education, ideas, and humanity.',
      primaryCta: { label: 'Start Learning', href: '/courses' },
      secondaryCta: { label: 'Explore Knowledge', href: '/knowledge' },
      quote: {
        text: 'Education is not the learning of facts, but the training of the mind to think.',
        attribution: 'Attributed to Albert Einstein',
      },
      sections: [
        { key: 'featuredCourses', enabled: true },
        { key: 'jobPrep', enabled: true },
        { key: 'academic', enabled: true },
        { key: 'books', enabled: true },
        { key: 'knowledge', enabled: true },
        { key: 'world', enabled: true },
        { key: 'humanity', enabled: true },
        { key: 'society', enabled: true },
        { key: 'articles', enabled: true },
        { key: 'popularCourses', enabled: true },
        { key: 'quizzes', enabled: true },
        { key: 'resources', enabled: true },
        { key: 'newsletter', enabled: true },
      ],
    },
  },
  navigation: {
    isPublic: true,
    value: {
      primary: [
        { label: 'Courses', href: '/courses' },
        { label: 'Job Prep', href: '/job-prep' },
        { label: 'Academic', href: '/academic' },
        { label: 'Books', href: '/books' },
        { label: 'Knowledge', href: '/knowledge' },
        { label: 'World', href: '/world' },
        { label: 'Humanity', href: '/humanity' },
        { label: 'Society', href: '/society' },
        { label: 'Quizzes', href: '/quizzes' },
        { label: 'Articles', href: '/articles' },
      ],
      footerExplore: [
        { label: 'Courses', href: '/courses' },
        { label: 'Quizzes & Model Tests', href: '/quizzes' },
        { label: 'Articles', href: '/articles' },
        { label: 'Books & Ideas', href: '/books' },
        { label: 'Search', href: '/search' },
      ],
      footerSections: [
        { label: 'Job Preparation', href: '/job-prep' },
        { label: 'Academic Learning', href: '/academic' },
        { label: 'General Knowledge', href: '/knowledge' },
        { label: 'World Affairs', href: '/world' },
        { label: 'Humanity', href: '/humanity' },
        { label: 'Society & Unity', href: '/society' },
      ],
      footerOrganization: [
        { label: 'About', href: '/about' },
        { label: 'Contact', href: '/contact' },
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Terms of Service', href: '/terms' },
      ],
    },
  },
  announcement: {
    isPublic: true,
    value: { enabled: false, level: 'INFO', text: '', link: '' },
  },
  seo: {
    isPublic: true,
    value: {
      title: 'ThinkTank Academia — Learn • Think • Understand • Unite',
      description:
        'A multidisciplinary learning and knowledge platform for education, ideas and humanity: courses, job preparation, books, general knowledge, world affairs, quizzes and articles.',
      keywords: 'learning, courses, job preparation, general knowledge, geopolitics, books, quizzes, model test',
      ogImage: '/icon-512.png',
    },
  },
};

async function seedRoles(): Promise<Record<string, string>> {
  const roleIds: Record<string, string> = {};
  for (const role of ROLES) {
    const existing = await one<{ id: string }>('SELECT id FROM roles WHERE name = $1', [role.name]);
    if (existing) {
      roleIds[role.name] = existing.id;
      await run('UPDATE roles SET label = $1, description = $2, level = $3 WHERE id = $4', [
        role.label,
        role.description,
        role.level,
        existing.id,
      ]);
    } else {
      const id = newId();
      await insert('roles', { id, name: role.name, label: role.label, description: role.description, level: role.level, is_system: true });
      roleIds[role.name] = id;
    }
  }

  for (const permission of PERMISSIONS) {
    const existing = await one<{ id: string }>('SELECT id FROM permissions WHERE id = $1', [permission.id]);
    if (!existing) {
      await insert('permissions', { id: permission.id, label: permission.label, description: permission.description, grp: permission.group });
    } else {
      await run('UPDATE permissions SET label = $1, description = $2, grp = $3 WHERE id = $4', [
        permission.label,
        permission.description,
        permission.group,
        permission.id,
      ]);
    }
  }

  const allPermissionIds = PERMISSIONS.map((permission) => permission.id);
  for (const role of ROLES) {
    const wanted = role.permissions === 'ALL' ? allPermissionIds : role.permissions;
    const granted = (await all<{ permission_id: string }>('SELECT permission_id FROM role_permissions WHERE role_id = $1', [roleIds[role.name]])).map(
      (row) => row.permission_id,
    );
    for (const permissionId of wanted) {
      if (!granted.includes(permissionId)) {
        await run('INSERT INTO role_permissions(role_id, permission_id) VALUES($1, $2) ON CONFLICT (role_id, permission_id) DO NOTHING', [
          roleIds[role.name],
          permissionId,
        ]);
      }
    }
    for (const permissionId of granted) {
      if (!wanted.includes(permissionId)) {
        await run('DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2', [roleIds[role.name], permissionId]);
      }
    }
  }
  return roleIds;
}

async function seedCategories(): Promise<Record<string, string>> {
  const ids: Record<string, string> = {};
  let position = 0;
  for (const section of SECTIONS) {
    for (const category of section.categories) {
      position += 1;
      const existing = await one<{ id: string }>('SELECT id FROM categories WHERE slug = $1', [category.slug]);
      if (existing) {
        ids[category.slug] = existing.id;
        continue;
      }
      const id = `cat-${category.slug}`;
      await insert('categories', {
        id,
        section: section.id,
        name: category.name,
        slug: category.slug,
        description: category.description ?? '',
        position,
        is_active: true,
      });
      ids[category.slug] = id;
    }
  }
  return ids;
}

async function seedSettings(): Promise<void> {
  for (const [key, setting] of Object.entries(DEFAULT_SETTINGS)) {
    const existing = await one<{ key: string }>('SELECT key FROM settings WHERE key = $1', [key]);
    if (!existing) {
      await insert('settings', { key, value: json(setting.value), is_public: setting.isPublic });
    }
  }
  const version = await one<{ key: string }>("SELECT key FROM settings WHERE key = 'schema_version'");
  if (!version) {
    await insert('settings', { key: 'schema_version', value: json({ version: SCHEMA_VERSION }), is_public: false });
  } else {
    await run('UPDATE settings SET value = $1, updated_at = NOW() WHERE key = $2', [json({ version: SCHEMA_VERSION }), 'schema_version']);
  }
}

async function seedLibrary(categoryIds: Record<string, string>): Promise<void> {
  const author = await one<{ id: string; name: string }>(
    "SELECT id, name FROM users WHERE role_id IN (SELECT id FROM roles WHERE name = 'SUPER_ADMIN') ORDER BY created_at",
  );

  // Courses, modules and lessons
  for (const course of SEED_COURSES) {
    const exists = await one<{ id: string }>('SELECT id FROM courses WHERE slug = $1', [course.slug]);
    if (exists) continue;
    const courseId = `course-${course.slug}`;
    const totalMinutes = course.modules.reduce(
      (sum, module) => sum + module.lessons.reduce((lessonSum, lesson) => lessonSum + lesson.minutes, 0),
      0,
    );
    await insert('courses', {
      id: courseId,
      title: course.title,
      slug: course.slug,
      summary: course.summary,
      description: course.description,
      body: sanitizeRichText(`<p>${course.description}</p>`),
      section: course.section,
      category_id: categoryIds[course.category] ?? null,
      instructor_name: course.instructor,
      difficulty: course.difficulty,
      language: 'en',
      duration_minutes: totalMinutes,
      tags: course.tags,
      status: 'PUBLISHED',
      is_featured: Boolean(course.featured),
      seo: json({ title: `${course.title} — ThinkTank Academia`, description: course.summary }),
      published_at: new Date().toISOString(),
    });

    let modulePosition = 0;
    for (const module of course.modules) {
      modulePosition += 1;
      const moduleId = `${courseId}-m${modulePosition}`;
      await insert('modules', { id: moduleId, course_id: courseId, title: module.title, summary: module.summary, position: modulePosition });
      let lessonPosition = 0;
      for (const lesson of module.lessons) {
        lessonPosition += 1;
        await insert('lessons', {
          id: `${moduleId}-l${lessonPosition}`,
          module_id: moduleId,
          title: lesson.title,
          slug: slugify(`${course.slug}-${lesson.title}`),
          summary: lesson.summary,
          content: sanitizeRichText(lesson.content),
          kind: 'TEXT',
          duration_minutes: lesson.minutes,
          position: lessonPosition,
          status: 'PUBLISHED',
          is_preview: modulePosition === 1 && lessonPosition === 1,
        });
      }
    }
  }

  // Quizzes and questions
  for (const quiz of SEED_QUIZZES) {
    const exists = await one<{ id: string }>('SELECT id FROM quizzes WHERE slug = $1', [quiz.slug]);
    if (exists) continue;
    const quizId = `quiz-${quiz.slug}`;
    const course = quiz.course ? await one<{ id: string }>('SELECT id FROM courses WHERE slug = $1', [quiz.course]) : undefined;
    const totalMarks = quiz.questions.reduce((sum, question) => sum + (question.marks ?? 1), 0);
    await insert('quizzes', {
      id: quizId,
      title: quiz.title,
      slug: quiz.slug,
      description: quiz.description,
      kind: quiz.kind,
      course_id: course?.id ?? null,
      category_id: quiz.category ? categoryIds[quiz.category] ?? null : null,
      duration_minutes: quiz.minutes,
      question_count: quiz.questions.length,
      total_marks: totalMarks,
      pass_marks: Math.round(totalMarks * 0.5),
      negative_mark: quiz.negative ?? 0,
      shuffle_questions: quiz.kind !== 'MODEL_TEST',
      show_explanations: true,
      status: 'PUBLISHED',
      is_featured: Boolean(quiz.featured),
      published_at: new Date().toISOString(),
    });

    let position = 0;
    for (const question of quiz.questions) {
      position += 1;
      const questionId = `${quizId}-q${position}`;
      await insert('questions', {
        id: questionId,
        quiz_id: quizId,
        prompt: question.prompt,
        kind: Array.isArray(question.correct) ? 'MULTIPLE' : 'MCQ',
        options: json(question.options),
        correct: json(question.correct),
        explanation: question.explanation,
        marks: question.marks ?? 1,
        difficulty: question.difficulty,
        category_id: question.category ? categoryIds[question.category] ?? null : null,
        source: question.source ?? 'ThinkTank Academia question bank',
        status: 'PUBLISHED',
        position,
      });
      await run('INSERT INTO quiz_questions(quiz_id, question_id, position) VALUES($1, $2, $3) ON CONFLICT (quiz_id, question_id) DO NOTHING', [
        quizId,
        questionId,
        position,
      ]);
    }
  }

  // Editorial content
  for (const item of SEED_CONTENT) {
    const exists = await one<{ id: string }>('SELECT id FROM content WHERE slug = $1', [item.slug]);
    if (exists) continue;
    const body = sanitizeRichText(item.body);
    await insert('content', {
      id: `content-${item.slug}`,
      type: item.type,
      title: item.title,
      slug: item.slug,
      excerpt: item.excerpt,
      body,
      category_id: categoryIds[item.category] ?? null,
      author_id: author?.id ?? null,
      author_name: author?.name ?? 'ThinkTank Editorial',
      stance: item.stance ?? 'ANALYSIS',
      tags: item.tags,
      meta: json(item.meta ?? {}),
      sources: json(item.sources ?? []),
      seo: json({ title: `${item.title} — ThinkTank Academia`, description: item.excerpt }),
      reading_minutes: readingMinutes(body),
      status: 'PUBLISHED',
      is_featured: Boolean(item.featured),
      published_at: new Date().toISOString(),
    });
  }

  // Books
  for (const book of SEED_BOOKS) {
    const exists = await one<{ id: string }>('SELECT id FROM books WHERE slug = $1', [book.slug]);
    if (exists) continue;
    await insert('books', {
      id: `book-${book.slug}`,
      title: book.title,
      slug: book.slug,
      author_name: book.author,
      published_year: book.year,
      pages: book.pages,
      rating: book.rating,
      description: book.description,
      summary: book.summary,
      key_ideas: json(book.keyIdeas),
      lessons: json(book.lessons),
      context: sanitizeRichText(book.context),
      applications: sanitizeRichText(book.applications),
      review: sanitizeRichText(book.review),
      recommendation: sanitizeRichText(book.recommendation),
      category_id: categoryIds[book.category] ?? null,
      author_id: author?.id ?? null,
      tags: book.tags,
      seo: json({ title: `${book.title} by ${book.author} — ThinkTank Academia`, description: book.description }),
      status: 'PUBLISHED',
      is_featured: Boolean(book.featured),
      published_at: new Date().toISOString(),
    });
  }

  // Link related books (same category, up to three)
  const books = await all<{ id: string; slug: string; title: string; category_id: string | null }>('SELECT id, slug, title, category_id FROM books');
  for (const book of books) {
    const related = books.filter((other) => other.id !== book.id && other.category_id === book.category_id).slice(0, 3);
    if (related.length) {
      await run('UPDATE books SET related = $1 WHERE id = $2', [json(related.map((other) => ({ slug: other.slug, title: other.title }))), book.id]);
    }
  }
}

/**
 * Creates the first administrator from ADMIN_EMAIL / ADMIN_PASSWORD.
 * Idempotent: an existing address is never touched, and the password is never logged.
 */
export async function seedAdministrator(roleIds: Record<string, string>): Promise<{ created: boolean; email?: string }> {
  const email = config.admin.email;
  const password = config.admin.password;
  if (!email || !password) {
    logger.warn('admin seed: ADMIN_EMAIL / ADMIN_PASSWORD are not set — no administrator was created');
    return { created: false };
  }
  const existing = await one<{ id: string }>('SELECT id FROM users WHERE email = $1', [email]);
  if (existing) return { created: false, email };

  if (password.length < 8) {
    logger.error('admin seed: ADMIN_PASSWORD is shorter than 8 characters — refusing to create the administrator');
    return { created: false, email };
  }

  const hash = await bcrypt.hash(password, 12);
  await insert('users', {
    id: newId(),
    email,
    password_hash: hash,
    name: config.admin.name,
    role_id: roleIds.SUPER_ADMIN,
    is_active: true,
    email_verified: true,
  });
  await run('INSERT INTO activity_log(id, actor_name, action, entity_type, entity_label) VALUES($1, $2, $3, $4, $5)', [
    newId(),
    'system',
    'ADMIN_SEEDED',
    'USER',
    email,
  ]);
  logger.info('admin seed: initial super administrator created', { email });
  return { created: true, email };
}

export async function applySchema(): Promise<void> {
  for (const statement of schema) {
    await run(statement);
  }
}

/** Runs every idempotent seeding step. Safe to call on every boot. */
export async function seedDatabase(): Promise<void> {
  await applySchema();
  const roleIds = await seedRoles();
  const categoryIds = await seedCategories();
  await seedSettings();
  await seedAdministrator(roleIds);

  if (config.seedDemoContent) {
    const courseCount = await count('courses');
    if (courseCount === 0) {
      await seedLibrary(categoryIds);
      logger.info('seed: starter library created', {
        courses: await count('courses'),
        lessons: await count('lessons'),
        quizzes: await count('quizzes'),
        questions: await count('questions'),
        content: await count('content'),
        books: await count('books'),
      });
    }
  }
}

export { PERMISSIONS, ROLES, SECTIONS };
