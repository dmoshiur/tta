import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { discoveryApi } from '../api.ts';
import { useToast } from '../context/ToastContext.tsx';

export const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address.');
      return;
    }
    setSubmitting(true);
    try {
      await discoveryApi.subscribeNewsletter(email);
      toast.success('Thank you for subscribing to ThinkTank Academia.');
      setEmail('');
    } catch (err: any) {
      toast.error(err.message || 'Subscription failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="tta-footer">
      <div className="footer-top">
        {/* Brand column */}
        <div className="footer-col brand-col">
          <Link to="/" className="brand-logo light" aria-label="ThinkTank Academia Home">
            <span className="brand-monogram">TT</span>
            <div className="brand-text">
              <span className="brand-name">ThinkTank</span>
              <span className="brand-sub">ACADEMIA</span>
            </div>
          </Link>
          <p className="footer-tagline">Learn • Think • Understand • Unite</p>
          <p className="footer-desc">
            A multidisciplinary learning and knowledge platform for education, ideas, and humanity.
          </p>
          <div className="footer-social-links">
            <span className="social-badge">Truth & Rigor</span>
            <span className="social-badge">Diverse Perspectives</span>
            <span className="social-badge">Human Dignity</span>
          </div>
        </div>

        {/* Learning column */}
        <div className="footer-col">
          <h4 className="footer-heading">Education & Skills</h4>
          <ul className="footer-links">
            <li><Link to="/courses">All Courses</Link></li>
            <li><Link to="/job-prep">Job Preparation & MCQs</Link></li>
            <li><Link to="/academic">Academic Learning</Link></li>
            <li><Link to="/quizzes">Quizzes & Model Tests</Link></li>
            <li><Link to="/search">Knowledge Search</Link></li>
          </ul>
        </div>

        {/* Ideas & Humanity column */}
        <div className="footer-col">
          <h4 className="footer-heading">Ideas & Society</h4>
          <ul className="footer-links">
            <li><Link to="/books">Books & Key Ideas</Link></li>
            <li><Link to="/knowledge">General Knowledge</Link></li>
            <li><Link to="/world">World Affairs & Geopolitics</Link></li>
            <li><Link to="/humanity">Humanity & Ethics</Link></li>
            <li><Link to="/society">Society & Unity</Link></li>
            <li><Link to="/articles">Editorial Articles</Link></li>
          </ul>
        </div>

        {/* Newsletter & Organization */}
        <div className="footer-col">
          <h4 className="footer-heading">Stay Informed</h4>
          <p className="newsletter-text">
            Receive weekly curated essays, book summaries, and new course announcements.
          </p>
          <form onSubmit={handleSubscribe} className="footer-newsletter-form">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              aria-label="Email for newsletter"
            />
            <button type="submit" disabled={submitting}>
              {submitting ? '…' : 'Subscribe'}
            </button>
          </form>

          <div className="footer-org-links">
            <Link to="/about">About Us</Link>
            <span>•</span>
            <Link to="/contact">Contact</Link>
            <span>•</span>
            <Link to="/privacy">Privacy</Link>
            <span>•</span>
            <Link to="/terms">Terms</Link>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} ThinkTank Academia. All rights reserved.</p>
        <p className="footer-statement">
          Building thoughtful minds and united communities through knowledge and understanding.
        </p>
      </div>
    </footer>
  );
};
