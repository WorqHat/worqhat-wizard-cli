<!-- Banner -->
<p align="center">
  <img src="https://assets.worqhat.com/announcements/wizard-cli-header.png" alt="WorqHat Wizard banner" />
</p>

# WorqHat Wizard

A zero-setup CLI that scans your project, scaffolds WorqHat integration files, installs needed packages, writes usage docs, and optionally commits and opens a pull request for you.

> ⚠️ **Experimental:** This wizard is still in an experimental phase. If you have any feedback, please drop an email to sagnik [at] worqhat [dot] com.

WorqHat wizard ✨
The WorqHat wizard helps you quickly add WorqHat to your project using AI.

Works with JavaScript/TypeScript, plus guidance for Python and Ruby projects.

---

## Features

* **Project scan**: Detects languages and generates a project tree snapshot.
* **Guided setup**: Choose to scaffold Workflows, Database helpers, and/or Storage helpers.
* **Environment-aware database**: Select specific environments to fetch tables from, ensuring helpers are tailored to your deployment setup.
* **Smart scaffolding**: Creates `worqhat/config.*`, `worqhat/workflows.*`, `worqhat/db.*`, and `worqhat/storage.*` (when applicable).
* **Auto-validation**: Automatically validates generated TypeScript/JavaScript files and fixes common errors using AI.
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
2. Follow the prompts to pick WorqHat components (Workflows, Database, Storage).
3. When asked, provide your WorqHat API key.
4. If you selected **Database**, choose which environments to fetch tables from (e.g., production, staging).
5. If you selected **Workflows**, pick specific workflows to scaffold from your WorqHat account.
6. Review newly created files and the `WORQHAT.md` guide.
7. The wizard automatically validates and fixes generated code for TypeScript/JavaScript errors.
8. The wizard will commit your changes on a dedicated branch and push a PR (if `gh` is available).

---

## What it generates

Depending on your choices and detected language, the wizard generates:

* **`WORQHAT.md`**: A living guide with project snapshot and usage docs.
* **`worqhat/config.*`**: WorqHat client config with API key setup and environment configuration.
* **`worqhat/workflows.*`**: Workflow helpers for your selected workflows (client is auto-imported from config).
* **`worqhat/db.*`**: Environment-aware database helpers with functions for insert, update, delete, executeQuery (with named parameters), and processNlQuery (natural language queries). Includes all tables from your selected environments.
* **`worqhat/storage.*`**: Storage helpers for file upload, retrieval by ID/path, and deletion.

All generated files:
* Include extensive inline comments to guide developers
* Are automatically validated and fixed for TypeScript/JavaScript syntax errors
* Come with language-specific typings (TypeScript) or JSDoc (JavaScript)
* Have documentation appended to `WORQHAT.md` with overview, API reference, and usage examples

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
* `WORQHAT.md` includes an Environment Setup section explaining how to set:
  * **`WORQHAT_API_KEY`**: Your API key for authenticating with WorqHat services
  * **`WORQHAT_ENVIRONMENT`**: (Optional) Database environment to use (defaults to `'production'`)
* All database operations include the environment parameter to ensure you're working with the correct data tier
* Never commit secrets to version control. Treat `.env` files with care and add them to `.gitignore`.


## Troubleshooting

* **No Git repo detected**: Initialize Git first (`git init`) or run in an existing repo. The wizard can still generate files without Git.
* **Cannot push or create PR**: Ensure `origin` is set and you have permissions. Install `gh` to enable automatic PR creation.
* **Package installation issues**: Use `--force-install` to bypass strict peer checks, or install dependencies manually as prompted.
* **Missing API key**: Re-run the wizard and supply the key, or set `WORQHAT_API_KEY` in your shell/.env. Use `--logout` to remove the stored key.
* **No environments available**: If you don't see any environments when selecting database options, ensure your organization has environments configured in WorqHat.
* **Validation errors persist**: The wizard automatically attempts to fix TypeScript/JavaScript errors up to 3 times. If errors remain, check the generated code manually and verify your TypeScript configuration.
* **Storage helpers not generated**: Ensure you selected "Storage" during the component selection step. The wizard will skip storage generation if not selected.
* **Natural language queries not working**: Ensure `WORQHAT_ENVIRONMENT` is set correctly. The `processNlQuery` function automatically determines which tables to query based on your question.

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

## Open Source and Contributions

WorqHat Wizard is an open-source project. We welcome contributions from the community to help us build and improve it further.

How you can contribute:

* **Report bugs**: Open an Issue with clear steps to reproduce and environment details.
* **Suggest features**: Share your ideas and use-cases in an Issue for discussion.
* **Submit pull requests**: Fork the repo, create a feature branch, and open a PR with a concise description and rationale. Include tests and docs when applicable.

Guidelines:

* Keep PRs focused and small where possible.
* Follow the existing code style and add/update documentation (e.g., `README.md` or `WORQHAT.md`) when needed.
* Be respectful and collaborative in discussions and reviews.

Thank you to everyone who takes the time to file issues, give feedback, or contribute code—your support helps make the wizard better for everyone.

---

## License

MIT
