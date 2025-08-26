# Security Policy

We take security very seriously and design this CLI to operate locally with minimal permissions and no exfiltration of your source code.

---

## Our Commitments

- **Your code never leaves your machine.**
- **No source files are uploaded or transmitted.**
- The wizard only inspects your **local file tree structure** (names and folders) to determine the best place to create new directories and files.
- All analysis and generation happen **locally** on your system.

---

## Scope of Local Access

- Reads directory and file paths to understand project layout.
- May read minimal file metadata when necessary (e.g., extension names) to determine language/framework.
- Writes generated files (e.g., WorqHat config, workflows, docs) locally in your repository.
- Does not send file contents, paths, or metadata to external services.

---

## Network Behavior

- Package installation uses your local package manager (e.g., npm) and may contact public registries.
- Optional git and GitHub operations (branch, push, PR) occur only when you opt in and are executed using your local credentials/config.
- The wizard itself does not transmit your code, file tree, or project metadata to external services.

---

## Secrets Handling

- Never commit secrets to version control.
- If you provide a WorqHat API key, it is used locally for configuration only.
- Store secrets in environment variables or a local `.env` file that is gitignored.

---

## Supported Versions

We aim to provide security fixes for actively maintained releases.
We always recommend using the latest version of WorqHat Wizard to ensure you get all security updates.

| Version line            | Status               | Security fixes |
|-------------------------|----------------------|----------------|
| Current (latest minor)  | Active               | Yes            |
| N-1 minor               | Maintenance          | Critical only  |
| Older                   | End of support (EoS) | No             |

“N-1 minor” means the previous minor release line relative to the latest published version on npm.

---

## Reporting a Vulnerability

Please report security vulnerabilities to security@worqhat.com.

We currently do not operate a bug bounty program, but we will generously reward you with merch for any actionable security vulnerabilities found.

When reporting, include details to reproduce, affected versions, environment, and any relevant logs (if safe to share).

---

## Vulnerability Classification and CVSS Policy

We use CVSS v3.1 (or later) to guide severity and target timelines. Final priority may also consider exploitability, affected user base, and availability of mitigations.

| Severity  | CVSS range | Target initial response | Target fix/mitigation |
|-----------|------------|-------------------------|-----------------------|
| Critical  | 9.0–10.0   | 24 hours                | 7 days                |
| High      | 7.0–8.9    | 2 business days         | 14 days               |
| Medium    | 4.0–6.9    | 5 business days         | 30 days               |
| Low       | 0.1–3.9    | 10 business days        | Best effort           |

Timelines are goals, not guarantees; coordinated disclosure is appreciated.

---

## Coordinated Disclosure Process

1. **Report privately** via the email above (optionally encrypted with PGP).
2. **Acknowledgment**: We confirm receipt and assign a tracking ID.
3. **Triage**: Validate scope/impact, determine severity, and reproduce.
4. **Mitigation**: Develop a fix, validate, and prepare release notes.
5. **Release**: Publish patched version(s) and advisory.
6. **Credit**: With reporter consent, we acknowledge contributions.

Safe harbor: We will not pursue legal action against good-faith research that abides by this policy, avoids privacy violations/disruption, and provides a reasonable time for remediation.

---

## Supply Chain and Dependency Security

- Use pinned/semver-ranged dependencies with routine updates.
- Prefer well-maintained packages with transparent security posture.
- Review changelogs for security-relevant changes before upgrading.
- CI uses read-only tokens where possible; releases are tagged and built with reproducible steps.

---

## Build and CI Security

- CI is configured to avoid leaking secrets and to restrict publish operations to protected contexts.
- Release publishing requires explicit credentials (e.g., npm token) and tagged builds.
- No project code or file-structure telemetry is uploaded during CI.

---

## Out of Scope (for reports)

- Issues that require privileged local access beyond typical developer permissions.
- Social engineering, physical attacks, or denial-of-service without a specific, actionable software flaw.
- Vulnerabilities exclusively in third-party dependencies (please report upstream), unless caused by our usage.

---

## Hardening Recommendations

- Review generated diffs before committing and pushing.
- Keep dependencies up to date; enable Dependabot/Renovate if desired.
- Restrict write permissions in CI to protected branches.
- Use environment variables and secret managers for sensitive values.
- Consider pre-commit hooks and static analysis for additional assurance.

---

## Contact

For any questions or reports, contact: **sagnik [at] worqhat [dot] com**. We will acknowledge and address valid reports as quickly as possible.
