import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import RepoAnalyzer from './RepoAnalyzer';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

function Home() {
  const navigate = useNavigate();
  const [repoUrl, setRepoUrl] = useState('');
  const [analyzedRepo, setAnalyzedRepo] = useState(null);
  const [user, setUser] = useState(null);
  const [dummyTab, setDummyTab] = useState('Tech Stack');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [repoPreview, setRepoPreview] = useState(null);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Load theme preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  // Check for repo parameter from Explore page
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const repoParam = urlParams.get('repo');
    if (repoParam) {
      const [owner, repo] = repoParam.split('/');
      if (owner && repo) {
        setRepoUrl(`https://github.com/${owner}/${repo}`);
        setAnalyzedRepo({ owner, repo });
      }
    }
  }, []);

  // Load GitHub token
  useEffect(() => {
    const savedToken = localStorage.getItem('github_token');
    if (savedToken) {
      setGithubToken(savedToken);
    }
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleSaveToken = () => {
    if (githubToken.trim()) {
      localStorage.setItem('github_token', githubToken.trim());
      setShowTokenInput(false);
      alert('GitHub token saved successfully!');
    }
  };

  const handleClearToken = () => {
    localStorage.removeItem('github_token');
    setGithubToken('');
    alert('GitHub token cleared!');
  };


  const validateRepoAndGetPreview = async (url) => {
    if (!url) {
      setRepoPreview(null);
      return;
    }

    // Check if it's a GitHub URL
    try {
      const urlObj = new URL(url);
      if (!urlObj.hostname.includes('github.com')) {
        setRepoPreview(null);
        return;
      }

      const parts = urlObj.pathname.split('/').filter(Boolean);
      if (parts.length < 2) {
        setRepoPreview(null);
        return;
      }

      const [owner, repo] = parts;
      setIsValidating(true);
      
      // Try backend proxy first (uses server-side token with 5000 requests/hr)
      try {
        const backendRes = await fetch(`http://localhost:5000/api/repo-details/${owner}/${repo}`);
        if (backendRes.ok) {
          const data = await backendRes.json();
          const repoData = data.repo;
          const languages = Object.keys(data.languages || {});
          
          setRepoPreview({
            owner,
            repo,
            name: repoData.name,
            description: repoData.description,
            stars: repoData.stargazers_count,
            forks: repoData.forks_count,
            language: repoData.language,
            languages,
            isValid: true
          });
          setIsValidating(false);
          return;
        }
      } catch (e) {
        console.warn('Backend proxy failed, falling back to direct API');
      }

      // Fallback to Direct GitHub API (60 req/hr or user's local token)
      const headers = { Accept: 'application/vnd.github.v3+json' };
      const token = localStorage.getItem('github_token');
      if (token) headers.Authorization = `token ${token}`;

      const [repoRes, langRes] = await Promise.all([
        fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers }),
        fetch(`https://api.github.com/repos/${owner}/${repo}/languages`, { headers })
      ]);

      if (repoRes.ok) {
        const repoData = await repoRes.json();
        const langData = langRes.ok ? await langRes.json() : {};
        const languages = Object.keys(langData);

        setRepoPreview({
          owner,
          repo,
          name: repoData.name,
          description: repoData.description,
          stars: repoData.stargazers_count,
          forks: repoData.forks_count,
          language: repoData.language,
          languages,
          isValid: true
        });
      } else {
        // Detailed error handling
        let errorMessage = 'Repository not found or private';
        let isRateLimited = false;
        
        if (repoRes.status === 403) {
          const rateLimitRemaining = repoRes.headers.get('X-RateLimit-Remaining');
          if (rateLimitRemaining === '0') {
            errorMessage = 'GitHub capacity temporarily reached.';
            isRateLimited = true;
          } else {
            errorMessage = 'Access denied. This repository might be private.';
          }
        } else if (repoRes.status === 404) {
          errorMessage = 'Repository not found. Check the URL and ensure it exists.';
        } else if (repoRes.status === 422) {
          errorMessage = 'Invalid repository name or format.';
        }
        
        setRepoPreview({ 
          isValid: false, 
          error: errorMessage, 
          isRateLimited,
          owner,
          repo
        });
      }
    } catch (error) {
      setRepoPreview({ isValid: false, error: 'Invalid URL format' });
    } finally {
      setIsValidating(false);
    }
  };

  const handleUrlChange = (e) => {
    const url = e.target.value;
    setRepoUrl(url);
    validateRepoAndGetPreview(url);
  };

  const handleGenerate = (e) => {
    e.preventDefault();
    if (!repoUrl) return;
    
    // Parse github url (e.g. https://github.com/facebook/react)
    try {
      const urlObj = new URL(repoUrl);
      const parts = urlObj.pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        setAnalyzedRepo({ owner: parts[0], repo: parts[1] });
      } else {
        alert("Please enter a valid GitHub repository URL. Example: https://github.com/facebook/react");
      }
    } catch {
      alert("Invalid URL format. Please include https://github.com/...");
    }
  };


  return (
    <div className="container">
      <header>
        <div className="header-left">
          <Link to="/" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem', 
            textDecoration: 'none', 
            color: 'var(--text-main)' 
          }}>
            <div className="logo-icon"></div>
            <span style={{ 
              fontWeight: '700', 
              fontSize: '1.25rem', 
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, #fff 0%, #a78bfa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              DeveloperDashboard
            </span>
          </Link>
        </div>

        <nav className="nav-links header-center">
          <Link to="/" style={{ color: 'var(--text-main)', textDecoration: 'none' }}>Home</Link>
          <a href="#features">Features</a>
          <Link to="/explore" style={{ color: 'var(--text-main)', textDecoration: 'none' }}>Explore</Link>
          <a href="#page-bottom">Help</a>
        </nav>

        <div className="header-right">
          {user ? (
            <div className="user-profile-nav" style={{ cursor: 'pointer' }} onClick={() => navigate('/profile')}>
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="nav-avatar" />
              ) : (
                <div className="nav-avatar-placeholder">
                  {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <span className="nav-username">{user.displayName || user.email}</span>
            </div>
          ) : (
            <Link to="/login" className="btn-primary">Log in</Link>
          )}
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-bg-glow"></div>
          <h1>
            Visualize Any GitHub Repo <br />
            <span className="hero-sky">in 2 Minutes.</span>
          </h1>
          <p>
            Transform any GitHub repo into an interactive developer dashboard with code metrics, 
            complexity analysis, dependency graphs, and AI-powered insights. Perfect for code reviews, 
            onboarding, and technical documentation.
          </p>
          
          <form className="input-group" onSubmit={handleGenerate}>
            <div className="input-github-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .839-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
            </div>
            <input 
              type="text" 
              placeholder="https://github.com/facebook/react" 
              value={repoUrl}
              onChange={handleUrlChange}
            />
            <button type="submit">Analyze your repo &rarr;</button>
          </form>


          {showTokenInput && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              background: 'var(--bg-card)',
              border: '1px solid var(--bg-border)',
              borderRadius: '8px',
              maxWidth: '500px',
              margin: '1rem auto'
            }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>GitHub Personal Access Token</h4>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Get a free token from <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)' }}>GitHub Settings</a> (no scopes needed)
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxx"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    background: 'var(--bg-dark)',
                    border: '1px solid var(--bg-border)',
                    borderRadius: '4px',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem'
                  }}
                />
                <button 
                  onClick={handleSaveToken}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'var(--primary-color)',
                    border: 'none',
                    borderRadius: '4px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {/* Repo Preview */}
          {repoPreview && (
            <div style={{
              marginTop: '1.5rem',
              padding: '1rem',
              background: 'var(--bg-card)',
              border: repoPreview.isValid ? '1px solid var(--bg-border)' : '1px solid rgba(239,68,68,0.3)',
              borderRadius: '8px',
              maxWidth: '600px',
              margin: '1.5rem auto',
              position: 'relative'
            }}>
              {repoPreview.isValid ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .839-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                    </svg>
                    <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>
                      {repoPreview.owner}/{repoPreview.repo}
                    </span>
                    {isValidating && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Validating...</span>}
                  </div>
                  
                  {repoPreview.description && (
                    <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {repoPreview.description}
                    </p>
                  )}
                  
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', fontSize: '0.8rem' }}>
                    <span>⭐ {repoPreview.stars?.toLocaleString()}</span>
                    <span>🔀 {repoPreview.forks?.toLocaleString()}</span>
                    {repoPreview.language && <span>💻 {repoPreview.language}</span>}
                  </div>
                  
                  {repoPreview.languages.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Languages:</div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {repoPreview.languages.slice(0, 5).map(lang => (
                          <span key={lang} style={{
                            padding: '0.2rem 0.5rem',
                            background: 'rgba(139,92,246,0.1)',
                            border: '1px solid rgba(139,92,246,0.3)',
                            color: '#c4b5fd',
                            borderRadius: '4px',
                            fontSize: '0.75rem'
                          }}>
                            {lang}
                          </span>
                        ))}
                        {repoPreview.languages.length > 5 && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            +{repoPreview.languages.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fca5a5' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>{repoPreview.error}</span>
                  </div>
                  
                  {repoPreview.isRateLimited && (
                    <div style={{ 
                      padding: '0.75rem', 
                      background: 'rgba(245,158,11,0.05)', 
                      border: '1px solid rgba(245,158,11,0.2)', 
                      borderRadius: '6px',
                      fontSize: '0.8rem'
                    }}>
                      <p style={{ margin: '0 0 0.75rem 0', color: '#d97706' }}>
                        GitHub API capacity reached. Please add a Personal Access Token to continue.
                      </p>
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button 
                          onClick={() => setShowTokenInput(true)}
                          style={{
                            padding: '0.4rem 0.8rem',
                            background: 'transparent',
                            border: '1px solid var(--bg-border)',
                            borderRadius: '4px',
                            color: 'var(--text-main)',
                            fontSize: '0.75rem',
                            cursor: 'pointer'
                          }}
                        >
                          Add Token
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}


          {analyzedRepo ? (
            <div className="dashboard-preview active-analysis">
              <div style={{ textAlign: 'left', marginBottom: '1rem' }}>
                <button 
                  onClick={() => { setAnalyzedRepo(null); setRepoUrl(''); }} 
                  className="btn-reset"
                >
                  ← Analyze Another Workspace
                </button>
              </div>
              <RepoAnalyzer owner={analyzedRepo.owner} repo={analyzedRepo.repo} />
            </div>
          ) : (
            <div className="dashboard-preview">
              <div className="dashboard-header">
                <div className="mac-dot close"></div>
                <div className="mac-dot minimize"></div>
                <div className="mac-dot maximize"></div>
              </div>
              <div className="dashboard-content">
                <div className="sidebar">
                  <div className="sidebar-title">Sections</div>
                  {['Overview', 'Tech Stack', 'Architecture', 'Data Flow', 'Components'].map((tab) => (
                    <div 
                      key={tab}
                      className={`sidebar-item ${dummyTab === tab ? 'active' : ''}`}
                      onClick={() => setDummyTab(tab)}
                    >
                      {tab}
                    </div>
                  ))}
                </div>
                <div className="main-view" style={{ display: 'block', width: '100%' }}>
                  <div className="analyzer-header" style={{ borderBottom: 'none', marginBottom: '1rem', paddingBottom: 0 }}>
                    <h2 style={{ fontSize: '1.25rem' }}>Example Layout <span>for your repository</span></h2>
                  </div>
                  
                  {dummyTab === 'Overview' && (
                    <div className="analysis-grid">
                      <div className="analysis-card">
                        <h3>Language Highlights</h3>
                        <div className="tag-list">
                          <span className="tag lang">TypeScript</span>
                          <span className="tag lang">Rust</span>
                        </div>
                      </div>
                      <div className="analysis-card">
                        <h3>Directory Scanning</h3>
                        <div className="tag-list">
                          <span className="empty-text">Preview directories...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {dummyTab === 'Tech Stack' && (
                    <div className="analysis-grid" style={{ gridTemplateColumns: '1fr' }}>
                      <div className="analysis-card">
                        <h3>Identified Stack dependencies</h3>
                        <div className="tag-list">
                          <span className="tag dep">react</span>
                          <span className="tag dep">next</span>
                          <span className="tag dep">tailwindcss</span>
                          <span className="tag dep">framer-motion</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {dummyTab === 'Architecture' && (
                    <div className="analysis-card" style={{ height: '100%', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{opacity: 0.5, marginBottom: '1rem'}}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                      <h3 style={{ margin: 0 }}>Interactive Diagram Preview</h3>
                      <p style={{ color: 'var(--text-muted)', textAlign: 'center', maxWidth: '400px', fontSize: '0.9rem', marginTop: '0.5rem' }}>Drop a repository link above to map out physical architecture nodes and networking logic automatically.</p>
                    </div>
                  )}

                  {dummyTab === 'Data Flow' && (
                    <div className="analysis-card" style={{ height: '100%', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{opacity: 0.5, marginBottom: '1rem'}}><line x1="22" y1="12" x2="2" y2="12"/><path d="M5 19l-3-7 3-7"/><path d="M19 5l3 7-3 7"/></svg>
                      <h3 style={{ margin: 0 }}>Data Flow Tracking Mockup</h3>
                      <p style={{ color: 'var(--text-muted)', textAlign: 'center', maxWidth: '400px', fontSize: '0.9rem', marginTop: '0.5rem' }}>Visualize exactly how requests flow from the frontend payload to database triggers.</p>
                    </div>
                  )}

                  {dummyTab === 'Components' && (
                    <div className="analysis-grid" style={{ gridTemplateColumns: '1fr' }}>
                      <div className="analysis-card">
                        <h3>Analyzed Roots</h3>
                        <p className="empty-text">Will list all entry points like package.json, dockerfiles, and configurations here.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="features" id="features">
          <h2>Everything developers need to understand code faster.</h2>
          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
              </div>
              <h3>Code Complexity Analysis</h3>
              <p>Automatically detect code complexity, cyclomatic complexity, and maintainability index. Identify technical debt hotspots and refactoring opportunities.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <h3>AI-Powered Code Insights</h3>
              <p>We analyze the repository structure, read crucial files, and use AI to understand the logic, architecture, design patterns, and code quality metrics.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <h3>Commit Activity & Contributors</h3>
              <p>Track commit frequency, active contributors, code churn rates, and development velocity. Understand team dynamics and project health at a glance.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              </div>
              <h3>Interactive Architecture Diagrams</h3>
              <p>Auto-generated system architecture diagrams, dependency graphs, and module relationships. Zoom, pan, and explore the codebase structure visually.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <h3>Security & Vulnerability Scan</h3>
              <p>Detect outdated dependencies, known vulnerabilities, and security issues. Get actionable recommendations to improve code security and compliance.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              </div>
              <h3>Shareable Developer Reports</h3>
              <p>Generate comprehensive reports with one link. Perfect for code reviews, team onboarding, technical interviews, and stakeholder presentations.</p>
            </div>
          </div>
        </section>
      </main>

      <footer id="page-bottom">
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          padding: '3rem 2rem 2rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '2rem',
          borderTop: '1px solid var(--bg-border)'
        }}>
          {/* About Section */}
          <div>
            <h3 style={{ 
              fontSize: '1rem', 
              fontWeight: '600', 
              marginBottom: '1rem',
              color: 'var(--text-main)'
            }}>
              DeveloperDashboard
            </h3>
            <p style={{ 
              fontSize: '0.85rem', 
              color: 'var(--text-muted)', 
              lineHeight: '1.6',
              marginBottom: '1rem'
            }}>
              Analyze any GitHub repository and get instant insights with AI-powered architecture visualization.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" style={{ 
                color: 'var(--text-muted)', 
                fontSize: '1.25rem',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.color = 'var(--primary-color)'}
              onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.003-.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" style={{ 
                color: 'var(--text-muted)', 
                fontSize: '1.25rem',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.color = 'var(--primary-color)'}
              onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
                </svg>
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" style={{ 
                color: 'var(--text-muted)', 
                fontSize: '1.25rem',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.color = 'var(--primary-color)'}
              onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/>
                  <circle cx="4" cy="4" r="2"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 style={{ 
              fontSize: '0.9rem', 
              fontWeight: '600', 
              marginBottom: '1rem',
              color: 'var(--text-main)'
            }}>
              Product
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {['Features', 'Pricing', 'API', 'Documentation', 'Changelog'].map(item => (
                <li key={item} style={{ marginBottom: '0.5rem' }}>
                  <a href={`#${item.toLowerCase()}`} style={{ 
                    color: 'var(--text-muted)', 
                    fontSize: '0.85rem',
                    textDecoration: 'none',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.color = 'var(--primary-color)'}
                  onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 style={{ 
              fontSize: '0.9rem', 
              fontWeight: '600', 
              marginBottom: '1rem',
              color: 'var(--text-main)'
            }}>
              Company
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {['About', 'Blog', 'Careers', 'Contact', 'Partners'].map(item => (
                <li key={item} style={{ marginBottom: '0.5rem' }}>
                  <a href={`#${item.toLowerCase()}`} style={{ 
                    color: 'var(--text-muted)', 
                    fontSize: '0.85rem',
                    textDecoration: 'none',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.color = 'var(--primary-color)'}
                  onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 style={{ 
              fontSize: '0.9rem', 
              fontWeight: '600', 
              marginBottom: '1rem',
              color: 'var(--text-main)'
            }}>
              Legal
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Security', 'GDPR'].map(item => (
                <li key={item} style={{ marginBottom: '0.5rem' }}>
                  <a href={`#${item.toLowerCase().replace(/\s+/g, '-')}`} style={{ 
                    color: 'var(--text-muted)', 
                    fontSize: '0.85rem',
                    textDecoration: 'none',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.color = 'var(--primary-color)'}
                  onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={{ 
          borderTop: '1px solid var(--bg-border)',
          marginTop: '2rem',
          paddingTop: '2rem',
          paddingBottom: '2rem',
          textAlign: 'center'
        }}>
          <p style={{ 
            fontSize: '0.85rem', 
            color: 'var(--text-muted)',
            margin: 0
          }}>
            © 2026 DeveloperDashboard. Built for Developers, by Developers. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Home;
