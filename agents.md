# Sweepy

This project is a web app for my household. Its primary goal is to be a chore tracker and organizer.

## Tech Stack

- Framework: Nuxt 4 (Typescript)
- Package Manager: pnpm (always use pnpm, never npm or yarn)
- Database: SQLite w/ Drizzle ORM

## AI Agent Orchestration

When working on large tasks, please use subagents to delegate and breakdown work. Leverage an orchestrator to delegate taks and use sub agents to execute those tasks. Ensure you choose models efficienyly for these subagents. Its not wise to use the same agent for an orchestrator vs subagents tasks.

## Commit Message Guidelines

Use **[Gitmoji](https://gitmoji.dev)** format (required):

```text
<gitmoji> [scope?] <short summary>

[optional body]
```

### Rules
- **Gitmoji** (required): leading emoji from the [gitmoji guide](https://gitmoji.dev) that matches the intent of the change
- **Scope** (optional): affected area in parentheses, e.g. `(auth)`, `(api)`
- **Summary**: imperative mood ("add", not "added"), lowercase, no period, ≤ 72 chars
- **Body** (optional): explain *what* and *why*, not *how*; wrap at 72 chars
- Breaking changes: note in the body/footer with `BREAKING CHANGE:`
- Issue refs go in the footer (e.g. `Refs: #123`), not the summary line

### Common gitmojis
| Emoji | Code | Use when |
| --- | --- | --- |
| ✨ | `:sparkles:` | New feature |
| 🐛 | `:bug:` | Bug fix |
| 🚑 | `:ambulance:` | Critical hotfix |
| ♻️ | `:recycle:` | Refactor |
| ⚡ | `:zap:` | Performance |
| 📝 | `:memo:` | Documentation |
| ✅ | `:white_check_mark:` | Tests |
| 🔧 | `:wrench:` | Configuration |
| 📦 | `:package:` | Dependencies / packages |
| 🔥 | `:fire:` | Remove code or files |
| 🎨 | `:art:` | Structure / format |
| 💄 | `:lipstick:` | UI / style |
| 🗃️ | `:card_file_box:` | Database / schema |
| 👷 | `:construction_worker:` | CI |

Prefer the actual emoji character in the commit subject (e.g. `✨`), not the shortcode.

### Examples

```text
✨ (auth) add token refresh on session expiry

🐛 (api) handle null response from user endpoint

📦 update dependencies to latest minor versions

🗃️ (db) add chores table indexes
```

### Don'ts
- No vague messages ("fix stuff", "updates")
- No multiple unrelated changes in one commit
- No commits without a gitmoji prefix
- No issue numbers in the summary line (put refs in footer, e.g. `Refs: #123`)

### ✅ Always
- Run linting before committing
- List only human authors in git commits
- Prefix every commit with the correct gitmoji (IMPORTANT)

### ⚠️ Ask First
- Database schema changes
- Adding new dependencies

### 🚫 Never
- Commit secrets or `.env` files
- Force push to main
- Modify content within [protected] blocks

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues (via `gh`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — root `CONTEXT.md` + `docs/adr/`. See `docs/agents/domain.md`.
