# DevGuardian

**An AI-assisted security agent for GitHub repositories.** DevGuardian clones a repository, scans it with Semgrep, scores its risk, asks Gemini to explain each finding and suggest a fix based on the real vulnerable code, and opens a GitHub pull request only after a human approves.

> Built as a solo project to practise full-stack engineering, secure API design and applied AI.

## How it works

```
Connect repo → Clone → Semgrep scan (Docker) → Findings (file, line, code)
      → Risk score → Gemini fix suggestion → Developer approval → GitHub pull request
```

1. **Connect** a GitHub repository (`owner/repo`).
2. **Scan**: the backend clones or updates the repo, then runs Semgrep in Docker with JavaScript, Node.js, OWASP Top 10 and secrets rule sets.
3. **Review findings**: each finding shows its rule, severity, file, line and Semgrep's message.
4. **Propose fix**: Gemini receives the flagged code with context and returns a before/after fix.
5. **Approve or reject**: nothing reaches GitHub without an explicit approval.
6. **Pull request**: on approval, DevGuardian pushes a branch and opens a real PR.

## Features

- JWT authentication (access and refresh tokens), with automatic refresh in the frontend
- GitHub repository connection and management
- Semgrep scanning in Docker, with clear errors if Docker or git fails
- Findings with file path, line number, message and code snippet
- Risk score per repository, recalculated after each scan
- AI fix suggestions grounded in the actual code, with model fallback and quota handling
- Human-in-the-loop approval before any pull request is created
- Duplicate protection: one pending proposal per finding
- Dark-themed React dashboard: repositories, findings, fix review and settings

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Java 21, Spring Boot, Spring Security, Spring Data JPA, Lombok |
| Auth | JWT (jjwt), BCrypt |
| Database | PostgreSQL |
| Scanning | Semgrep (Docker), git CLI |
| AI | Google Gemini API |
| Integrations | GitHub REST API |
| Frontend | React 18, TypeScript, Vite, React Router, Axios |
| API docs | Swagger / OpenAPI |

## Architecture

```
React (Vite) ──/api──▶ Spring Boot ──▶ PostgreSQL
                          │
                          ├─▶ git (clone/update)  ─▶ Semgrep in Docker
                          ├─▶ Gemini API          (explanations and fixes)
                          └─▶ GitHub API          (branches and pull requests)
```

Backend packages: `auth`, `user`, `repository`, `scanner`, `risk`, `ai`, `pr`.

## Getting started

### Prerequisites
Java 21, Node.js 18+, PostgreSQL, Docker Desktop, Git, a Gemini API key, and a GitHub personal access token with the `repo` scope.

### 1. Database
Create an empty PostgreSQL database named `devguardian`.

### 2. Backend
Set these environment variables (never commit them):

| Variable | Purpose |
|---|---|
| `DB_PASSWORD` | PostgreSQL password |
| `JWT_SECRET` | Long random string used to sign tokens |
| `GEMINI_API_KEY` | Google AI Studio key |
| `GITHUB_TOKEN` | GitHub token (`repo` scope) |

Run the Spring Boot app. It listens on `http://localhost:8080`, and Swagger is at `/swagger-ui/index.html`.

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
Open the URL Vite prints (usually `http://localhost:5173`). The dev server proxies `/api` to the backend.

### 4. Try it
Register, then connect a repo under **Settings**, open it, click **Run Full Scan**, and use **Propose fix** on a finding. Approve it on the **PR Review** page to open a real pull request.

## Screenshots

| Findings | Fix review | Pull request |
|---|---|---|
| ![Findings](docs/findings.png) | ![Fix review](docs/fixes.png) | ![Pull request](docs/pr.png) |

## API overview

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | Register and sign in |
| POST | `/api/repos/connect` | Connect a repository |
| GET | `/api/repos` | List repositories |
| POST | `/api/scans/start/{repoId}` | Run a scan |
| GET | `/api/repos/{repoId}/scans` | Scan history |
| GET | `/api/scans/{scanId}/findings` | Findings of a scan |
| GET | `/api/risk/{repoId}` | Latest risk score |
| POST | `/api/pr/propose/{findingId}` | Generate an AI fix proposal |
| POST | `/api/pr/{id}/approve` | Approve and open a GitHub PR |
| POST | `/api/pr/{id}/reject` | Reject a proposal |

## Security notes

- Secrets are read from environment variables, never from source.
- Gemini and GitHub keys stay on the server and are never sent to the browser.
- The scanner resets its cached clone to match GitHub on every scan.
- Pull requests are created only after explicit approval.

## Current limitations and roadmap

- The pull request currently adds a Markdown file with the suggested fix. It does not yet patch the source file automatically.
- Only Semgrep is integrated. Dependency scanning (Trivy) and secret scanning (TruffleHog) are planned.
- The Gemini free tier limits daily requests.
- Planned: automatic code patches in the PR, webhook-triggered scans, per-finding status tracking and tests for the scanner and PR modules.

## License

MIT
