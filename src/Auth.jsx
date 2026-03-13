import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, githubProvider } from './firebase';
import { signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';

function Auth() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check for redirect result on mount (fallback flow)
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log("GitHub Redirect Login Success:", result.user);
          navigate('/');
        }
      })
      .catch((err) => {
        if (err.code && err.code !== 'auth/popup-closed-by-user') {
          console.error("Redirect result error:", err);
          setError(err.message);
        }
      });
  }, [navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Log in clicked!');
  };

  const handleGithubSignIn = async () => {
    try {
      setError('');
      setLoading(true);

      // Add scopes
      githubProvider.addScope('read:user');
      githubProvider.addScope('user:email');

      // Try popup first
      const result = await signInWithPopup(auth, githubProvider);
      console.log("GitHub Login Success:", result.user);
      navigate('/');
    } catch (err) {
      console.error("GitHub Login Error:", err.code, err.message);

      // If popup is blocked or internal error, fall back to redirect
      if (
        err.code === 'auth/popup-blocked' ||
        err.code === 'auth/internal-error' ||
        err.code === 'auth/popup-closed-by-user' ||
        err.code === 'auth/cancelled-popup-request'
      ) {
        console.log("Popup failed, trying redirect...");
        try {
          await signInWithRedirect(auth, githubProvider);
          // Page will redirect - user will come back and useEffect above handles the result
        } catch (redirectErr) {
          console.error("Redirect also failed:", redirectErr);
          setError(redirectErr.message);
          setLoading(false);
        }
      } else {
        setError(err.message);
        setLoading(false);
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="hero-bg-glow glow-auth"></div>
      
      <Link to="/" className="logo auth-logo" style={{ textDecoration: 'none', color: 'inherit' }}>
        <div className="logo-icon"></div>
        CodeDashboard
      </Link>

      <div className="auth-card">
        <div className="auth-header">
          <h2>Welcome back</h2>
          <p>Enter your details to sign in.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" placeholder="john@example.com" required />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input type="password" id="password" placeholder="••••••••" required />
          </div>

          <button type="submit" className="auth-submit btn-primary">
            Sign In
          </button>
        </form>

        <div className="auth-divider">
          <span>or continue with</span>
        </div>

        {error && (
          <p className="auth-error" style={{ color: '#ff5f56', fontSize: '0.85rem', textAlign: 'center', marginBottom: '1rem', background: 'rgba(255, 95, 86, 0.08)', padding: '0.6rem', borderRadius: '8px', border: '1px solid rgba(255, 95, 86, 0.2)' }}>
            {error}
          </p>
        )}
        <div className="oauth-group">
          <button type="button" className="btn-oauth" onClick={handleGithubSignIn} disabled={loading}>
            {loading ? (
              <>
                <span className="profile-spinner" style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }}></span>
                Signing in...
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .839-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
                Sign in with GitHub
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Auth;
