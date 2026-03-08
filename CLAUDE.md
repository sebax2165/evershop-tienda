# EverShop Tienda - Project Instructions

## Language
- All UI, comments, and communication in Spanish
- Code identifiers in English

## Tech Stack
- Express.js 4.21 + React 17 + PostgreSQL + GraphQL 16
- ES Modules (`"type": "module"`)
- SWC for compilation, Webpack 5 for bundling
- Tailwind CSS 4.1
- JWT authentication (admin + customer tokens)
- Node 20 (Alpine in Docker)

## Non-Negotiable Rules
- Use pnpm for package management
- NEVER modify database schema directly - use EverShop migration system
- ALL API endpoints require the `/api/` prefix (e.g., `/api/user/tokens`, `/api/products`)
- API responses wrap data in `{"data": {...}}` format
- Error responses use `{"error": {"message": "...", "status": 400}}`
- Extensions MUST have `dist/`, `.swcrc`, `package.json` with `"type": "module"`
- Extensions use EXPORTED paths, NOT `src/` paths (e.g., `@evershop/evershop/lib/postgres`)
- Never commit `.env` files - they contain secrets
- Auth uses Bearer tokens: `Authorization: Bearer <accessToken>`

## Project Structure
- `packages/evershop/src/modules/` - Core modules (catalog, checkout, customer, oms, etc.)
- `extensions/` - 3 active extensions: one-step-checkout, tracking-pixels, dropi-integration
- `config/default.json` - Shop config (language: es, extensions list)
- `translations/es/` - Spanish translation CSVs

## Deployment
- Railway: https://evershop-tienda-production.up.railway.app
- DB: PostgreSQL on Railway (internal: `postgres.railway.internal`, public: `yamabiko.proxy.rlwy.net:25010`)
- Volume: `/app/media` for persistent images
- Push to main auto-deploys

## Local Development
- Compile first: `npm run compile && npm run compile:db`
- Run: `npm run dev` (requires DB connection via `.env`)
- Increase memory for long sessions: `NODE_OPTIONS="--max-old-space-size=4096" npm run dev`

## Admin Credentials
- Email: admin@evershop.io
- Password: Admin1234
- Login endpoint: `POST /api/user/tokens`

---

# Claude Code Feature Decision Matrix

Use this matrix to decide WHERE to put instructions, automation, and integrations.

## 1. CLAUDE.md (THIS FILE) - Always-On Instructions
**Rule: If Claude should ALWAYS know it, put it here.**
- Project-wide standards (tech stack, coding conventions)
- Non-negotiable rules (never modify DB directly, always use /api/ prefix)
- Import paths and project structure
- Deployment configuration
- Context cost: HIGH (loaded every session, always consuming tokens)

## 2. Skills (.claude/skills/) - On-Demand Expertise
**Rule: If Claude should know it SOMETIMES, make it a Skill.**
- PR review checklists -> `/review`
- Deployment procedures -> `/deploy`
- Commit message format -> `/commit`
- Code scaffolding templates -> `/scaffold`
- Testing procedures -> `/test`
- Context cost: LOW (only description in context, full content loads on demand)

### When to use Skills vs CLAUDE.md:
| Instruction | Where |
|---|---|
| "Always use TypeScript strict mode" | CLAUDE.md |
| "PR review checklist with 20 items" | Skill |
| "Never modify DB schema directly" | CLAUDE.md |
| "Step-by-step deployment procedure" | Skill |
| "API prefix is /api/" | CLAUDE.md |
| "How to create a new extension" | Skill |

## 3. Sub-Agents (.claude/agents/) - Isolated Workers
**Rule: If it should run in ISOLATION with its own context, use a Sub-agent.**
- Codebase exploration (read-only, uses Haiku for speed)
- Code review (restricted to Read, Grep, Glob tools)
- Research tasks (prevent cluttering main context)
- Each agent gets its own context window - verbose output stays isolated
- Can have persistent memory across sessions
- Context cost: ZERO (runs in separate context window)

### Built-in agents:
- `Explore` - Fast codebase search (Haiku model, read-only)
- `Plan` - Architecture research during plan mode
- `General-purpose` - Full tool access for multi-step tasks

### Custom agent example:
Create `.claude/agents/code-reviewer.md` with:
- Name, description, tool restrictions (Read, Grep, Glob only)
- Model selection (route to Haiku for cost optimization)
- Persistent memory for patterns seen across sessions

## 4. Hooks (.claude/settings.json) - Event-Driven Automation
**Rule: If it should happen AUTOMATICALLY on every matching event, use a Hook.**
- Auto-format files after every edit (PostToolUse on Write/Edit)
- Block destructive commands (PreToolUse on Bash - block `rm -rf`)
- Run linting after file changes
- Run tests after edits
- Context cost: ZERO (runs outside Claude's context entirely)

### Hook event types:
- `PreToolUse` - Before Claude runs a tool (can block with exit code 2)
- `PostToolUse` - After a tool runs (auto-format, lint, test)
- `SessionStart` - When session begins
- `Stop` - When Claude finishes responding

### Example hooks:
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "command": "check-destructive-command.sh"
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "command": "prettier --write $FILE_PATH"
      }
    ]
  }
}
```

## 5. MCP Servers (.mcp.json) - External Integrations
**Rule: If Claude needs EXTERNAL tools or data, connect an MCP Server.**
- GitHub PRs and issues
- Database queries (Postgres)
- Error monitoring (Sentry)
- Project management (Jira, Linear)
- Design files (Figma)
- Messaging (Slack)
- Context cost: MODERATE (tool search dynamically loads tools on demand)

### Currently connected:
- Railway MCP (deployment management)
- TestSprite MCP (automated testing)
- Pencil MCP (design files)

---

## Quick Decision Guide

| Question | Answer | Feature |
|---|---|---|
| Should Claude ALWAYS know this? | Yes | CLAUDE.md |
| Should Claude know this SOMETIMES? | Yes | Skills |
| Should this run in ISOLATION? | Yes | Sub-agents |
| Should this happen AUTOMATICALLY on events? | Yes | Hooks |
| Does Claude need EXTERNAL tools? | Yes | MCP Servers |

## Context Window Impact

| Feature | Context Cost | When Loaded |
|---|---|---|
| CLAUDE.md | HIGH | Every session |
| Skills | LOW | Only when invoked |
| Sub-agents | ZERO | Own context window |
| Hooks | ZERO | Outside context |
| MCP Servers | MODERATE | On demand |
