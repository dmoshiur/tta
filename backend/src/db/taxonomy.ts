/**
 * The platform taxonomy: roles, permissions and the category tree for every
 * ThinkTank section. These are seeded on first boot and then managed through
 * the admin panel (roles and permissions remain editable at runtime).
 */

export interface PermissionDefinition {
  id: string;
  label: string;
  group: string;
  description: string;
}

export const PERMISSIONS: PermissionDefinition[] = [
  { id: 'users:read', label: 'View users', group: 'People', description: 'List and inspect user accounts.' },
  { id: 'users:write', label: 'Manage users', group: 'People', description: 'Create, edit, suspend and assign roles.' },
  { id: 'users:delete', label: 'Delete users', group: 'People', description: 'Permanently remove user accounts.' },
  { id: 'roles:read', label: 'View roles', group: 'People', description: 'Inspect roles and permissions.' },
  { id: 'roles:write', label: 'Manage roles', group: 'People', description: 'Edit which permissions each role holds.' },
  { id: 'courses:read', label: 'View courses', group: 'Learning', description: 'Read courses, modules and lessons including drafts.' },
  { id: 'courses:write', label: 'Manage courses', group: 'Learning', description: 'Create and edit courses, modules, lessons and assignments.' },
  { id: 'courses:delete', label: 'Delete courses', group: 'Learning', description: 'Remove courses and their children.' },
  { id: 'quizzes:read', label: 'View quizzes', group: 'Learning', description: 'Read quizzes, questions and attempts.' },
  { id: 'quizzes:write', label: 'Manage quizzes', group: 'Learning', description: 'Create and edit quizzes, MCQs and model tests.' },
  { id: 'quizzes:delete', label: 'Delete quizzes', group: 'Learning', description: 'Remove quizzes and questions.' },
  { id: 'content:read', label: 'View content', group: 'Editorial', description: 'Read articles, books and section content including drafts.' },
  { id: 'content:write', label: 'Manage content', group: 'Editorial', description: 'Create and edit articles, books, knowledge, world, humanity and society items.' },
  { id: 'content:delete', label: 'Delete content', group: 'Editorial', description: 'Remove editorial content.' },
  { id: 'content:publish', label: 'Publish content', group: 'Editorial', description: 'Move content between draft, scheduled and published states.' },
  { id: 'categories:write', label: 'Manage categories', group: 'Editorial', description: 'Create and edit the category tree.' },
  { id: 'media:write', label: 'Upload media', group: 'Editorial', description: 'Upload images, documents and lesson resources.' },
  { id: 'notifications:send', label: 'Send notifications', group: 'Operations', description: 'Broadcast announcements and target notifications.' },
  { id: 'contacts:read', label: 'View messages', group: 'Operations', description: 'Read contact form submissions.' },
  { id: 'settings:write', label: 'Manage settings', group: 'Operations', description: 'Edit homepage, navigation, footer and site settings.' },
  { id: 'analytics:read', label: 'View analytics', group: 'Operations', description: 'Read platform analytics and reports.' },
  { id: 'moderation:manage', label: 'Moderate', group: 'Operations', description: 'Moderate submissions and flagged content.' },
];

export interface RoleDefinition {
  name: string;
  label: string;
  description: string;
  level: number;
  permissions: string[] | 'ALL';
}

export const ROLES: RoleDefinition[] = [
  {
    name: 'SUPER_ADMIN',
    label: 'Super Admin',
    description: 'Unrestricted access to every part of the platform.',
    level: 5,
    permissions: 'ALL',
  },
  {
    name: 'CONTENT_ADMIN',
    label: 'Content Admin',
    description: 'Owns the library: courses, lessons, quizzes, articles, books and media.',
    level: 4,
    permissions: [
      'courses:read', 'courses:write', 'courses:delete',
      'quizzes:read', 'quizzes:write', 'quizzes:delete',
      'content:read', 'content:write', 'content:delete', 'content:publish',
      'categories:write', 'media:write', 'notifications:send', 'users:read', 'analytics:read',
    ],
  },
  {
    name: 'MODERATOR',
    label: 'Moderator',
    description: 'Reviews submissions, messages and user reports. Cannot delete the library.',
    level: 3,
    permissions: ['content:read', 'courses:read', 'quizzes:read', 'moderation:manage', 'contacts:read', 'users:read', 'media:write'],
  },
  {
    name: 'ANALYST',
    label: 'Analyst',
    description: 'Read-only insight into platform performance and engagement.',
    level: 2,
    permissions: ['analytics:read', 'users:read', 'courses:read', 'content:read', 'quizzes:read'],
  },
  {
    name: 'USER',
    label: 'Learner',
    description: 'Standard learner account.',
    level: 1,
    permissions: [],
  },
];

export const ADMIN_ROLE_NAMES = ROLES.filter((role) => role.name !== 'USER').map((role) => role.name);

export interface CategoryDefinition {
  name: string;
  slug: string;
  description?: string;
}

export interface SectionDefinition {
  id: string;
  label: string;
  tagline: string;
  description: string;
  path: string;
  categories: CategoryDefinition[];
}

/** The seven ThinkTank sections and their category trees, exactly as specified. */
export const SECTIONS: SectionDefinition[] = [
  {
    id: 'JOB_PREP',
    label: 'ThinkTank Job Prep',
    tagline: 'Job Preparation',
    description: 'MCQ practice, model tests, previous questions and exam strategy for competitive recruitment.',
    path: '/job-prep',
    categories: [
      { name: 'MCQ', slug: 'job-mcq', description: 'Multiple choice practice sets with explanations.' },
      { name: 'Model Test', slug: 'job-model-test', description: 'Full-length timed examinations.' },
      { name: 'Previous Questions', slug: 'job-previous-questions', description: 'Past paper analysis and solutions.' },
      { name: 'General Knowledge', slug: 'job-general-knowledge', description: 'National and international general knowledge.' },
      { name: 'Current Affairs', slug: 'job-current-affairs', description: 'Structured review of recent developments.' },
      { name: 'English', slug: 'job-english', description: 'Grammar, vocabulary and comprehension.' },
      { name: 'বাংলা', slug: 'job-bangla', description: 'বাংলা ব্যাকরণ, সাহিত্য ও রচনা।' },
      { name: 'Mathematics', slug: 'job-mathematics', description: 'Arithmetic, algebra and quantitative reasoning.' },
      { name: 'ICT', slug: 'job-ict', description: 'Computer fundamentals, spreadsheets and networks.' },
      { name: 'Analytical Ability', slug: 'job-analytical-ability', description: 'Logic, data interpretation and reasoning.' },
      { name: 'Exam Strategy', slug: 'job-exam-strategy', description: 'Time management and paper-attempt tactics.' },
      { name: 'Study Techniques', slug: 'job-study-techniques', description: 'Revision, recall and note systems.' },
    ],
  },
  {
    id: 'ACADEMIC',
    label: 'ThinkTank Academic',
    tagline: 'Academic Learning',
    description: 'Concept explanations, tutorials, problem solving and structured study resources.',
    path: '/academic',
    categories: [
      { name: 'Concept Explanation', slug: 'academic-concept-explanation', description: 'Clear explanations of foundational ideas.' },
      { name: 'Tutorials', slug: 'academic-tutorials', description: 'Step-by-step guided learning.' },
      { name: 'Problem Solving', slug: 'academic-problem-solving', description: 'Worked examples and method drills.' },
      { name: 'Exam Preparation', slug: 'academic-exam-preparation', description: 'Revision plans and important topics.' },
      { name: 'Important Questions', slug: 'academic-important-questions', description: 'Frequently examined questions.' },
      { name: 'Notes', slug: 'academic-notes', description: 'Concise study notes and summaries.' },
      { name: 'Study Resources', slug: 'academic-study-resources', description: 'Reading lists, worksheets and references.' },
    ],
  },
  {
    id: 'BOOKS',
    label: 'ThinkTank Books',
    tagline: 'Books & Ideas',
    description: 'Book summaries, key ideas, context, practical applications and reading recommendations.',
    path: '/books',
    categories: [
      { name: 'Book Summary', slug: 'books-summary', description: 'Condensed, faithful summaries.' },
      { name: 'Key Ideas', slug: 'books-key-ideas', description: 'The central arguments of a book.' },
      { name: 'Important Lessons', slug: 'books-important-lessons', description: 'Practical takeaways for daily life.' },
      { name: 'Author', slug: 'books-author', description: 'Author biography and intellectual context.' },
      { name: 'Context', slug: 'books-context', description: 'When and why the book was written.' },
      { name: 'Practical Applications', slug: 'books-applications', description: 'How to apply the ideas.' },
      { name: 'Book Review', slug: 'books-review', description: 'Critical assessment, strengths and limits.' },
      { name: 'Reading Recommendations', slug: 'books-recommendations', description: 'What to read next.' },
    ],
  },
  {
    id: 'KNOWLEDGE',
    label: 'ThinkTank Knowledge',
    tagline: 'General Knowledge',
    description: 'History, science, technology, economics, psychology, philosophy and everyday knowledge.',
    path: '/knowledge',
    categories: [
      { name: 'History', slug: 'knowledge-history', description: 'Events, eras and their consequences.' },
      { name: 'Science', slug: 'knowledge-science', description: 'Natural science and how it works.' },
      { name: 'Technology', slug: 'knowledge-technology', description: 'Computing, engineering and innovation.' },
      { name: 'Economics', slug: 'knowledge-economics', description: 'Markets, incentives and policy.' },
      { name: 'Psychology', slug: 'knowledge-psychology', description: 'Mind, behaviour and decision making.' },
      { name: 'Philosophy', slug: 'knowledge-philosophy', description: 'Reasoning about knowledge and value.' },
      { name: 'Culture', slug: 'knowledge-culture', description: 'Language, art, custom and identity.' },
      { name: 'Environment', slug: 'knowledge-environment', description: 'Ecology, climate and sustainability.' },
      { name: 'Society', slug: 'knowledge-society', description: 'Institutions, community and change.' },
      { name: 'Human Behaviour', slug: 'knowledge-human-behaviour', description: 'Why people act as they do.' },
      { name: 'Interesting Facts', slug: 'knowledge-interesting-facts', description: 'Curious, verified facts.' },
      { name: 'Everyday Knowledge', slug: 'knowledge-everyday', description: 'Practical understanding for daily life.' },
    ],
  },
  {
    id: 'WORLD',
    label: 'ThinkTank World',
    tagline: 'World Affairs',
    description: 'International relations, geopolitics, the global economy and diplomacy — sourced and perspective-aware.',
    path: '/world',
    categories: [
      { name: 'International Relations', slug: 'world-international-relations', description: 'How states interact.' },
      { name: 'Geopolitics', slug: 'world-geopolitics', description: 'Geography, power and strategy.' },
      { name: 'Global Economy', slug: 'world-global-economy', description: 'Trade, finance and development.' },
      { name: 'Major Powers', slug: 'world-major-powers', description: 'Capabilities and strategies of leading states.' },
      { name: 'Regional Affairs', slug: 'world-regional-affairs', description: 'Dynamics within world regions.' },
      { name: 'International Organizations', slug: 'world-international-organizations', description: 'UN, IMF, World Bank, WTO and regional bodies.' },
      { name: 'Diplomacy', slug: 'world-diplomacy', description: 'Negotiation, treaties and statecraft.' },
      { name: 'Strategic Affairs', slug: 'world-strategic-affairs', description: 'Security, defence and deterrence.' },
      { name: 'Current World Events', slug: 'world-current-events', description: 'Context for ongoing developments.' },
    ],
  },
  {
    id: 'HUMANITY',
    label: 'ThinkTank Humanity',
    tagline: 'Humanity',
    description: 'Empathy, compassion, dignity, ethics and the human stories behind the ideas.',
    path: '/humanity',
    categories: [
      { name: 'Empathy', slug: 'humanity-empathy', description: 'Understanding others from the inside.' },
      { name: 'Compassion', slug: 'humanity-compassion', description: 'Empathy that acts.' },
      { name: 'Human Dignity', slug: 'humanity-dignity', description: 'Worth that does not depend on usefulness.' },
      { name: 'Ethics', slug: 'humanity-ethics', description: 'Reasoning about right action.' },
      { name: 'Kindness', slug: 'humanity-kindness', description: 'Small acts with large consequences.' },
      { name: 'Social Responsibility', slug: 'humanity-social-responsibility', description: 'Obligations we hold toward each other.' },
      { name: 'Human Stories', slug: 'humanity-stories', description: 'Lived experience and testimony.' },
      { name: 'Moral Questions', slug: 'humanity-moral-questions', description: 'Hard questions worth sitting with.' },
    ],
  },
  {
    id: 'SOCIETY',
    label: 'ThinkTank Society',
    tagline: 'Society & Unity',
    description: 'Social cohesion, mutual respect, dialogue, diversity and responsible citizenship.',
    path: '/society',
    categories: [
      { name: 'Social Cohesion', slug: 'society-cohesion', description: 'What holds communities together.' },
      { name: 'Mutual Respect', slug: 'society-mutual-respect', description: 'Regard across difference.' },
      { name: 'Tolerance', slug: 'society-tolerance', description: 'Living with disagreement.' },
      { name: 'Dialogue', slug: 'society-dialogue', description: 'Conversation as civic practice.' },
      { name: 'Diversity', slug: 'society-diversity', description: 'Difference as a social asset.' },
      { name: 'Civic Responsibility', slug: 'society-civic-responsibility', description: 'Participation and duty.' },
      { name: 'Community Values', slug: 'society-community-values', description: 'Shared norms that sustain trust.' },
      { name: 'Peaceful Coexistence', slug: 'society-peaceful-coexistence', description: 'Managing conflict without violence.' },
      { name: 'Responsible Citizenship', slug: 'society-responsible-citizenship', description: 'Informed, accountable participation.' },
    ],
  },
];

export const SECTION_IDS = [...SECTIONS.map((section) => section.id), 'GENERAL'] as const;
export type SectionId = (typeof SECTION_IDS)[number];

export const ALL_CATEGORIES = SECTIONS.flatMap((section) =>
  section.categories.map((category) => ({ ...category, section: section.id })),
);

export function findCategory(slug?: string | null) {
  if (!slug) return undefined;
  return ALL_CATEGORIES.find((category) => category.slug === slug);
}
