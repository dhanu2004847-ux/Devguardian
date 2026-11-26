import React, { useEffect, useId, useRef, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Lock, Mail, ArrowRight, Sparkles, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';
import './Auth.css';

function passwordStrength(password: string): { score: 0 | 1 | 2 | 3; label: string } {
  if (!password) return { score: 0, label: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password) && /[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password) && password.length >= 12) score++;
  const labels = ['Too short', 'Weak', 'Good', 'Strong'];
  return { score: Math.min(score, 3) as 0 | 1 | 2 | 3, label: labels[score] };
}

export const Auth: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, error: authError } = useAuth();
  const isRegisterMode = location.pathname.includes('register');

  const emailId = useId();
  const passwordId = useId();
  const confirmId = useId();
  const errorId = useId();
  const emailInputRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const error = localError ?? authError;
  const strength = passwordStrength(password);

  // Auto-focus the email field when the form mounts or switches mode, and
  // clear per-field state so switching tabs doesn't leak stale values/errors.
  useEffect(() => {
    setLocalError(null);
    setPassword('');
    setConfirmPassword('');
    emailInputRef.current?.focus();
  }, [isRegisterMode]);

  function triggerShake() {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);

    if (isRegisterMode) {
      if (password.length < 8) {
        setLocalError('Password must be at least 8 characters.');
        triggerShake();
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match.');
        triggerShake();
        return;
      }
    }

    setLoading(true);
    try {
      if (isRegisterMode) {
        await register(email, password);
      } else {
        await login(email, password);
      }
      navigate('/dashboard');
    } catch {
      triggerShake();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-aurora" aria-hidden="true" />
      <div className="auth-aurora two" aria-hidden="true" />

      <div className={`auth-card${shake ? ' shake' : ''}`}>
        <div className="auth-header">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <Logo size={84} stacked subtitle />
          </div>
          <h1 className="auth-title">{isRegisterMode ? 'Initialize DevGuardian' : 'Welcome back'}</h1>
          <p className="auth-desc">
            {isRegisterMode
              ? 'Create your secure AI engineering workspace.'
              : 'Log in to access your repositories and scan history.'}
          </p>
        </div>

        <div className="auth-tabs" role="tablist" aria-label="Choose sign in or register">
          <div className={`auth-tab-indicator${isRegisterMode ? ' register' : ''}`} aria-hidden="true" />
          <button
            type="button"
            role="tab"
            aria-selected={!isRegisterMode}
            className="auth-tab"
            onClick={() => navigate('/login')}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isRegisterMode}
            className="auth-tab"
            onClick={() => navigate('/register')}
          >
            Register
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="auth-error" role="alert" id={errorId} aria-live="assertive">
              {error}
            </div>
          )}

          <div className="auth-field">
            <label htmlFor={emailId}>Email</label>
            <div className="auth-input-wrap">
              <Mail size={16} className="leading-icon" aria-hidden="true" />
              <input
                ref={emailInputRef}
                id={emailId}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@company.com"
                autoComplete="email"
                aria-describedby={error ? errorId : undefined}
                aria-invalid={!!error}
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor={passwordId}>Password</label>
            <div className="auth-input-wrap">
              <Lock size={16} className="leading-icon" aria-hidden="true" />
              <input
                id={passwordId}
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
                className="has-trailing-icon"
                aria-describedby={error ? errorId : undefined}
                aria-invalid={!!error}
              />
              <button
                type="button"
                className="auth-toggle-visibility"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {isRegisterMode && password.length > 0 && (
              <>
                <div className="auth-strength" aria-hidden="true">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className={`auth-strength-bar${
                        i < strength.score
                          ? strength.score === 1 ? ' filled-weak' : strength.score === 2 ? ' filled-fair' : ' filled-strong'
                          : ''
                      }`}
                    />
                  ))}
                </div>
                <div className="auth-strength-label" role="status">
                  Password strength: {strength.label}
                </div>
              </>
            )}
          </div>

          {isRegisterMode && (
            <div className="auth-field">
              <label htmlFor={confirmId}>Confirm password</label>
              <div className="auth-input-wrap">
                <Lock size={16} className="leading-icon" aria-hidden="true" />
                <input
                  id={confirmId}
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="new-password"
                />
              </div>
            </div>
          )}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? (
              <>
                <span className="auth-spinner" aria-hidden="true" /> {isRegisterMode ? 'Creating account…' : 'Signing in…'}
              </>
            ) : (
              <>
                {isRegisterMode ? 'Create account' : 'Sign in'} <ArrowRight size={16} aria-hidden="true" />
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <Sparkles size={13} color="#22d3ee" aria-hidden="true" />
          {isRegisterMode ? (
            <span>Already have an account? <Link to="/login">Sign in</Link></span>
          ) : (
            <span>New here? <Link to="/register">Create an account</Link></span>
          )}
        </div>
      </div>
    </div>
  );
};