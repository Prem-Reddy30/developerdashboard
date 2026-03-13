import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, signOut, onAuthStateChanged } from './firebase';
import { updateProfile } from 'firebase/auth';

const TABS = ['Settings'];

function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('Settings');
  const [displayName, setDisplayName] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [saving, setSaving] = useState(false);
  const [notifications, setNotifications] = useState({ email: true, updates: false, darkMode: true });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setDisplayName(currentUser.displayName || '');
      }
    });
    return () => unsubscribe();
  }, []);

  // Load dark mode preference from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const isDark = savedTheme !== 'light';
    setNotifications(prev => ({ ...prev, darkMode: isDark }));
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, []);

  // Handle dark mode toggle
  const handleDarkModeToggle = () => {
    setNotifications(prev => {
      const newDarkMode = !prev.darkMode;
      const theme = newDarkMode ? 'dark' : 'light';
      localStorage.setItem('theme', theme);
      document.documentElement.setAttribute('data-theme', theme);
      return { ...prev, darkMode: newDarkMode };
    });
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user, { displayName });
      setMessage({ text: '✓ Profile updated successfully!', type: 'success' });
    } catch (err) {
      setMessage({ text: '✗ Failed to update profile.', type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    }
  };

  const getInitials = (u) => {
    if (!u) return 'U';
    if (u.displayName) return u.displayName.slice(0, 2).toUpperCase();
    if (u.email) return u.email[0].toUpperCase();
    return 'U';
  };

  if (!user) {
    return (
      <div className="profile-page">
        <div className="profile-not-logged-in">
          <div className="hero-bg-glow" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}></div>
          <div className="profile-empty-card">
            <div className="profile-lock-icon">🔒</div>
            <h2>You're not logged in</h2>
            <p>Please sign in to view your profile and manage your settings.</p>
            <button onClick={() => navigate('/login')} className="btn-primary">
              Sign In
            </button>
            <Link to="/" className="profile-home-link">← Back to Home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* Background glow */}
      <div className="profile-bg-glow-1"></div>
      <div className="profile-bg-glow-2"></div>

      {/* Header */}
      <header className="profile-header-bar">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 2rem' }}>
          <Link to="/" className="logo" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="logo-icon"></div>
            CodeDashboard
          </Link>
          <nav className="nav-links">
            <button onClick={handleLogout} className="btn-logout">Sign Out</button>
          </nav>
        </div>
      </header>

      <div className="profile-layout">
        {/* ── Left Sidebar ── */}
        <aside className="profile-sidebar">
          {/* Avatar Card */}
          <div className="profile-avatar-card">
            <Link to="/" style={{ 
              position: 'absolute',
              top: '1rem',
              left: '1rem',
              textDecoration: 'none',
              color: 'var(--text-muted)',
              fontSize: '1.5rem',
              transition: 'color 0.2s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.target.style.color = 'var(--primary-color)'}
            onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
            title="Back to Home"
            >
              ←
            </Link>
            <div className="profile-avatar-ring">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="profile-avatar-img" />
              ) : (
                <div className="profile-avatar-fallback">
                  {getInitials(user)}
                </div>
              )}
              <div className="profile-avatar-badge">✓</div>
            </div>
            <h2 className="profile-name">{user.displayName || 'Anonymous'}</h2>
            <p className="profile-email">{user.email}</p>
            <div className="profile-plan-badge">
              <span>⚡</span> Free Plan
            </div>
          </div>

          {/* Sidebar Navigation */}
          <nav className="profile-nav">
            {TABS.map((tab) => (
              <button
                key={tab}
                className={`profile-nav-item ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                <span className="profile-nav-icon">
                  {tab === 'Settings' && '⚙'}
                </span>
                {tab}
              </button>
            ))}
          </nav>

          {/* Logout */}
          <button className="profile-sidebar-logout" onClick={handleLogout}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        </aside>

        {/* ── Main Content ── */}
        <main className="profile-main">

          {/* ─ SETTINGS TAB ─ */}
          {activeTab === 'Settings' && (
            <div className="profile-tab-content" key="settings">
              <div className="profile-section-header">
                <h1 className="profile-section-title">
                  <Link to="/" style={{ 
                    textDecoration: 'none', 
                    color: 'var(--text-muted)', 
                    marginRight: '0.5rem',
                    fontSize: '1.5rem',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.color = 'var(--primary-color)'}
                  onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
                  >
                    ←
                  </Link>
                  Account <span>Settings</span>
                </h1>
                <p className="profile-section-subtitle">Manage your profile information and preferences.</p>
              </div>

              {/* Profile Form */}
              <div className="profile-panel">
                <div className="profile-panel-header">
                  <h3>Profile Information</h3>
                </div>
                <form onSubmit={handleSave} className="profile-form">
                  <div className="profile-form-row">
                    <div className="profile-form-group">
                      <label htmlFor="displayName">Display Name</label>
                      <input
                        id="displayName"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your full name"
                        className="profile-input"
                      />
                    </div>
                    <div className="profile-form-group">
                      <label htmlFor="profileEmail">Email Address</label>
                      <input
                        id="profileEmail"
                        type="email"
                        value={user.email || ''}
                        readOnly
                        className="profile-input readonly"
                      />
                      <span className="profile-input-note">Email cannot be changed here.</span>
                    </div>
                  </div>

                  {message.text && (
                    <div className={`profile-message ${message.type}`}>
                      {message.text}
                    </div>
                  )}

                  <button type="submit" className="btn-primary profile-save-btn" disabled={saving}>
                    {saving ? (
                      <span className="profile-btn-loading">
                        <span className="profile-spinner"></span> Saving...
                      </span>
                    ) : 'Save Changes'}
                  </button>
                </form>
              </div>

              {/* Preferences */}
              <div className="profile-panel">
                <div className="profile-panel-header">
                  <h3>Preferences</h3>
                </div>
                <div className="profile-toggles">
                  {[
                    { key: 'email', label: 'Email Notifications', desc: 'Receive notifications about your analyses via email.' },
                    { key: 'updates', label: 'Product Updates', desc: 'Be the first to know about new features and improvements.' },
                    { key: 'darkMode', label: 'Dark Mode', desc: 'Switch between light and dark theme.' },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="profile-toggle-row">
                      <div className="profile-toggle-info">
                        <span className="profile-toggle-label">{label}</span>
                        <span className="profile-toggle-desc">{desc}</span>
                      </div>
                      <button
                        className={`profile-toggle-switch ${notifications[key] ? 'on' : ''}`}
                        onClick={() => {
                          if (key === 'darkMode') {
                            handleDarkModeToggle();
                          } else {
                            setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
                          }
                        }}
                        aria-label={`Toggle ${label}`}
                      >
                        <span className="profile-toggle-knob"></span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Danger Zone */}
              <div className="profile-panel profile-danger-panel">
                <div className="profile-panel-header">
                  <h3 style={{ color: '#ff5f56' }}>Danger Zone</h3>
                </div>
                <div className="profile-danger-row">
                  <div>
                    <p className="profile-danger-label">Delete Account</p>
                    <p className="profile-danger-desc">Permanently delete your account and all associated data. This action cannot be undone.</p>
                  </div>
                  <button className="profile-btn-danger">Delete Account</button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default Profile;
