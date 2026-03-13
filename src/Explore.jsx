import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function Explore() {
  const [trendingRepos, setTrendingRepos] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch initial trending repositories
  useEffect(() => {
    const fetchTrending = async () => {
      setLoading(true);
      
      try {
        // 1. Try backend first (for higher rate limits)
        const res = await fetch('http://localhost:5000/api/search?q=stars:>50000&sort=stars&order=desc&per_page=12');
        if (res.ok) {
          const data = await res.json();
          const mapped = data.items.map(item => ({
            owner: item.owner.login,
            repo: item.name,
            description: item.description || 'No description available.',
            stars: item.stargazers_count,
            forks: item.forks_count,
            language: item.language || 'Multiple',
            tags: item.topics || []
          }));
          setTrendingRepos(mapped);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.log('Backend search unavailable');
      }

      // 2. Fallback to direct GitHub API
      const token = localStorage.getItem('github_token');
      const headers = { Accept: 'application/vnd.github.v3+json' };
      if (token) headers.Authorization = `token ${token}`;

      try {
        const res = await fetch('https://api.github.com/search/repositories?q=stars:>50000&sort=stars&order=desc&per_page=12', { headers });
        if (res.ok) {
          const data = await res.json();
          const mapped = data.items.map(item => ({
            owner: item.owner.login,
            repo: item.name,
            description: item.description || 'No description available.',
            stars: item.stargazers_count,
            forks: item.forks_count,
            language: item.language || 'Multiple',
            tags: item.topics || []
          }));
          setTrendingRepos(mapped);
        } else {
          setTrendingRepos(sampleRepos);
        }
      } catch (err) {
        setTrendingRepos(sampleRepos);
      } finally {
        setLoading(false);
      }
    };

    fetchTrending();
  }, []);

  const handleAnalyzeRepo = (repo) => {
    // Navigate to home with repo pre-filled
    window.location.href = `/?repo=${repo.owner}/${repo.repo}`;
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);

    try {
      // 1. Try backend search first
      const res = await fetch(`http://localhost:5000/api/search?q=${encodeURIComponent(searchQuery)}&sort=stars&order=desc&per_page=20`);
      if (res.ok) {
        const data = await res.json();
        const mapped = data.items.map(item => ({
          owner: item.owner.login,
          repo: item.name,
          description: item.description || 'No description available.',
          stars: item.stargazers_count,
          forks: item.forks_count,
          language: item.language || 'Multiple',
          tags: item.topics || []
        }));
        setTrendingRepos(mapped);
        setLoading(false);
        return;
      }
    } catch (err) {
      console.log('Backend search failed, fallback to GitHub API');
    }

    // 2. Fallback to direct GitHub API
    const token = localStorage.getItem('github_token');
    const headers = { Accept: 'application/vnd.github.v3+json' };
    if (token) headers.Authorization = `token ${token}`;

    try {
      const res = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(searchQuery)}&sort=stars&order=desc&per_page=20`, { headers });
      if (res.ok) {
        const data = await res.json();
        const mapped = data.items.map(item => ({
          owner: item.owner.login,
          repo: item.name,
          description: item.description || 'No description available.',
          stars: item.stargazers_count,
          forks: item.forks_count,
          language: item.language || 'Multiple',
          tags: item.topics || []
        }));
        setTrendingRepos(mapped);
      } else {
        const errData = await res.json();
        alert(`Search failed: ${errData.message || 'Unknown error'}`);
      }
    } catch (err) {
      alert('Search failed. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Sample data fallback
  const sampleRepos = [
    {
      owner: 'facebook',
      repo: 'react',
      description: 'A declarative, efficient, and flexible JavaScript library for building user interfaces.',
      stars: 226000,
      forks: 46000,
      language: 'JavaScript',
      tags: ['frontend', 'library', 'ui']
    },
    {
      owner: 'microsoft',
      repo: 'vscode',
      description: 'Visual Studio Code - open source code editor developed by Microsoft.',
      stars: 142000,
      forks: 25000,
      language: 'TypeScript',
      tags: ['editor', 'ide', 'development']
    }
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
      {/* Header */}
      <header style={{ 
        background: 'var(--bg-card)', 
        borderBottom: '1px solid var(--bg-border)',
        padding: '1rem 0',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          padding: '0 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '4rem'
        }}>
          <Link to="/" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            textDecoration: 'none',
            color: 'var(--text-main)'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
            </svg>
            <span style={{ fontWeight: '700', fontSize: '1.25rem' }}>DeveloperDashboard</span>
          </Link>
          
          <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <Link to="/explore" style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: '500' }}>Explore</Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ 
        padding: '6rem 2rem', 
        textAlign: 'center',
        background: 'radial-gradient(circle at top, rgba(139,92,246,0.15) 0%, transparent 70%), linear-gradient(135deg, rgba(139,92,246,0.05) 0%, rgba(59,130,246,0.05) 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div className="hero-bg-glow" style={{ top: '-10%', left: '50%', transform: 'translateX(-50%)', opacity: 0.4 }}></div>
        <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <h1 style={{ 
            fontSize: '3.5rem', 
            fontWeight: '800', 
            marginBottom: '1.5rem',
            letterSpacing: '-0.03em',
            background: 'linear-gradient(135deg, #fff 0%, #a78bfa 50%, #60a5fa 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            lineHeight: 1.1
          }}>
            Explore GitHub <br /> Ecosystem
          </h1>
          <p style={{ 
            fontSize: '1.25rem', 
            color: 'var(--text-secondary)', 
            marginBottom: '3rem',
            lineHeight: 1.6,
            maxWidth: '700px',
            margin: '0 auto 3rem'
          }}>
            Search through millions of repositories to instantly visualize architecture, complexity, and tech stacks.
          </p>
          
          {/* Search Bar */}
          <div style={{ 
            display: 'flex', 
            gap: '0.75rem', 
            maxWidth: '700px', 
            margin: '0 auto',
            background: 'rgba(23, 23, 33, 0.7)',
            backdropFilter: 'blur(12px)',
            padding: '0.6rem',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '1rem', color: 'var(--text-muted)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by name, owner, or topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              style={{
                flex: 1,
                padding: '0.8rem 0.5rem',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-main)',
                fontSize: '1.1rem',
                fontWeight: '400'
              }}
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              style={{
                padding: '0 2rem',
                background: 'var(--primary-color)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                fontWeight: '600',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
              }}
              onMouseEnter={(e) => e.target.style.transform = 'translateY(-1px)'}
              onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
            >
              {loading ? (
                <>
                  <div className="profile-spinner" style={{ width: '16px', height: '16px', borderTopColor: 'white' }}></div>
                  Searching...
                </>
              ) : (
                'Search'
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Repository Grid */}
      <section style={{ padding: '5rem 2rem', background: 'var(--bg-main)' }}>
        <div style={{ maxWidth: '1300px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}>
            <div>
              <h2 style={{ 
                fontSize: '2rem', 
                fontWeight: '700', 
                color: 'var(--text-main)',
                marginBottom: '0.5rem'
              }}>
                {searchQuery ? 'Search Results' : 'Trending Universes'}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
                {searchQuery ? `Showing top matches for "${searchQuery}"` : 'Most analyzed repositories in the developer community'}
              </p>
            </div>
            {!searchQuery && (
              <div style={{ fontSize: '0.9rem', color: 'var(--primary-color)', fontWeight: '500' }}>
                Sort: Most Starred ↓
              </div>
            )}
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', 
            gap: '2.5rem' 
          }}>
            {trendingRepos.map((repo, index) => (
              <div key={index} style={{
                background: 'rgba(30, 30, 45, 0.4)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '20px',
                padding: '2rem',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.background = 'rgba(30,30,45, 0.7)';
                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.background = 'rgba(30, 30, 45, 0.4)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              onClick={() => handleAnalyzeRepo(repo)}
              >
                {/* Decorative background element */}
                <div style={{ 
                  position: 'absolute', 
                  top: '-50px', 
                  right: '-50px', 
                  width: '120px', 
                  height: '120px', 
                  background: 'rgba(139, 92, 246, 0.05)', 
                  borderRadius: '50%',
                  filter: 'blur(40px)'
                }}></div>

                {/* Repository Header */}
                <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.75rem',
                    marginBottom: '1rem'
                  }}>
                    <div style={{ 
                      width: '40px', 
                      height: '40px', 
                      background: 'rgba(255,255,255,0.05)', 
                      borderRadius: '10px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--text-muted)">
                        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .839-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '-2px' }}>{repo.owner}</div>
                      <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '1.2rem' }}>
                        {repo.repo}
                      </div>
                    </div>
                  </div>
                  
                  <p style={{ 
                    color: 'var(--text-secondary)', 
                    fontSize: '0.95rem',
                    lineHeight: 1.6,
                    marginBottom: '1.5rem',
                    display: '-webkit-box',
                    WebkitLineClamp: '3',
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    height: '4.8rem'
                  }}>
                    {repo.description}
                  </p>

                  {/* Stats */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '1.25rem', 
                    marginBottom: '1.5rem',
                    fontSize: '0.9rem',
                    background: 'rgba(0,0,0,0.2)',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    width: 'fit-content'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ color: '#fbbf24' }}>★</span>
                      <span style={{ fontWeight: '500', color: 'var(--text-main)' }}>{repo.stars > 999 ? (repo.stars / 1000).toFixed(1) + 'k' : repo.stars}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>⑂</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{repo.forks > 999 ? (repo.forks / 1000).toFixed(1) + 'k' : repo.forks}</span>
                    </div>
                    {repo.language && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-color)' }}></div>
                        <span style={{ color: 'var(--text-secondary)' }}>{repo.language}</span>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    {repo.tags.slice(0, 3).map((tag, tagIndex) => (
                      <span key={tagIndex} style={{
                        padding: '0.3rem 0.8rem',
                        background: 'rgba(139,92,246,0.08)',
                        border: '1px solid rgba(139,92,246,0.15)',
                        color: '#c4b5fd',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        fontWeight: '500'
                      }}>
                        {tag}
                      </span>
                    ))}
                    {repo.tags.length > 3 && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', alignSelf: 'center' }}>
                        +{repo.tags.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                {/* Analyze Button */}
                <div style={{ marginTop: 'auto', paddingTop: '1.5rem' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAnalyzeRepo(repo);
                    }}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      background: 'rgba(255,255,255,0.03)',
                      color: 'var(--text-main)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '14px',
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                      fontWeight: '600',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--primary-color)';
                      e.currentTarget.style.color = 'white';
                      e.currentTarget.style.borderColor = 'transparent';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                      e.currentTarget.style.color = 'var(--text-main)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    }}
                  >
                    Analyze Universe
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {trendingRepos.length === 0 && !loading && (
            <div style={{ 
              textAlign: 'center', 
              padding: '6rem 3rem',
              color: 'var(--text-muted)',
              background: 'var(--bg-card)',
              borderRadius: '24px',
              border: '1px dashed var(--bg-border)'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔭</div>
              <h3 style={{ fontSize: '1.5rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>No celestial bodies found</h3>
              <p>Try searching for a different scope or keyword.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default Explore;
