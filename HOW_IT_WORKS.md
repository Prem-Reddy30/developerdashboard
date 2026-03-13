# How DeveloperDashboard Sections Work

## Overview of the Analysis Flow

When you enter a GitHub repository URL (e.g., `https://github.com/facebook/react`), the app:

1. **Parses the URL** to extract `owner` (facebook) and `repo` (react)
2. **Checks cache** first (localStorage) for instant results
3. **Fetches from backend** (http://localhost:5000) which uses your GitHub token
4. **Falls back to GitHub API** directly if backend is unavailable
5. **Displays results** in 5 different sections

---

## Section 1: Overview

**What it shows:**
- Top programming languages used in the repo
- Key directories/folders in the project
- Repository description, stars, and forks

**How it works:**
```javascript
// Backend fetches from GitHub API:
GET https://api.github.com/repos/{owner}/{repo}/languages
// Returns: { "JavaScript": 12345, "TypeScript": 67890, "CSS": 1234 }

GET https://api.github.com/repos/{owner}/{repo}/contents
// Returns: Array of files and folders at root level

GET https://api.github.com/repos/{owner}/{repo}
// Returns: Repo metadata (description, stars, forks, etc.)
```

**Data displayed:**
- Languages: Extracted from `languages` API (Object.keys)
- Folders: Filtered from `contents` API (type === 'dir')
- Stats: From repo metadata API

---

## Section 2: Tech Stack

**What it shows:**
- Primary dependencies from package.json
- Lists up to 15 main dependencies

**How it works:**
```javascript
// If package.json exists in root:
GET https://raw.githubusercontent.com/{owner}/{repo}/main/package.json

// Parse the JSON and extract:
const allDeps = {
  ...pkgData.dependencies,      // Production dependencies
  ...pkgData.devDependencies    // Development dependencies
}

// Display first 15 dependencies
dependencies = Object.keys(allDeps).slice(0, 15)
```

**Example output:**
- react, react-dom, express, axios, lodash, etc.

---

## Section 3: Architecture

**Current status:** Placeholder/Coming Soon

**What it's designed to show:**
- System architecture diagrams
- Component relationships
- Module dependencies visualization

**How it could work (future enhancement):**
1. Parse all files in the repository
2. Analyze import/export statements
3. Build a dependency graph
4. Generate visual diagram using libraries like:
   - D3.js for interactive graphs
   - Mermaid for diagram generation
   - Cytoscape.js for network visualization

---

## Section 4: Data Flow

**Current status:** Placeholder/Coming Soon

**What it's designed to show:**
- How data flows through the application
- API request/response patterns
- Database interactions
- State management flow

**How it could work (future enhancement):**
1. Analyze API routes and endpoints
2. Track data transformations
3. Map database queries
4. Visualize the data pipeline

---

## Section 5: Components

**What it shows:**
- Core configuration files
- Entry point files
- Important project files

**How it works:**
```javascript
// From the contents API, filter for important files:
const importantFileNames = [
  'README.md',
  'package.json',
  '.gitignore',
  'docker-compose.yml',
  'Dockerfile',
  'index.js',
  'main.py',
  'tsconfig.json',
  'vite.config.js',
  'next.config.js',
  'app.py',
  'manage.py',
  'Cargo.toml',
  'go.mod',
  'requirements.txt',
  'setup.py',
  'pom.xml',
  'build.gradle'
];

// Check if each file exists in the repo root
importantFiles = contents.filter(item => 
  item.type === 'file' && 
  importantFileNames.includes(item.name)
)
```

---

## Backend API Endpoint

**Endpoint:** `GET /api/analyze/:owner/:repo`

**What it does:**
1. Makes parallel requests to GitHub API:
   - Repository info
   - Languages used
   - Root contents
2. Parses package.json if it exists
3. Returns consolidated data

**Response format:**
```json
{
  "languages": ["JavaScript", "TypeScript", "CSS"],
  "folderStructure": ["src", "public", "tests"],
  "importantFiles": ["package.json", "README.md", "vite.config.js"],
  "dependencies": ["react", "react-dom", "vite", "axios"],
  "description": "A JavaScript library for building user interfaces",
  "stars": 220000,
  "forks": 45000,
  "defaultBranch": "main"
}
```

---

## Caching System

**Why caching?**
- Reduces API calls to GitHub
- Faster load times
- Saves rate limit quota

**How it works:**
```javascript
// Cache key format: "owner/repo"
// Stored in localStorage
{
  "facebook/react": {
    "data": { /* analysis results */ },
    "timestamp": 1234567890
  }
}

// Cache expires after 24 hours
if (Date.now() - entry.timestamp < 24 * 60 * 60 * 1000) {
  return cached data
}
```

---

## Rate Limiting

**Without token:** 60 requests/hour (GitHub API limit)
**With token:** 5,000 requests/hour

**How the app handles it:**
1. Backend uses token from `.env` file
2. Frontend can optionally use token from localStorage
3. If rate limited, shows error message

---

## Future Enhancements

To make Architecture and Data Flow sections functional:

1. **Add code parsing:**
   - Use AST (Abstract Syntax Tree) parsers
   - Analyze import/export statements
   - Map function calls and data flow

2. **Add visualization libraries:**
   - D3.js for interactive graphs
   - Mermaid for diagram generation
   - React Flow for node-based diagrams

3. **Add more GitHub API calls:**
   - Commits history
   - Contributors data
   - Pull requests and issues
   - Code frequency stats

4. **Add AI analysis:**
   - Use OpenAI/Claude API to analyze code
   - Generate architecture descriptions
   - Suggest improvements
