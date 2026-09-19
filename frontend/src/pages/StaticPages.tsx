import React, { useState } from 'react';
import { discoveryApi } from '../api.ts';
import { useToast } from '../context/ToastContext.tsx';

export const AboutPage: React.FC = () => (
  <div className="page-container content-reading-page">
    <header className="page-header">
      <p className="page-eyebrow">ABOUT THE PLATFORM</p>
      <h1 className="page-title">ThinkTank Academia</h1>
      <p className="page-lead">
        Learn • Think • Understand • Unite — A multidisciplinary learning and knowledge platform for education, ideas, and humanity.
      </p>
    </header>

    <div className="reading-body">
      <h2>Our Purpose</h2>
      <p>
        ThinkTank Academia was created to bridge fragmented disciplines into one cohesive, accessible, and intellectually rigorous ecosystem.
        We believe that education should not only prepare learners for competitive career opportunities, but also cultivate the critical mind,
        the empathetic heart, and the responsible citizen.
      </p>

      <h2>The Seven Pillars</h2>
      <p>
        Knowledge is vast, but meaningful learning requires structure. Our curriculum and editorial content are built upon seven durable domains:
      </p>
      <ol>
        <li><strong>Job Preparation:</strong> Rigorous examination question banks, model tests with time management and negative marking simulations, General Knowledge, Mathematics, English, বাংলা, and ICT.</li>
        <li><strong>Academic Learning:</strong> Foundations across sciences and humanities, concept explanations, and evidence-based study techniques.</li>
        <li><strong>Books & Ideas:</strong> Comprehensive book summaries, key ideas, historical context, practical applications, and critical reviews.</li>
        <li><strong>General Knowledge:</strong> Understanding the natural world, history, science, technology, economics, and human behavior.</li>
        <li><strong>World Affairs & Geopolitics:</strong> Sourced international analysis, trade dynamics, and global institutions, strictly distinguishing facts from perspectives.</li>
        <li><strong>Humanity & Ethics:</strong> Active empathy, unconditional human dignity, compassion in practice, and moral reflection.</li>
        <li><strong>Society & Social Unity:</strong> Dialogue across difference, community values, mutual respect, diversity, and civic accountability.</li>
      </ol>

      <h2>Our Core Standards</h2>
      <p>
        Every article, course, quiz, and summary on ThinkTank Academia is held to strict editorial principles:
      </p>
      <ul>
        <li><strong>Evidence before assertion:</strong> Claims cite primary sources and verifiable data.</li>
        <li><strong>Nuance over polemics:</strong> Complex questions deserve multifaceted examination rather than tribal slogans.</li>
        <li><strong>Human-centered ethics:</strong> Learning must build human dignity and community cohesion rather than division.</li>
      </ul>
    </div>
  </div>
);

export const ContactPage: React.FC = () => {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await discoveryApi.sendContact(form);
      setSent(true);
      toast.success('Your message has been sent. Thank you!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container auth-form-page">
      <header className="page-header">
        <p className="page-eyebrow">GET IN TOUCH</p>
        <h1 className="page-title">Contact ThinkTank Academia</h1>
        <p className="page-lead">
          Have an inquiry, feedback, or editorial suggestion? Reach our team directly.
        </p>
      </header>

      {sent ? (
        <div className="state-box success-box">
          <div className="success-icon">✓</div>
          <h3>Message Received</h3>
          <p>Thank you for reaching out. A member of our editorial or academic team will review your note.</p>
          <button onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }); }} className="btn-secondary">
            Send another message
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="standard-form card-form">
          <label className="form-field">
            <span>Your Full Name</span>
            <input
              type="text"
              required
              minLength={2}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Eleanor Vance"
            />
          </label>

          <label className="form-field">
            <span>Email Address</span>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
            />
          </label>

          <label className="form-field">
            <span>Subject</span>
            <input
              type="text"
              required
              minLength={3}
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="What is this regarding?"
            />
          </label>

          <label className="form-field">
            <span>Message</span>
            <textarea
              required
              rows={5}
              minLength={10}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Please share your thoughts or questions in detail…"
            />
          </label>

          <button type="submit" disabled={submitting} className="btn-primary form-submit-btn">
            {submitting ? 'Sending Message…' : 'Send Message →'}
          </button>
        </form>
      )}
    </div>
  );
};

export const PrivacyPage: React.FC = () => (
  <div className="page-container content-reading-page">
    <header className="page-header">
      <p className="page-eyebrow">LEGAL & PRIVACY</p>
      <h1 className="page-title">Privacy Policy</h1>
      <p className="page-lead">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </header>

    <div className="reading-body">
      <h2>1. Our Commitment</h2>
      <p>
        ThinkTank Academia respects your privacy. We collect only what is strictly necessary to provide your learning account, track your course progression, save bookmarks, and record quiz results.
      </p>

      <h2>2. What We Collect</h2>
      <ul>
        <li><strong>Account credentials:</strong> Your name, email, and securely salted bcrypt password hash. We never store plaintext passwords.</li>
        <li><strong>Learning analytics:</strong> Lessons completed, time spent, quiz attempts, and scores to generate your personalized dashboard.</li>
        <li><strong>Contact submissions:</strong> Messages sent via the contact form to respond to your queries.</li>
      </ul>

      <h2>3. What We Never Do</h2>
      <p>
        We do not sell, rent, or trade your personal information to third-party data brokers or advertising networks.
      </p>

      <h2>4. Your Rights</h2>
      <p>
        You have the right to inspect your stored data, update your profile at any time, or permanently delete your account directly from your settings page.
      </p>
    </div>
  </div>
);

export const TermsPage: React.FC = () => (
  <div className="page-container content-reading-page">
    <header className="page-header">
      <p className="page-eyebrow">TERMS OF SERVICE</p>
      <h1 className="page-title">Terms & Conditions</h1>
      <p className="page-lead">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </header>

    <div className="reading-body">
      <h2>1. Academic Integrity</h2>
      <p>
        ThinkTank Academia is an educational platform. Users are expected to engage with materials, quizzes, and discussions with honesty and respect for fellow learners.
      </p>

      <h2>2. Intellectual Property</h2>
      <p>
        Course curricula, original essays, question explanations, and editorial summaries are property of ThinkTank Academia and its contributing scholars. You may study and cite them with attribution for non-commercial educational purposes.
      </p>

      <h2>3. Code of Conduct</h2>
      <p>
        Any attempts to exploit platform APIs, scrape content maliciously, or harass other learners will result in immediate account suspension.
      </p>
    </div>
  </div>
);
