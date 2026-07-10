# Sweepy

This project is a web app for my household. Its primary goal is to be a chore tracker and organizer.

## Tech Stack

- Framework: Nuxt 4 (Typescript)
- Package Manager: pnpm (always use pnpm, never npm or yarn)
- Database: SQLite w/ Drizzle ORM

## AI Agent Orchestration

When working on large tasks, please use subagents to delegate and breakdown work. Leverage an orchestrator to delegate taks and use sub agents to execute those tasks. Ensure you choose models efficienyly for these subagents. Its not wise to use the same agent for an orchestrator vs subagents tasks.


### ✅ Always
- Run linting before committing
- List only human authors in git commits
- leverage gitmoji for commit messages (IMPORTANT)

### ⚠️ Ask First
- Database schema changes
- Adding new dependencies

### 🚫 Never
- Commit secrets or `.env` files
- Force push to main
- Modify content within [protected] blocks