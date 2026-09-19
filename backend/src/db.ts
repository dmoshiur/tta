import pg from 'pg'; import {newDb} from 'pg-mem';
const url=process.env.DATABASE_URL;
let Pool:any=pg.Pool;
if(!url){const mem=newDb({autoCreateForeignKeyIndices:true}); Pool=mem.adapters.createPg().Pool;}
export const db=new Pool(url?{connectionString:url,ssl:process.env.NODE_ENV==='production'?{rejectUnauthorized:false}:undefined}:{});
export async function initDb(){await db.query(`
CREATE TABLE IF NOT EXISTS users(id UUID PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, name TEXT NOT NULL, avatar_url TEXT, role TEXT NOT NULL DEFAULT 'USER', permissions TEXT[] NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS categories(id UUID PRIMARY KEY, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, description TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS courses(id UUID PRIMARY KEY, title TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, description TEXT NOT NULL, category_id UUID REFERENCES categories(id), instructor TEXT, difficulty TEXT DEFAULT 'BEGINNER', thumbnail_url TEXT, status TEXT DEFAULT 'DRAFT', featured BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS modules(id UUID PRIMARY KEY, course_id UUID REFERENCES courses(id) ON DELETE CASCADE, title TEXT NOT NULL, position INT NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS lessons(id UUID PRIMARY KEY, module_id UUID REFERENCES modules(id) ON DELETE CASCADE, title TEXT NOT NULL, content TEXT DEFAULT '', video_url TEXT, duration_minutes INT DEFAULT 0, position INT DEFAULT 0, status TEXT DEFAULT 'DRAFT');
CREATE TABLE IF NOT EXISTS enrollments(user_id UUID REFERENCES users(id) ON DELETE CASCADE, course_id UUID REFERENCES courses(id) ON DELETE CASCADE, enrolled_at TIMESTAMPTZ DEFAULT NOW(), PRIMARY KEY(user_id,course_id));
CREATE TABLE IF NOT EXISTS lesson_progress(user_id UUID REFERENCES users(id) ON DELETE CASCADE, lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE, completed BOOLEAN DEFAULT FALSE, updated_at TIMESTAMPTZ DEFAULT NOW(), PRIMARY KEY(user_id,lesson_id));
CREATE TABLE IF NOT EXISTS content(id UUID PRIMARY KEY, type TEXT NOT NULL, title TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, excerpt TEXT DEFAULT '', body TEXT DEFAULT '', category_id UUID REFERENCES categories(id), author_id UUID REFERENCES users(id), cover_url TEXT, status TEXT DEFAULT 'DRAFT', sources JSONB DEFAULT '[]', seo JSONB DEFAULT '{}', published_at TIMESTAMPTZ, updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS quizzes(id UUID PRIMARY KEY, title TEXT NOT NULL, course_id UUID REFERENCES courses(id), duration_minutes INT, negative_mark NUMERIC DEFAULT 0, status TEXT DEFAULT 'DRAFT');
CREATE TABLE IF NOT EXISTS questions(id UUID PRIMARY KEY, quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE, prompt TEXT NOT NULL, type TEXT DEFAULT 'MCQ', options JSONB NOT NULL, correct JSONB NOT NULL, explanation TEXT DEFAULT '', marks NUMERIC DEFAULT 1, difficulty TEXT DEFAULT 'MEDIUM');
CREATE TABLE IF NOT EXISTS attempts(id UUID PRIMARY KEY, quiz_id UUID REFERENCES quizzes(id), user_id UUID REFERENCES users(id), answers JSONB NOT NULL, score NUMERIC NOT NULL, total NUMERIC NOT NULL, started_at TIMESTAMPTZ, submitted_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS bookmarks(user_id UUID REFERENCES users(id) ON DELETE CASCADE, item_type TEXT NOT NULL, item_id UUID NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), PRIMARY KEY(user_id,item_type,item_id));
CREATE TABLE IF NOT EXISTS notifications(id UUID PRIMARY KEY, user_id UUID REFERENCES users(id) ON DELETE CASCADE, title TEXT NOT NULL, message TEXT NOT NULL, type TEXT DEFAULT 'SYSTEM', read_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS contacts(id UUID PRIMARY KEY, name TEXT NOT NULL,email TEXT NOT NULL,subject TEXT NOT NULL,message TEXT NOT NULL,created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value JSONB NOT NULL,updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS analytics(id UUID PRIMARY KEY,event TEXT NOT NULL,path TEXT, user_id UUID, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status); CREATE INDEX IF NOT EXISTS idx_content_type_status ON content(type,status); CREATE INDEX IF NOT EXISTS idx_progress_user ON lesson_progress(user_id);`)}
