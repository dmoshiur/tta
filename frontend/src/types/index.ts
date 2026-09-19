export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string | null;
  headline?: string;
  bio?: string;
  role: string;
  role_label: string;
  is_active: boolean;
  preferences?: Record<string, any>;
  created_at: string;
}

export interface Section {
  id: string;
  label: string;
  tagline: string;
  description: string;
  path: string;
  category_count?: number;
  course_count?: number;
  content_count?: number;
  book_count?: number;
  quiz_count?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  section: string;
  description: string;
  icon?: string;
  position: number;
  course_count?: number;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  body?: string;
  section: string;
  section_label?: string;
  category?: string;
  category_slug?: string;
  instructor?: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  language: string;
  duration_minutes: number;
  thumbnail_url?: string | null;
  tags: string[];
  is_featured: boolean;
  status: string;
  views: number;
  lesson_count?: number;
  published_at?: string;
  modules?: Module[];
  quizzes?: QuizSummary[];
  related?: Course[];
  enrollment?: {
    enrolled: boolean;
    status?: string;
    enrolled_at?: string;
    last_lesson_id?: string;
    completed_at?: string;
  };
  progress?: {
    total_lessons: number;
    completed_lessons: number;
    percentage: number;
  };
}

export interface Module {
  id: string;
  course_id?: string;
  title: string;
  summary?: string;
  position: number;
  lessons: LessonSummary[];
}

export interface LessonSummary {
  id: string;
  module_id: string;
  title: string;
  slug: string;
  summary?: string;
  kind: 'TEXT' | 'VIDEO' | 'QUIZ';
  video_url?: string | null;
  duration_minutes: number;
  position: number;
  is_preview: boolean;
  status: string;
  completed?: boolean;
}

export interface LessonDetail {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  kind: 'TEXT' | 'VIDEO' | 'QUIZ';
  video_url?: string | null;
  attachments: { title: string; url: string }[];
  notes?: string;
  duration_minutes: number;
  module: { id: string; title: string };
  course: { id: string; title: string; slug: string };
  completed: boolean;
  completed_at?: string | null;
  enrolled: boolean;
  navigation: {
    previous: { id: string; title: string; slug: string } | null;
    next: { id: string; title: string; slug: string } | null;
  };
}

export interface ContentItem {
  id: string;
  type: 'ARTICLE' | 'KNOWLEDGE' | 'WORLD' | 'HUMANITY' | 'SOCIETY';
  title: string;
  slug: string;
  excerpt: string;
  body?: string;
  cover_url?: string | null;
  category?: string;
  category_slug?: string;
  author: string;
  stance?: 'FACT' | 'ANALYSIS' | 'OPINION';
  tags: string[];
  reading_minutes: number;
  is_featured: boolean;
  views: number;
  status: string;
  published_at?: string;
  updated_at?: string;
  meta?: Record<string, any>;
  sources?: { title: string; url: string }[];
  seo?: { title?: string; description?: string };
  bookmarked?: boolean;
  related?: ContentItem[];
}

export interface Book {
  id: string;
  title: string;
  slug: string;
  author_name: string;
  published_year?: number | null;
  pages?: number | null;
  rating: number;
  cover_url?: string | null;
  description: string;
  summary?: string;
  key_ideas?: { title: string; detail: string }[];
  lessons?: string[];
  context?: string;
  applications?: string;
  review?: string;
  recommendation?: string;
  category?: string;
  category_slug?: string;
  tags: string[];
  is_featured: boolean;
  views: number;
  status: string;
  published_at?: string;
  related_slugs?: { slug: string; title: string }[];
  bookmarked?: boolean;
  related?: Book[];
}

export interface QuizSummary {
  id: string;
  title: string;
  slug: string;
  description: string;
  kind: 'QUIZ' | 'MCQ' | 'MODEL_TEST';
  category?: string;
  category_slug?: string;
  course_id?: string | null;
  course_title?: string | null;
  course_slug?: string | null;
  duration_minutes: number;
  question_count: number;
  total_marks: number;
  pass_marks: number;
  negative_mark: number;
  shuffle_questions: boolean;
  show_explanations: boolean;
  max_attempts: number;
  is_featured: boolean;
  attempts_count: number;
  status: string;
  published_at?: string;
  available_questions?: number;
  attempts_left?: number | null;
  my_attempts?: AttemptSummary[];
  best_percentage?: number;
}

export interface Question {
  id: string;
  position: number;
  prompt: string;
  kind: 'MCQ' | 'MULTIPLE' | 'TRUE_FALSE';
  options: string[];
  marks: number;
  difficulty: string;
  multiple: boolean;
}

export interface AttemptSummary {
  id: string;
  quiz_id?: string;
  quiz_title?: string;
  quiz_slug?: string;
  quiz_kind?: string;
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
  correct_count: number;
  wrong_count: number;
  unanswered_count: number;
  status: string;
  started_at: string;
  submitted_at?: string;
  seconds_spent?: number;
  learner?: string;
}

export interface AttemptDetail extends AttemptSummary {
  attempt_id?: string;
  show_explanations: boolean;
  answers: Record<string, any>;
  question_ids: string[];
  review: {
    id: string;
    prompt: string;
    kind: string;
    options: string[];
    your_answer: number[] | null;
    your_answer_text: string[] | null;
    correct_answer?: number[];
    correct_answer_text?: string[];
    is_correct: boolean;
    marks: number;
    awarded: number;
    difficulty: string;
    explanation?: string;
  }[];
}

export interface Bookmark {
  id: string;
  item_type: 'COURSE' | 'LESSON' | 'ARTICLE' | 'BOOK' | 'QUIZ' | 'CONTENT';
  item_id: string;
  note?: string;
  created_at: string;
  item: {
    id: string;
    title: string;
    slug?: string;
    excerpt?: string;
    image?: string | null;
    subtitle?: string;
    href: string;
  } | null;
}

export interface Notification {
  id: string;
  user_id?: string | null;
  audience: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  read_at?: string | null;
  created_at: string;
}

export interface DashboardData {
  stats: {
    enrolled_courses: number;
    completed_lessons: number;
    completed_courses: number;
    quizzes_taken: number;
    best_percentage: number;
    bookmarks: number;
    unread_notifications: number;
  };
  continue_learning: any[];
  courses: any[];
  completed_courses: any[];
  attempts: AttemptSummary[];
  recently_viewed: any[];
  bookmarks: any[];
}

export interface PagedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}
