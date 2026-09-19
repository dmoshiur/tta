import type {
  User,
  Section,
  Category,
  Course,
  LessonDetail,
  ContentItem,
  Book,
  QuizSummary,
  Question,
  AttemptDetail,
  AttemptSummary,
  Bookmark,
  Notification,
  DashboardData,
  PagedResponse,
} from './types/index.ts';

const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api/v1';

export class ApiRequestError extends Error {
  code?: string;
  details?: any;
  status: number;

  constructor(message: string, status = 500, code?: string, details?: any) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function getToken(): string | null {
  return localStorage.getItem('tta_token');
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem('tta_token', token);
  else localStorage.removeItem('tta_token');
}

export async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  // If body is not FormData, default to JSON
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const response = await fetch(url, { ...options, headers });

  if (response.status === 204) return {} as T;

  let json: any;
  try {
    json = await response.json();
  } catch {
    throw new ApiRequestError('Invalid server response.', response.status);
  }

  if (!response.ok || json.success === false) {
    const error = json.error || {};
    throw new ApiRequestError(error.message || 'An error occurred.', response.status, error.code, error.details);
  }

  return json.data !== undefined ? json.data : json;
}

// ── Auth APIs ───────────────────────────────────────────────────────────────

export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  logout: () => request('/auth/logout', { method: 'POST' }),

  getSession: () => request<{ user: User; permissions: string[] }>('/auth/session'),

  forgotPassword: (email: string) =>
    request<{ message: string; delivered: boolean; devLink?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  verifyResetToken: (token: string) => request<{ valid: boolean; email: string }>(`/auth/reset-password/${token}`),

  resetPassword: (data: { token: string; password: string }) =>
    request<{ reset: boolean }>('/auth/reset-password', { method: 'POST', body: JSON.stringify(data) }),
};

// ── User APIs ───────────────────────────────────────────────────────────────

export const userApi = {
  getProfile: () => request<User>('/users/me'),

  updateProfile: (data: Partial<User>) =>
    request<User>('/users/me', { method: 'PATCH', body: JSON.stringify(data) }),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request<{ changed: boolean }>('/users/me/password', { method: 'PATCH', body: JSON.stringify(data) }),

  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<{ url: string; key: string }>('/users/me/avatar', {
      method: 'POST',
      body: formData,
    });
  },

  deleteAccount: (password: string) =>
    request('/users/me', { method: 'DELETE', body: JSON.stringify({ password }) }),
};

// ── Learning & Courses APIs ─────────────────────────────────────────────────

export const learningApi = {
  getHome: () => request<any>('/home'),

  getSections: () => request<Section[]>('/sections'),

  getCategories: (section?: string) =>
    request<Category[]>(`/categories${section ? `?section=${encodeURIComponent(section)}` : ''}`),

  getCourses: (params: Record<string, any> = {}) => {
    const q = new URLSearchParams(params as any).toString();
    return request<PagedResponse<Course>>(`/courses${q ? `?${q}` : ''}`);
  },

  getCourse: (slug: string) => request<Course>(`/courses/${slug}`),

  enrollCourse: (courseId: string) =>
    request<{ enrolled: boolean; courseId: string; slug: string }>(`/courses/${courseId}/enroll`, { method: 'POST' }),

  unenrollCourse: (courseId: string) =>
    request<{ enrolled: boolean }>(`/courses/${courseId}/enroll`, { method: 'DELETE' }),

  getLesson: (lessonId: string) => request<LessonDetail>(`/lessons/${lessonId}`),

  completeLesson: (lessonId: string, secondsSpent = 0) =>
    request<{ completed: boolean; courseCompleted: boolean; progress: any }>(`/lessons/${lessonId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ secondsSpent }),
    }),

  uncompleteLesson: (lessonId: string) =>
    request<{ completed: boolean }>(`/lessons/${lessonId}/complete`, { method: 'DELETE' }),

  getAssignments: (courseId: string) => request<any[]>(`/assignments?courseId=${courseId}`),

  submitAssignment: (assignmentId: string, body: string, attachmentUrl?: string) =>
    request(`/assignments/${assignmentId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ body, attachmentUrl }),
    }),

  getDashboard: () => request<DashboardData>('/dashboard'),
};

// ── Quizzes & Assessment APIs ───────────────────────────────────────────────

export const quizApi = {
  getQuizzes: (params: Record<string, any> = {}) => {
    const q = new URLSearchParams(params as any).toString();
    return request<PagedResponse<QuizSummary>>(`/quizzes${q ? `?${q}` : ''}`);
  },

  getQuiz: (slug: string) => request<QuizSummary>(`/quizzes/${slug}`),

  startQuiz: (slug: string) =>
    request<{
      attempt_id: string;
      resumed: boolean;
      quiz: QuizSummary;
      expires_at: string | null;
      seconds_remaining: number | null;
      saved_answers: Record<string, any>;
      questions: Question[];
    }>(`/quizzes/${slug}/start`, { method: 'POST' }),

  saveAnswers: (attemptId: string, answers: Record<string, any>) =>
    request<{ saved: boolean; answered: number }>(`/attempts/${attemptId}/answers`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    }),

  submitAttempt: (attemptId: string, answers?: Record<string, any>) =>
    request<AttemptDetail>(`/attempts/${attemptId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    }),

  getAttempt: (attemptId: string) => request<AttemptDetail>(`/attempts/${attemptId}`),

  getAttempts: (page = 1) => request<PagedResponse<AttemptSummary>>(`/attempts?page=${page}`),
};

// ── Editorial Content APIs ──────────────────────────────────────────────────

export const contentApi = {
  getContentList: (params: Record<string, any> = {}) => {
    const q = new URLSearchParams(params as any).toString();
    return request<PagedResponse<ContentItem>>(`/content${q ? `?${q}` : ''}`);
  },

  getContentItem: (slug: string) => request<ContentItem>(`/content/${slug}`),

  getBooks: (params: Record<string, any> = {}) => {
    const q = new URLSearchParams(params as any).toString();
    return request<PagedResponse<Book>>(`/books${q ? `?${q}` : ''}`);
  },

  getBook: (slug: string) => request<Book>(`/books/${slug}`),

  getTags: (type?: string) => request<{ tag: string; total: number }[]>(`/tags${type ? `?type=${type}` : ''}`),
};

// ── Discovery: Search, Bookmarks, Notifications, Contact ────────────────────

export const discoveryApi = {
  search: (query: string, type?: string, page = 1) => {
    const params = new URLSearchParams({ q: query, page: String(page) });
    if (type) params.set('type', type);
    return request<any>(`/search?${params.toString()}`);
  },

  getBookmarks: (type?: string) => request<Bookmark[]>(`/bookmarks${type ? `?type=${type}` : ''}`),

  addBookmark: (item_type: string, item_id: string, note?: string) =>
    request<{ id: string; bookmarked: boolean }>('/bookmarks', {
      method: 'POST',
      body: JSON.stringify({ item_type, item_id, note }),
    }),

  removeBookmark: (type: string, id: string) =>
    request<{ bookmarked: boolean }>(`/bookmarks/${type}/${id}`, { method: 'DELETE' }),

  getNotifications: () => request<{ items: Notification[]; unread: number }>('/notifications'),

  markNotificationRead: (id: string) => request(`/notifications/${id}/read`, { method: 'PATCH' }),

  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'POST' }),

  deleteNotification: (id: string) => request(`/notifications/${id}`, { method: 'DELETE' }),

  sendContact: (data: { name: string; email: string; subject: string; message: string }) =>
    request<{ received: boolean; id: string }>('/contact', { method: 'POST', body: JSON.stringify(data) }),

  subscribeNewsletter: (email: string) =>
    request<{ subscribed: boolean }>('/newsletter', { method: 'POST', body: JSON.stringify({ email }) }),

  trackAnalytics: (event: string, path: string, label?: string) =>
    request('/analytics', { method: 'POST', body: JSON.stringify({ event, path, label }) }).catch(() => {}),
};

// ── Admin APIs ──────────────────────────────────────────────────────────────

export const adminApi = {
  getOverview: () => request<any>('/admin/overview'),

  getResourcesMeta: () => request<any[]>('/admin/resources'),

  getOptions: (resource: string, query?: Record<string, string>) => {
    const q = query ? `?${new URLSearchParams(query).toString()}` : '';
    return request<{ id: string; label: string }[]>(`/admin/options/${resource}${q}`);
  },

  listResource: (resource: string, params: Record<string, any> = {}) => {
    const q = new URLSearchParams(params as any).toString();
    return request<PagedResponse<any>>(`/admin/r/${resource}${q ? `?${q}` : ''}`);
  },

  getResourceItem: (resource: string, id: string) => request<any>(`/admin/r/${resource}/${id}`),

  createResource: (resource: string, data: any) =>
    request<any>(`/admin/r/${resource}`, { method: 'POST', body: JSON.stringify(data) }),

  updateResource: (resource: string, id: string, data: any) =>
    request<any>(`/admin/r/${resource}/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteResource: (resource: string, id: string) =>
    request<{ deleted: boolean }>(`/admin/r/${resource}/${id}`, { method: 'DELETE' }),

  togglePublish: (resource: string, id: string) =>
    request<{ status: string }>(`/admin/r/${resource}/${id}/publish`, { method: 'POST' }),

  getUsers: (params: Record<string, any> = {}) => {
    const q = new URLSearchParams(params as any).toString();
    return request<PagedResponse<any>>(`/admin/users${q ? `?${q}` : ''}`);
  },

  createUser: (data: any) => request<any>('/admin/users', { method: 'POST', body: JSON.stringify(data) }),

  updateUser: (id: string, data: any) =>
    request<any>(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteUser: (id: string) => request(`/admin/users/${id}`, { method: 'DELETE' }),

  getRoles: () => request<{ roles: any[]; permissions: any[] }>('/admin/roles'),

  updateRolePermissions: (roleId: string, permissions: string[]) =>
    request(`/admin/roles/${roleId}/permissions`, { method: 'PATCH', body: JSON.stringify({ permissions }) }),

  getSettings: () => request<Record<string, any>>('/admin/settings'),

  updateSettings: (key: string, value: any) =>
    request(`/admin/settings/${key}`, { method: 'PUT', body: JSON.stringify(value) }),

  uploadMedia: async (file: File, folder = 'general', alt = '') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    formData.append('alt', alt);
    return request<{ id: string; url: string; original_name: string; bytes: number }>('/admin/media/upload', {
      method: 'POST',
      body: formData,
    });
  },

  broadcastNotification: (data: { title: string; message?: string; type?: string; link?: string }) =>
    request('/admin/broadcast', { method: 'POST', body: JSON.stringify(data) }),

  getAnalytics: () => request<any>('/admin/analytics'),

  getActivityLog: (page = 1) => request<PagedResponse<any>>(`/admin/activity?page=${page}`),
};
