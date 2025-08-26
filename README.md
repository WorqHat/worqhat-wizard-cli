# WorqHat Wizard

A zero-setup CLI that scans your project, scaffolds WorqHat integration files, installs needed packages, writes usage docs, and optionally commits and opens a pull request for you.

⚠️ Experimental: This wizard is still in an experimental phase. If you have any feedback, please email sagnik@worqhat.com.

WorqHat wizard ✨
The WorqHat wizard helps you quickly add WorqHat to your project using AI.

Works with JavaScript/TypeScript, plus guidance for Python and Ruby projects.

---

## Features

* **Project scan**: Detects languages and generates a project tree snapshot.
* **Guided setup**: Choose to scaffold Workflows and/or Database helpers.
* **Smart scaffolding**: Creates `worqhat/config.*`, `worqhat/workflows.*`, and `worqhat/db.*` (when applicable).
* **Docs generation**: Appends clear usage docs to `WORQHAT.md` per generated file.
* **Package install**: Installs language-appropriate dependencies.
* **Git automation**: Creates a dedicated branch, commits, pushes, and opens a PR via GitHub CLI (if available).

---

## Requirements

* Node.js >= 18
* Git installed and a Git repository (for branch/commit/PR automation)
* Optional: GitHub CLI (`gh`) for automatic PR creation

---

## Installation

Global install (recommended):

```bash
npm i -g @worqhat/wizard
```

Then run from any repository root:

```bash
worqhat-wizard
```

Or use npx without global install:

```bash
npx @worqhat/wizard
```

In a monorepo, run the wizard at the package root you want to scaffold.

---

## Quick Start

1. In your Git repo, run `worqhat-wizard`.
2. Follow the prompts to pick WorqHat components (Workflows, Database).
3. When asked, provide your WorqHat API key.
4. Review newly created files and the `WORQHAT.md` guide.
5. The wizard will commit your changes on a dedicated branch and push a PR (if `gh` is available).

---

## What it generates

Depending on your choices and detected language, the wizard generates:

* `WORQHAT.md`: A living guide with project snapshot and usage docs.
* `worqhat/config.*`: WorqHat client config and environment setup guidance.
* `worqhat/workflows.*`: Starter workflow helpers (examples avoid importing/passing the client explicitly).
* `worqhat/db.*`: Optional database helpers when you select Database.

It will also append documentation sections (Overview, API, Examples) to `WORQHAT.md` for the generated files.

---

## CLI usage and options

| Option                   | Type    | Default        | Description                                                                                              |
|--------------------------|---------|----------------|----------------------------------------------------------------------------------------------------------|
| --help                   | boolean | —              | Show help                                                                                                |
| --version                | boolean | —              | Show version number                                                                                      |
| --force-install          | boolean | false          | Force install packages even if peer dependency checks fail                                               |
| --logout                 | boolean | —              | Remove saved API key                                                                                     |
| --branch-prefix <prefix> | string  | worqhat-wizard | Prefix for the new git branch created by the wizard (format: --branch-prefix <prefix> or --branch-prefix=<prefix>) |

Examples:

```bash
# Show version and help
worqhat-wizard --version
worqhat-wizard --help

# Create a branch using a custom prefix
worqhat-wizard --branch-prefix my-init

# Force dependency installation if peer checks fail
worqhat-wizard --force-install

# Remove stored API key and exit
worqhat-wizard --logout
```

---

## Branching, commits, and PRs

The wizard prepares work on a dedicated branch before making changes:

* Creates and checks out a branch named `<prefix>/<YYYY-MM-DD-HHMMSS>` (default prefix: `worqhat-wizard`).
* Stages and commits all changes with a descriptive message.
* Pushes the branch to `origin`.
* If the GitHub CLI (`gh`) is available, opens a pull request and prints a confirmation.

If a Git repository is not detected, the wizard skips these steps and informs you.

---

## Configuration and secrets

* On first run, the wizard prompts for your WorqHat API key.
* `WORQHAT.md` includes an Environment Setup section explaining how to set `WORQHAT_API_KEY` via shell or `.env`.
* Never commit secrets to version control. Treat `.env` files with care and add them to `.gitignore`.


## Troubleshooting

* __No Git repo detected__: Initialize Git first (`git init`) or run in an existing repo. The wizard can still generate files without Git.
* __Cannot push or create PR__: Ensure `origin` is set and you have permissions. Install `gh` to enable automatic PR creation.
* __Package installation issues__: Use `--force-install` to bypass strict peer checks, or install dependencies manually as prompted.
* __Missing API key__: Re-run the wizard and supply the key, or set `WORQHAT_API_KEY` in your shell/.env. Use `--logout` to remove the stored key.

---

## Uninstall

Global uninstall:

```bash
npm uninstall -g @worqhat/wizard
```

Remove stored API key if desired:

```bash
worqhat-wizard --logout
```

---

## License

MIT