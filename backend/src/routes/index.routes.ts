import { Router, type Request } from 'express';
import { config } from '../config.ts';
import { ok } from '../lib/http.ts';

/**
 * API root & discovery documents.
 *
 *   GET /api        → which API versions exist and where the current one lives
 *   GET /api/v1     → the v1 "front door": base URL, auth scheme, response
 *                     envelope and a catalogue of every public endpoint
 *
 * Before this router existed a request to the API root fell straight through
 * to the JSON 404 handler ("No API route matches GET /v1/."), which made a
 * perfectly healthy deployment look broken to anyone — or any app — opening
 * the base URL. Native clients (the Android app) can now hit the base URL to
 * confirm they are talking to the right service, and developers get a
 * machine-readable map of the API without leaving the browser.
 *
 * Everything here is static metadata: no database access, so the documents
 * are always available and cheap to serve.
 */

export const API_VERSION = 'v1';
export const API_RELEASE = '2.0.0';
export const API_PREFIX = `/api/${API_VERSION}`;

const REPO_DOCS = 'https://github.com/dmoshiur/tta/blob/main/docs';

/** Who may call an endpoint. */
export type EndpointAuth = 'public' | 'optional' | 'user' | 'admin';

export interface EndpointDescriptor {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Path relative to the group's base (which is itself relative to /api/v1). */
  path: string;
  auth: EndpointAuth;
  description: string;
}

export interface EndpointGroup {
  id: string;
  label: string;
  /** Mount point relative to /api/v1 ('' for routers mounted at the root). */
  base: string;
  description: string;
  endpoints: EndpointDescriptor[];
}

const e = (
  method: EndpointDescriptor['method'],
  path: string,
  auth: EndpointAuth,
  description: string,
): EndpointDescriptor => ({ method, path, auth, description });

/**
 * The public endpoint catalogue — the single source of truth surfaced at
 * GET /api/v1. Keep it in sync with the routers in this folder and with
 * docs/API.md. Hidden operational routes (/hackeradmin) are deliberately
 * omitted; the admin CMS is referenced as one group because the mobile app
 * must never call it.
 */
export const API_CATALOG: EndpointGroup[] = [
  {
    id: 'system',
    label: 'System & discovery',
    base: '',
    description: 'Liveness probes and platform metadata. No authentication.',
    endpoints: [
      e('GET', '/health', 'public', 'Liveness probe for the v1 API (also available at /api/health).'),
      e('GET', '/meta', 'public', 'Platform capabilities: sections, content types, quiz kinds, storage & mail status.'),
      e('GET', '/home', 'public', 'Aggregated homepage payload — hero, stats, featured courses, books and quizzes.'),
      e('GET', '/sections', 'public', 'The seven ThinkTank pillars with live counts.'),
      e('GET', '/categories', 'public', 'Category taxonomy (?section= filter) with course counts.'),
      e('GET', '/settings/public', 'public', 'Public site configuration: navigation, footer, announcement banner.'),
      e('GET', '/tags', 'public', 'Tag cloud with usage counts.'),
    ],
  },
  {
    id: 'auth',
    label: 'Authentication',
    base: '/auth',
    description: 'Account creation and JWT issuance. Send the token as "Authorization: Bearer <token>".',
    endpoints: [
      e('POST', '/register', 'public', 'Create a learner account { name, email, password } → { token, user } (201).'),
      e('POST', '/login', 'public', 'Exchange { email, password } for { token, user }.'),
      e('POST', '/logout', 'user', 'End the current session (audit-logged).'),
      e('GET', '/session', 'user', 'Bootstrap payload for a stored token: { user, permissions }.'),
      e('POST', '/forgot-password', 'public', 'Send a password-reset e-mail { email } (non-enumerating).'),
      e('GET', '/reset-password/:token', 'public', 'Validate a reset token and return the associated e-mail.'),
      e('POST', '/reset-password', 'public', 'Set a new password { token, password }.'),
      e('GET', '/roles', 'public', 'List platform roles and permission levels.'),
    ],
  },
  {
    id: 'users',
    label: 'Profile & devices',
    base: '/users',
    description: 'The signed-in learner: profile, password, avatar, push-notification devices.',
    endpoints: [
      e('GET', '/me', 'user', 'Current profile, preferences, role and stats.'),
      e('PATCH', '/me', 'user', 'Update { name?, headline?, bio?, avatar_url?, preferences? }.'),
      e('PATCH', '/me/password', 'user', 'Change password { currentPassword, newPassword }.'),
      e('POST', '/me/avatar', 'user', 'Upload an avatar (multipart field "file").'),
      e('DELETE', '/me/avatar', 'user', 'Remove the avatar.'),
      e('GET', '/me/devices', 'user', 'Registered push-notification device tokens.'),
      e('POST', '/me/devices', 'user', 'Register a device { token, platform: "android" | "ios" | "web" }.'),
      e('DELETE', '/me/devices/:token', 'user', 'Deregister a device token.'),
      e('DELETE', '/me', 'user', 'Permanently delete the account { password }.'),
    ],
  },
  {
    id: 'learning',
    label: 'Courses & learning',
    base: '',
    description: 'Course catalogue, curriculum, enrollment, lessons, assignments and the learner dashboard.',
    endpoints: [
      e('GET', '/courses', 'public', 'Published courses — ?q= ?section= ?category= ?difficulty= ?sort= ?page= ?limit=.'),
      e('GET', '/courses/:slug', 'optional', 'Course detail with modules, lessons, quizzes and (if signed in) progress.'),
      e('POST', '/courses/:id/enroll', 'user', 'Enroll in a course (idempotent).'),
      e('DELETE', '/courses/:id/enroll', 'user', 'Drop the enrollment and clear progress.'),
      e('GET', '/lessons/:id', 'optional', 'Lesson content, media, resources and prev/next links.'),
      e('POST', '/lessons/:id/complete', 'user', 'Mark a lesson complete { secondsSpent? }.'),
      e('DELETE', '/lessons/:id/complete', 'user', 'Un-mark completion.'),
      e('GET', '/assignments', 'optional', 'Assignments for a course (?courseId= required) with your submission state.'),
      e('POST', '/assignments/:id/submit', 'user', 'Submit an assignment { body, attachmentUrl? }.'),
      e('GET', '/dashboard', 'user', 'Learner hub: stats, enrolled courses, continue-learning, recent attempts.'),
    ],
  },
  {
    id: 'quizzes',
    label: 'Quizzes, MCQs & model tests',
    base: '',
    description: 'Timed assessments with autosave, resume, negative marking and answer review.',
    endpoints: [
      e('GET', '/quizzes', 'public', 'Published assessments — ?kind=QUIZ|MCQ|MODEL_TEST ?category= ?q= ?page=.'),
      e('GET', '/quizzes/:slug', 'optional', 'Quiz details, marks, duration, attempt limits and your history.'),
      e('POST', '/quizzes/:slug/start', 'user', 'Start (or resume) an attempt — returns the question set without answers.'),
      e('POST', '/attempts/:id/answers', 'user', 'Autosave answers { answers: { [questionId]: optionIndex } }.'),
      e('POST', '/attempts/:id/submit', 'user', 'Final submission → score, percentage and explanations.'),
      e('POST', '/quizzes/:slug/submit', 'user', 'Submit the active attempt for a quiz slug (alias).'),
      e('GET', '/attempts', 'user', 'Your submitted attempts.'),
      e('GET', '/attempts/:id', 'user', 'Full review of one attempt.'),
    ],
  },
  {
    id: 'content',
    label: 'Articles, knowledge & books',
    base: '',
    description: 'Editorial content across Knowledge, World, Humanity and Society, plus the book library.',
    endpoints: [
      e('GET', '/content', 'public', 'Published content — ?type=ARTICLE|KNOWLEDGE|WORLD|HUMANITY|SOCIETY ?stance= ?q= ?page=.'),
      e('GET', '/content/:slug', 'optional', 'Article detail with sources, dossier and related items.'),
      e('GET', '/books', 'public', 'Book summaries — ?q= ?category= ?sort=newest|rating|title ?page=.'),
      e('GET', '/books/:slug', 'optional', 'Book summary, key ideas, lessons and recommendations.'),
    ],
  },
  {
    id: 'discovery',
    label: 'Search, bookmarks & notifications',
    base: '',
    description: 'Cross-platform search, saved items, in-app notifications and engagement endpoints.',
    endpoints: [
      e('GET', '/search', 'public', 'Unified search — ?q= (min 2 chars) ?type= ?page= ?limit=.'),
      e('GET', '/bookmarks', 'user', 'Saved items (?type=COURSE|LESSON|ARTICLE|BOOK|QUIZ|CONTENT).'),
      e('POST', '/bookmarks', 'user', 'Save an item { item_type, item_id, note? }.'),
      e('DELETE', '/bookmarks/:type/:id', 'user', 'Remove a bookmark.'),
      e('GET', '/notifications', 'user', 'Personal & broadcast notifications with unread count.'),
      e('PATCH', '/notifications/:id/read', 'user', 'Mark one notification read.'),
      e('POST', '/notifications/read-all', 'user', 'Mark every notification read.'),
      e('DELETE', '/notifications/:id', 'user', 'Dismiss a notification.'),
      e('POST', '/contact', 'public', 'Contact form { name, email, subject, message } (rate limited).'),
      e('POST', '/newsletter', 'public', 'Subscribe { email }.'),
      e('POST', '/newsletter/unsubscribe', 'public', 'Unsubscribe { email }.'),
      e('POST', '/analytics', 'public', 'First-party telemetry ping { event, path, label? }.'),
    ],
  },
  {
    id: 'media',
    label: 'Media',
    base: '/media',
    description: 'Permanent links for files kept on the Storage Gateway (redirects to a fresh signed URL).',
    endpoints: [
      e('GET', '/:id', 'public', 'Redirect to the file.'),
      e('GET', '/:id/:filename', 'public', 'Same as above with a friendly filename.'),
      e('GET', '/:id/meta', 'public', 'File metadata (name, MIME type, size).'),
    ],
  },
  {
    id: 'admin',
    label: 'Administration (web console only)',
    base: '/admin',
    description:
      'Editorial CMS and operations for administrative roles (SUPER_ADMIN, CONTENT_ADMIN, MODERATOR, ANALYST). ' +
      'Not for use by the mobile app — see docs/API.md §8 for the full list.',
    endpoints: [
      e('GET', '/overview', 'admin', 'Platform statistics.'),
      e('GET', '/resources', 'admin', 'Administrable resource schemas.'),
      e('GET', '/r/:resource', 'admin', 'Paginated resource listing (write/delete/publish variants exist).'),
    ],
  },
];

/** Total number of catalogued endpoints (handy for tests and the document itself). */
export const API_ENDPOINT_COUNT = API_CATALOG.reduce((sum, group) => sum + group.endpoints.length, 0);

/** Public origin of this deployment — PUBLIC_URL when configured, else derived from the request. */
export function publicOrigin(req: Request): string {
  return config.publicUrl || `${req.protocol}://${req.get('host')}`;
}

/** Builds the GET /api/v1 discovery document. */
export function buildApiIndex(req: Request) {
  const origin = publicOrigin(req);
  const baseUrl = `${origin}${API_PREFIX}`;

  return {
    name: `${config.site.name} API`,
    service: 'thinktank-academia',
    tagline: config.site.tagline,
    version: API_VERSION,
    release: API_RELEASE,
    status: 'ok',
    env: config.env,
    time: new Date().toISOString(),
    baseUrl,
    links: {
      self: baseUrl,
      health: `${baseUrl}/health`,
      meta: `${baseUrl}/meta`,
      home: `${baseUrl}/home`,
      web: origin,
      docs: `${REPO_DOCS}/API.md`,
      androidGuide: `${REPO_DOCS}/ANDROID-INTEGRATION.md`,
    },
    auth: {
      scheme: 'Bearer',
      header: 'Authorization: Bearer <token>',
      obtainToken: [`POST ${API_PREFIX}/auth/register`, `POST ${API_PREFIX}/auth/login`],
      session: `GET ${API_PREFIX}/auth/session`,
      tokenLifetime: config.jwt.expiresIn,
    },
    envelope: {
      success: { success: true, data: '<payload>' },
      error: { success: false, error: { code: 'ERROR_CODE', message: 'Human-readable message', details: '<optional>' } },
      pagination: { items: '[...]', page: 1, limit: 12, total: 0, pages: 1 },
    },
    rateLimit: { windowMs: config.rateLimit.windowMs, max: config.rateLimit.max },
    authLevels: {
      public: 'No token required.',
      optional: 'Works without a token; returns personalised fields when one is sent.',
      user: 'Requires a learner token.',
      admin: 'Requires an administrative role.',
    },
    totalEndpoints: API_ENDPOINT_COUNT,
    groups: API_CATALOG.map((group) => ({
      id: group.id,
      label: group.label,
      description: group.description,
      base: `${API_PREFIX}${group.base}`,
      endpoints: group.endpoints.map((endpoint) => ({
        method: endpoint.method,
        path: `${API_PREFIX}${group.base}${endpoint.path}`,
        auth: endpoint.auth,
        description: endpoint.description,
      })),
    })),
  };
}

/** Builds the GET /api version listing. */
export function buildApiVersions(req: Request) {
  const origin = publicOrigin(req);
  return {
    name: `${config.site.name} API`,
    service: 'thinktank-academia',
    status: 'ok',
    time: new Date().toISOString(),
    latest: API_VERSION,
    versions: [
      {
        version: API_VERSION,
        status: 'current',
        release: API_RELEASE,
        url: `${origin}${API_PREFIX}`,
        health: `${origin}${API_PREFIX}/health`,
      },
    ],
    health: `${origin}/api/health`,
    docs: `${REPO_DOCS}/API.md`,
  };
}

export const apiIndexRoutes = Router();

// GET /api — version listing
apiIndexRoutes.get('/', (req, res) => {
  ok(res, buildApiVersions(req));
});

// GET /api/v1 — discovery document (Express' non-strict routing also matches /api/v1/)
apiIndexRoutes.get(`/${API_VERSION}`, (req, res) => {
  ok(res, buildApiIndex(req));
});
