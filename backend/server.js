const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Recursive function to fetch file tree
async function fetchFileTree(owner, repo, path = '', headers, maxDepth = 3, currentDepth = 0) {
  if (currentDepth >= maxDepth) return [];
  
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const response = await axios.get(url, { headers });
    const items = response.data;
    
    const tree = [];
    
    for (const item of items) {
      if (item.type === 'dir') {
        tree.push({
          type: 'dir',
          name: item.name,
          path: item.path,
          children: await fetchFileTree(owner, repo, item.path, headers, maxDepth, currentDepth + 1)
        });
      } else if (item.type === 'file') {
        tree.push({
          type: 'file',
          name: item.name,
          path: item.path
        });
      }
    }
    
    return tree;
  } catch (error) {
    console.log(`Error fetching tree for ${path}:`, error.message);
    return [];
  }
}

// Architecture analysis helper
function analyzeArchitecture(folders, files, languages) {
  const architecture = {
    type: 'Unknown',
    patterns: [],
    layers: [],
    framework: 'Unknown',
  };

  // Detect project type
  if (files.includes('package.json')) {
    architecture.type = 'JavaScript/Node.js';
    if (files.includes('next.config.js')) architecture.framework = 'Next.js';
    else if (files.includes('vite.config.js')) architecture.framework = 'Vite';
    else if (folders.includes('public') && folders.includes('src')) architecture.framework = 'React/Vue';
    else if (folders.includes('pages')) architecture.framework = 'Next.js';
    else if (folders.includes('packages')) architecture.framework = 'Monorepo';
  } else if (files.includes('requirements.txt') || files.includes('setup.py')) {
    architecture.type = 'Python';
    if (files.includes('manage.py')) architecture.framework = 'Django';
    else if (files.includes('app.py')) architecture.framework = 'Flask';
  } else if (files.includes('Cargo.toml')) {
    architecture.type = 'Rust';
  } else if (files.includes('go.mod')) {
    architecture.type = 'Go';
  } else if (files.includes('pom.xml') || files.includes('build.gradle')) {
    architecture.type = 'Java';
  }

  // Detect architectural patterns (more flexible)
  if (folders.some(f => f.includes('test') || f.includes('spec'))) {
    architecture.patterns.push('Test-Driven Development');
  }
  if (folders.includes('components') || folders.includes('packages')) {
    architecture.patterns.push('Component-Based');
  }
  if (folders.includes('api') || folders.includes('routes') || folders.includes('server')) {
    architecture.patterns.push('API-Driven');
  }
  if (folders.includes('models') && folders.includes('views') && folders.includes('controllers')) {
    architecture.patterns.push('MVC Pattern');
  }
  if (folders.includes('services')) {
    architecture.patterns.push('Service Layer');
  }
  if (files.includes('docker-compose.yml')) {
    architecture.patterns.push('Containerized');
  }
  if (files.includes('Dockerfile')) {
    architecture.patterns.push('Docker');
  }
  if (folders.includes('packages') || folders.includes('modules')) {
    architecture.patterns.push('Modular Architecture');
  }
  if (folders.includes('.github') || folders.includes('.gitlab')) {
    architecture.patterns.push('CI/CD Pipeline');
  }

  // Detect layers (more flexible)
  if (folders.includes('frontend') || folders.includes('client') || folders.includes('src')) {
    architecture.layers.push('Frontend');
  }
  if (folders.includes('backend') || folders.includes('server') || folders.includes('api')) {
    architecture.layers.push('Backend');
  }
  if (folders.includes('database') || folders.includes('db')) {
    architecture.layers.push('Database');
  }
  if (folders.includes('public') || folders.includes('static') || folders.includes('assets')) {
    architecture.layers.push('Static Assets');
  }
  if (folders.includes('scripts') || folders.includes('tools')) {
    architecture.layers.push('Build Tools');
  }
  if (folders.includes('docs') || folders.includes('documentation')) {
    architecture.layers.push('Documentation');
  }

  // If no patterns detected, add generic ones based on project type
  if (architecture.patterns.length === 0) {
    if (architecture.type === 'JavaScript/Node.js') {
      architecture.patterns.push('JavaScript Application');
    }
  }

  // If no layers detected, add generic ones
  if (architecture.layers.length === 0 && folders.length > 0) {
    architecture.layers.push('Source Code');
  }

  return architecture;
}

// Test route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running!' });
});

// A dummy authentication endpoint
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (email && password) {
    res.json({ success: true, token: 'dummy-jwt-token-123', user: { email } });
  } else {
    res.status(400).json({ success: false, message: 'Invalid credentials' });
  }
});

// Proxy for basic Repo Details (to avoid frontend rate limits)
app.get('/api/repo-details/:owner/:repo', async (req, res) => {
  const { owner, repo } = req.params;
  
  try {
    const headers = { Accept: 'application/vnd.github.v3+json' };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
    }

    const [repoRes, langRes] = await Promise.all([
      axios.get(`https://api.github.com/repos/${owner}/${repo}`, { headers }),
      axios.get(`https://api.github.com/repos/${owner}/${repo}/languages`, { headers })
    ]);

    res.json({
      repo: repoRes.data,
      languages: langRes.data
    });
  } catch (error) {
    console.error('GitHub Details API Proxy Error:', error.message);
    const status = error.response?.status || 500;
    res.status(status).json({ error: error.response?.data?.message || 'Failed to fetch details' });
  }
});

// Proxy for GitHub Search API
app.get('/api/search', async (req, res) => {
  const { q, sort, order, per_page = 20 } = req.query;
  
  try {
    const headers = { Accept: 'application/vnd.github.v3+json' };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
    }

    const response = await axios.get('https://api.github.com/search/repositories', {
      headers,
      params: { q, sort, order, per_page }
    });

    res.json(response.data);
  } catch (error) {
    console.error('GitHub Search API Proxy Error:', error.message);
    const status = error.response?.status || 500;
    res.status(status).json({ error: 'Failed to search repositories' });
  }
});

// Groq AI Chat Endpoint
app.post('/api/chat', async (req, res) => {
  const { message, history, repoContext } = req.body;

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'Groq API Key not configured on server' });
  }

  try {
    // Prune context to avoid token limits
    const prunedContext = repoContext ? {
      name: `${repoContext.owner}/${repoContext.repo}`,
      description: repoContext.description,
      languages: repoContext.languages,
      architecture: repoContext.architecture,
      dependencies: repoContext.dependencies,
      importantFiles: repoContext.importantFiles
    } : 'No repository analyzed yet.';

    const systemPrompt = `You are an expert AI Software Architect and Mentor for the DeveloperDashboard. 
    Your goal is to provide deep, structured insights into codebases.
    Respond with clear headings and step-by-step breakdowns. 
    Keep your explanations thorough but efficient—ensure their length is appropriate for a sidebar chat window.

    STORYTELLING/PRESENTATION MODE:
    If the user is presenting, help them explain "How it works" or "Where is X" concisely and impressively. 
    Mention the 'Architecture' and 'Onboarding' tabs for visual support.

    Context of the analyzed repository: 
    ${JSON.stringify(prunedContext)}
    
    Response Guidelines:
    1. Use Markdown headers and lists.
    2. Be thorough but avoid fluff.
    3. Refer to the directory paths in backticks (e.g., \`src/main.js\`).
    4. Format your responses in rich Markdown.`;

    const chatMessages = [
      { role: 'system', content: systemPrompt },
      ...(history || []).map(msg => ({
        role: msg.isBot ? 'assistant' : 'user',
        content: msg.text
      })),
      { role: 'user', content: message }
    ];

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.1-8b-instant',
      messages: chatMessages,
      temperature: 0.7,
      max_tokens: 1024
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({ reply: response.data.choices[0].message.content });
  } catch (error) {
    console.error('Groq AI Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'The AI Mentor is currently offline. Please try again later.' });
  }
});

// Proxy for GitHub API — uses server-side token for unlimited requests
app.get('/api/analyze/:owner/:repo', async (req, res) => {
  const { owner, repo } = req.params;
  
  try {
    const headers = { Accept: 'application/vnd.github.v3+json' };
    
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
    }

    // Fetch repo info, languages, and contents in parallel
    const [repoRes, langRes, contentsRes, commitsRes] = await Promise.all([
      axios.get(`https://api.github.com/repos/${owner}/${repo}`, { headers }),
      axios.get(`https://api.github.com/repos/${owner}/${repo}/languages`, { headers }),
      axios.get(`https://api.github.com/repos/${owner}/${repo}/contents`, { headers }),
      axios.get(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=10`, { headers }).catch(() => ({ data: [] })),
    ]);

    const languages = Object.keys(langRes.data);
    const folderStructure = [];
    const importantFiles = [];
    let hasPackageJson = false;

    contentsRes.data.forEach(item => {
      if (item.type === 'dir') folderStructure.push(item.name);
      else if (item.type === 'file') {
        if (item.name === 'package.json') hasPackageJson = true;
        if ([
          'README.md', 'package.json', '.gitignore', 'docker-compose.yml',
          'Dockerfile', 'index.js', 'main.py', 'tsconfig.json', 'vite.config.js',
          'next.config.js', 'app.py', 'manage.py', 'Cargo.toml', 'go.mod',
          'requirements.txt', 'setup.py', 'pom.xml', 'build.gradle'
        ].includes(item.name)) {
          importantFiles.push(item.name);
        }
      }
    });

    // Fetch dependencies if package.json exists
    let dependencies = [];
    if (hasPackageJson) {
      try {
        const defaultBranch = repoRes.data.default_branch || 'main';
        const pkgRes = await axios.get(`https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/package.json`);
        const allDeps = { ...pkgRes.data.dependencies, ...pkgRes.data.devDependencies };
        dependencies = Object.keys(allDeps).slice(0, 15);
      } catch (err) {
        console.log('Error parsing package.json');
      }
    }

    // Check remaining rate limit
    const remaining = langRes.headers['x-ratelimit-remaining'];
    const limit = langRes.headers['x-ratelimit-limit'];
    console.log(`GitHub API: ${remaining}/${limit} requests remaining`);

    // Fetch full file tree (up to 3 levels deep)
    const fileTree = await fetchFileTree(owner, repo, '', headers, 3);

    // Analyze architecture based on files and folders
    const architecture = analyzeArchitecture(folderStructure, importantFiles, languages);
    
    // Get recent commits info
    const recentCommits = commitsRes.data.slice(0, 5).map(commit => ({
      message: commit.commit.message.split('\n')[0],
      author: commit.commit.author.name,
      date: commit.commit.author.date,
    }));

    res.json({
      languages,
      folderStructure,
      importantFiles,
      dependencies,
      description: repoRes.data.description || '',
      stars: repoRes.data.stargazers_count || 0,
      forks: repoRes.data.forks_count || 0,
      defaultBranch: repoRes.data.default_branch || 'main',
      architecture,
      recentCommits,
      size: repoRes.data.size || 0,
      openIssues: repoRes.data.open_issues_count || 0,
      createdAt: repoRes.data.created_at,
      updatedAt: repoRes.data.updated_at,
      fileTree,
    });

  } catch (error) {
    console.error('GitHub API Proxy Error:', error.message);
    const status = error.response?.status || 500;
    const msg = status === 403
      ? 'GitHub API rate limited. Add GITHUB_TOKEN to backend/.env for unlimited access.'
      : 'Failed to analyze repository. It might be private or API rate limited.';
    res.status(status).json({ error: msg });
  }
});

app.listen(PORT, () => {
  const hasToken = !!process.env.GITHUB_TOKEN;
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔑 GitHub Token: ${hasToken ? 'Active (5,000 req/hr)' : 'NOT SET (60 req/hr)'}`);
  if (!hasToken) {
    console.log('   → Add GITHUB_TOKEN=ghp_xxx to backend/.env for unlimited API access\n');
  }
});
