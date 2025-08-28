#!/usr/bin/env node

import fs from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import chalk from 'chalk'
import { prompt } from 'enquirer'
import { fetch } from 'undici'
import pkg from '../package.json'
import { ensureApiKey, logout as logoutAuth } from './auth'
import { buildProjectTree } from './build-tree'
import { writeScaffoldFiles } from './file-writer'
import { ensureWizardBranch } from './git'
import { promptInstallOptions } from './install-options'
import { type Language, installPackagesForLanguage } from './package-install'
import detectProject, { type DetectResult } from './project-detection'
import createSpinner from './spinner'
import { fetchTables } from './tables'
import { fetchAndSelectWorkflows } from './workflows'
import { spawnSync } from 'node:child_process'

// Collect up to 2 sample files in the chosen language to guide config generation
async function findLanguageSamples(
	cwd: string,
	language: 'typescript' | 'javascript' | 'python' | 'ruby',
): Promise<Array<{ path: string; content: string }>> {
	const exts = {
		typescript: ['.ts', '.tsx'],
		javascript: ['.js', '.jsx', '.mjs', '.cjs'],
		python: ['.py'],
		ruby: ['.rb'],
	}[language]
	const skipDirs = new Set([
		'node_modules',
		'.git',
		'dist',
		'build',
		'.next',
		'.turbo',
		'.cache',
		'.venv',
		'__pycache__',
	])
	const results: Array<{ path: string; content: string }> = []
	const stack: string[] = [cwd]
	const MAX_BYTES = 100 * 1024
	while (stack.length && results.length < 1) {
		const dir = stack.pop() as string
		let entries: string[] = []
		try {
			entries = fs.readdirSync(dir)
		} catch {
			continue
		}
		for (const name of entries) {
			if (results.length >= 2) break
			const full = path.join(dir, name)
			let stat: fs.Stats
			try {
				stat = fs.statSync(full)
			} catch {
				continue
			}
			if (stat.isDirectory()) {
				if (!skipDirs.has(name)) stack.push(full)
				continue
			}
			const ext = path.extname(name).toLowerCase()
			if (!exts.includes(ext)) continue
			try {
				const size = stat.size
				if (size > MAX_BYTES) continue
				const rel = path.relative(cwd, full)
				const content = fs.readFileSync(full, 'utf8')
				results.push({ path: rel, content })
			} catch {
				// ignore unreadable files
			}
		}
	}
	return results
}

const printWelcome = () => {
	const title = chalk.bold.cyan('Welcome to the WorqHat setup wizard ✨')
	const line = `┌  ${title}`
	console.log(line)
	console.log('│')
}

printWelcome()

// Run immediately on invocation
;(async () => {
	const argv = process.argv.slice(2)
	const has = (flag: string) => argv.includes(flag)
	const getFlagValue = (flag: string): string | undefined => {
		const eq = argv.find((a) => a.startsWith(`${flag}=`))
		if (eq) return eq.split('=')[1]
		const idx = argv.findIndex((a) => a === flag)
		if (idx !== -1 && argv[idx + 1] && !argv[idx + 1].startsWith('--')) return argv[idx + 1]
		return undefined
	}

	// handle --help
	if (has('--help')) {
		const lines = [
			chalk.bold('The following CLI arguments are available:'),
			'',
			`${chalk.cyan('--help')}\n  Show help\n  boolean`,
			'',
			`${chalk.cyan('--version')}\n  Show version number\n  boolean`,
			'',
			`${chalk.cyan('--force-install')}\n  Force install packages even if peer dependency checks fail\n  boolean\n  default: false`,
			'',
			`${chalk.cyan('--logout')}\n  Remove saved API key from credentials\n  boolean`,
			'',
			`${chalk.cyan('--branch-prefix')}\n  Prefix for the new git branch created by the wizard (format: --branch-prefix <prefix> or --branch-prefix=<prefix>)\n  string\n  default: worqhat-wizard`,
			'',
		]
		console.log(lines.join('\n'))
		process.exit(0)
	}

	// handle --version
	if (has('--version')) {
		console.log(pkg.version)
		process.exit(0)
	}

	const cwd = process.cwd()
	const manifest = path.join(cwd, 'WORQHAT.md')
	const spinner = createSpinner('Scanning project tree and detecting languages...')
	spinner.start()
	let detected: DetectResult
	let langs: string[]
	let tree: string
	let chosenLang: string | undefined
	let scaffoldPaths: string[] | undefined
	try {
		detected = detectProject(cwd)
		langs = detected.languages.length ? detected.languages : ['unknown']
		tree = buildProjectTree(cwd)
		spinner.succeed('Scan complete')
	} catch (e) {
		spinner.fail('Scan failed')
		throw e
	}

	// Before making any changes, create a dedicated git branch
	const branchPrefix = getFlagValue('--branch-prefix') || 'worqhat-wizard'
	const branch = await ensureWizardBranch(cwd, branchPrefix)

	const content = `# WorqHat Project\n\nInitialized with WorqHat Wizard.\n\n- Date: ${new Date().toISOString()}\n- Detected Frameworks: ${detected.frameworks.join(', ') || 'none'}\n- Detected Languages: ${langs.join(', ')}\n\n## Project Tree\n\n\`\`\`\n${tree}\n\`\`\`\n`

	fs.writeFileSync(manifest, content)
	console.log('✅ Wrote WORQHAT.md')
	console.log(chalk.green(`✔ Identified language(s): ${langs.join(', ')}`))

	// Credential file paths
	const secretsDir = path.join(homedir(), '.worqhat')
	const secretsFile = path.join(secretsDir, 'credentials.json')

	// Handle --logout: delete credentials and exit
	if (has('--logout')) {
		logoutAuth(secretsFile)
		process.exit(0)
	}

	// Ensure API key (prompts if missing)
	const { apiKey } = await ensureApiKey(secretsFile)

	// Ask user what to install (multi-select)
	const choices = await promptInstallOptions()
	const parts: string[] = []
	if (choices.workflows) parts.push('Workflows')
	if (choices.database) parts.push('Database')
	console.log(chalk.green(`✔ Selected: ${parts.join(', ') || 'None'}`))

	// If workflows selected, fetch workflows from backend and prompt multiselect
	let selectedWorkflowNames: string[] = []
	let selectedWorkflows: Array<{ id: string; name: string }> = []
	if (choices.workflows) {
		const { selectedIds, selectedNames, items } = await fetchAndSelectWorkflows(apiKey)
		if (selectedIds.length) {
			const lines = items
				.filter((w) => selectedIds.includes(w.id))
				.map((w) => `- ${w.name} (${w.id})`)
				.join('\n')
			const section = `\n## Selected Workflows\n\n${lines}\n`
			fs.appendFileSync(manifest, section)
			console.log(chalk.green('✔ Updated WORQHAT.md with selected workflows.'))
			selectedWorkflowNames = selectedNames?.length
				? selectedNames
				: items.filter((w) => selectedIds.includes(w.id)).map((w) => w.name)
			// Keep id+name objects for backend payload
			selectedWorkflows = items
				.filter((w) => selectedIds.includes(w.id))
				.map((w) => ({ id: w.id, name: w.name }))
		}
	}

	let selectedTableNames: string[] = []
	if (choices.database) {
		const { tables } = await fetchTables(apiKey)
		if (!tables.length) {
			console.log(chalk.yellow('No tables found or unable to fetch.'))
		} else {
			console.log(chalk.green(` Found ${tables.length} table(s).`))
			console.log('')
			console.log(chalk.bold('Select tables to use'))
			console.log(
				chalk.dim('Use ↑/↓ to move, Space to select/deselect, A to toggle all, Enter to confirm.'),
			)
			let selected: string[] = []
			try {
				const ans = await prompt<{ tables: string[] }>([
					{
						type: 'multiselect',
						name: 'tables',
						message: 'Tables',
						choices: tables.map((t) => ({ name: t, message: t })),
					},
				])
				selected = ans.tables || []
			} catch {
				selected = []
			}

			if (selected.length) {
				const lines = selected.map((t) => `- ${t}`).join('\n')
				const section = `\n## Selected Tables\n\n${lines}\n`
				fs.appendFileSync(manifest, section)
				console.log(chalk.green('✔ Updated WORQHAT.md with selected tables.'))
				selectedTableNames = selected
			} else {
				console.log(chalk.yellow('No tables selected.'))
			}
		}
	}

	try {
		const baseUrl = 'https://cli.worqhat.app'
		const pref = ['typescript', 'javascript', 'python', 'ruby']
		const lower = langs.map((l) => l.toLowerCase())
		const chosen = pref.find((p) => lower.includes(p)) || 'javascript'
		const scaffoldSpin = createSpinner('Requesting new files from backend...')
		scaffoldSpin.start()
		const res = await fetch(`${baseUrl}/scaffold`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				language: chosen,
				currentTree: tree,
				selectedWorkflows: selectedWorkflowNames,
				selectedTables: selectedTableNames,
			}),
		})
		if (!res.ok) throw new Error(`HTTP ${res.status}`)
		const body = (await res.json()) as {
			ok: boolean
			language?: string
			thinking?: string
			tree?: string
			paths?: string[]
		}
		// response parsed
		if (!body.ok || !Array.isArray(body.paths)) {
			scaffoldSpin.fail('Failed to get new files proposal')
		} else {
			chosenLang = body.language || chosen
			scaffoldPaths = body.paths
			// Create files from proposed paths
			writeScaffoldFiles(cwd, body.paths, body.language || chosen)
			scaffoldSpin.succeed(`New files ready (${body.language || chosen})`)
			if (body.thinking) {
				console.log(`\n${chalk.bold.cyan('===== Thinking =====')}`)
				console.log(body.thinking)
				console.log(`${chalk.bold.cyan('===== End Thinking =====')}\n`)
			}
			// Append proposed tree and file list to WORQHAT.md
			const thinkingSection = body.thinking ? `\n## Thinking\n\n${body.thinking}\n` : ''
			const treeSection = `\n## Proposed WorqHat Structure\n\n\`\`\`\n${body.tree || ''}\n\`\`\`\n\nFiles:\n\n${body.paths.map((p) => `- ${p}`).join('\n')}\n${thinkingSection}`
			fs.appendFileSync(manifest, treeSection)
			console.log(chalk.green('✔ Created new files and updated WORQHAT.md.'))

			// Install necessary packages for the selected language
			console.log('')
			console.log(chalk.bold('Installing required packages for WorqHat...'))
			const langStr = (body.language || chosen).toLowerCase()
			const allowed: Language[] = ['typescript', 'javascript', 'python', 'ruby']
			const language = (allowed.includes(langStr as Language) ? langStr : 'javascript') as Language
			await installPackagesForLanguage({
				cwd,
				language,
				hasWorkflows: !!choices.workflows,
				hasDatabase: !!choices.database,
				forceInstall: has('--force-install'),
			})
			const codeSamples = await findLanguageSamples(cwd, language)

			// Generate config code via backend and write into the created config file
			const configPath = (scaffoldPaths || []).find((p) =>
				/(^|\/)worqhat\/config\.[a-z]+$/i.test(p),
			)
			if (configPath) {
				try {
					const genSpin = createSpinner('Generating WorqHat config...')
					genSpin.start()

					const cfgRes = await fetch(`${baseUrl}/scaffold/config`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json', 'x-worqhat-api-key': apiKey },
						body: JSON.stringify({
							language: language,
							targetPath: configPath,
							samples: codeSamples,
						}),
					})

					if (!cfgRes.ok) throw new Error(`HTTP ${cfgRes.status}`)

					const cfgBody = (await cfgRes.json()) as {
						ok: boolean
						path?: string
						code?: string
					}

					if (!cfgBody.ok || !cfgBody.path || typeof cfgBody.code !== 'string') {
						throw new Error('Invalid response from config generation')
					}

					const full = path.join(cwd, cfgBody.path)
					fs.writeFileSync(full, cfgBody.code, 'utf8')
					genSpin.succeed(`Config generated at ${cfgBody.path}`)
				} catch (err) {
					console.error(chalk.red('Config generation failed:'), err)
				}
			} else {
				console.log(chalk.yellow('Config path not proposed; skipping config generation.'))
			}

			// Generate db code via backend and write into the created db file
			const dbPath = (scaffoldPaths || []).find((p) => /(^|\/)worqhat\/db\.[a-z]+$/i.test(p))
			if (choices.database && dbPath) {
				try {
					const dbSpin = createSpinner('Generating WorqHat DB helpers...')
					dbSpin.start()

					// Read the generated config file to pass as reference
					let configFileCode = ''
					try {
						const configPath = (scaffoldPaths || []).find((p) =>
							/(^|\/)worqhat\/config\.[a-z]+$/i.test(p),
						)
						if (configPath) {
							const configFullPath = path.join(cwd, configPath)
							if (fs.existsSync(configFullPath)) {
								configFileCode = fs.readFileSync(configFullPath, 'utf8')
							}
						}
					} catch {
						// Ignore config read errors
					}

					const dbRes = await fetch(`${baseUrl}/scaffold/db`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json', 'x-worqhat-api-key': apiKey },
						body: JSON.stringify({
							language: language,
							targetPath: dbPath,
							configFileCode: configFileCode,
							tables: selectedTableNames,
							samples: codeSamples,
						}),
					})
					if (!dbRes.ok) throw new Error(`HTTP ${dbRes.status}`)
					const dbBody = (await dbRes.json()) as {
						ok: boolean
						path?: string
						code?: string
					}
					if (!dbBody.ok || !dbBody.path || typeof dbBody.code !== 'string') {
						throw new Error('Invalid response from db generation')
					}

					const full = path.join(cwd, dbBody.path)
					fs.writeFileSync(full, dbBody.code, 'utf8')
					dbSpin.succeed(`DB helpers generated at ${dbBody.path}`)
				} catch (err) {
					console.error(chalk.red('DB generation failed:'), err)
				}
			} else {
				console.log(chalk.yellow('DB path not proposed; skipping db generation.'))
			}

			// Generate workflows code via backend and write into the created workflows file
			const workflowsPath = (scaffoldPaths || []).find((p) =>
				/(^|\/)worqhat\/workflows\.[a-z]+$/i.test(p),
			)
			if (choices.workflows && workflowsPath) {
				try {
					const workflowsSpin = createSpinner('Generating WorqHat workflows helpers...')
					workflowsSpin.start()

					// Read the generated config file to pass as reference
					let configFileCode = ''
					try {
						const configPath = (scaffoldPaths || []).find((p) =>
							/(^|\/)worqhat\/config\.[a-z]+$/i.test(p),
						)
						if (configPath) {
							const configFullPath = path.join(cwd, configPath)
							if (fs.existsSync(configFullPath)) {
								configFileCode = fs.readFileSync(configFullPath, 'utf8')
							}
						}
					} catch {
						// Ignore config read errors
					}

					const workflowsRes = await fetch(`${baseUrl}/scaffold/workflows`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json', 'x-worqhat-api-key': apiKey },
						body: JSON.stringify({
							samples: codeSamples,
							language: language,
							targetPath: workflowsPath,
							configFileCode: configFileCode,
							workflows: selectedWorkflows,
						}),
					})
					if (!workflowsRes.ok) throw new Error(`HTTP ${workflowsRes.status}`)
					const workflowsBody = (await workflowsRes.json()) as {
						ok: boolean
						path?: string
						code?: string
					}
					if (!workflowsBody.ok || !workflowsBody.path || typeof workflowsBody.code !== 'string') {
						throw new Error('Invalid response from workflows generation')
					}

					const full = path.join(cwd, workflowsBody.path)
					fs.writeFileSync(full, workflowsBody.code, 'utf8')
					workflowsSpin.succeed(`Workflows helpers generated at ${workflowsBody.path}`)
				} catch (err) {
					console.error(chalk.red('Workflows generation failed:'), err)
				}
			} else {
				console.log(chalk.yellow('Workflows path not proposed; skipping workflows generation.'))
			}

			// After generating all files, produce documentation for each created file
			try {
				const targets: Array<{ label: string; relPath: string }> = []
				const configRel = (scaffoldPaths || []).find((p) =>
					/(^|\/)worqhat\/config\.[a-z]+$/i.test(p),
				)
				const dbRel = (scaffoldPaths || []).find((p) => /(^|\/)worqhat\/db\.[a-z]+$/i.test(p))
				const workflowsRel = (scaffoldPaths || []).find((p) =>
					/(^|\/)worqhat\/workflows\.[a-z]+$/i.test(p),
				)
				if (configRel) targets.push({ label: 'config', relPath: configRel })
				if (choices.database && dbRel) targets.push({ label: 'db', relPath: dbRel })
				if (choices.workflows && workflowsRel)
					targets.push({ label: 'workflows', relPath: workflowsRel })

				for (const t of targets) {
					const abs = path.join(cwd, t.relPath)
					if (!fs.existsSync(abs)) continue
					const code = fs.readFileSync(abs, 'utf8')
					const spin = createSpinner(`Generating documentation for ${t.label}...`)
					spin.start()
					try {
						const docsRes = await fetch(`${baseUrl}/docs/explain`, {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
								'x-worqhat-api-key': apiKey,
							},
							body: JSON.stringify({
								language: chosenLang || 'typescript',
								filename: path.basename(abs),
								code,
							}),
						})
						if (!docsRes.ok) throw new Error(`HTTP ${docsRes.status}`)
						const docsBody = (await docsRes.json()) as { ok: boolean; docs?: string }
						if (!docsBody.ok || typeof docsBody.docs !== 'string') {
							throw new Error('Invalid response from docs generation')
						}
						fs.appendFileSync(manifest, `${docsBody.docs}\n`)
						spin.succeed('Docs appended to WORQHAT.md')
					} catch (err) {
						spin.fail(`Failed to generate docs for ${t.label}`)
						console.error(err)
					}
				}

				// Show a dashed completion box once docs are generated
				try {
					const msgLines = [
						'We have set up your basic WorqHat configuration.',
						'Open WORQHAT.md to learn how to use it in your projects.',
					]
					const width = Math.max(...msgLines.map((l) => l.length)) + 4
					const hr = '-'.repeat(width)
					console.log(`\n${chalk.cyan(hr)}`)
					for (const l of msgLines) {
						const padded = l.padEnd(width - 4)
						console.log(chalk.cyan(`- ${padded} -`))
					}
					console.log(`${chalk.cyan(hr)}\n`)
				} catch (_) {
					// no-op if printing fails
				}
			} catch (err) {
				console.error(chalk.red('Documentation generation step failed:'), err)
			}

			try {
				// Verify Git repository
				const repoCheck = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd })
				if (repoCheck.status !== 0) {
					console.log(chalk.yellow('Skipping commit and PR: not inside a Git repository.'))
				} else {
					// Use the branch created earlier by ensureWizardBranch
					const branchName = branch?.name
					const title = 'feat(worqhat): initial WorqHat setup and docs'
					const bodyLines = [
						'Adds WorqHat configuration, initial workflows scaffolding, and usage documentation to help you get started quickly.',
						'',
						"What's included:",
						'- worqhat/config: client configuration and environment setup instructions',
						'- worqhat/workflows: starter workflow functions with strong comments and error handling',
						'- WORQHAT.md: how to use the generated pieces in your project',
						'',
						'Notes:',
						'- Secrets: set WORQHAT_API_KEY in your shell or .env (see WORQHAT.md).',
						"- Workflows examples intentionally do not pass/import the client — it's already wired in.",
					]
					const body = bodyLines.join('\n')

					if (branchName) {
						console.log(chalk.green(`Using branch: ${branchName}`))
						const checkout = spawnSync('git', ['checkout', branchName], { cwd, stdio: 'inherit' })
						if (checkout.status !== 0) throw new Error('Failed to switch to the wizard branch')
					} else {
						console.log(
							chalk.yellow('No dedicated wizard branch was created; using current branch.'),
						)
					}

					console.log(chalk.green('Staging files...'))
					const add = spawnSync('git', ['add', '-A'], { cwd, stdio: 'inherit' })
					if (add.status !== 0) throw new Error('Failed to stage files')

					console.log(chalk.green('Creating commit with message and description...'))
					const commit = spawnSync('git', ['commit', '-m', title, '-m', body], {
						cwd,
						stdio: 'inherit',
					})
					if (commit.status !== 0) {
						console.log(
							chalk.yellow(
								'No changes to commit or commit failed. Continuing to PR step if possible.',
							),
						)
					}

					console.log(chalk.green('Pushing branch to origin...'))
					const pushRef = branchName || 'HEAD'
					const push = spawnSync('git', ['push', '-u', 'origin', pushRef], {
						cwd,
						stdio: 'inherit',
					})
					if (push.status !== 0) {
						console.log(
							chalk.yellow(
								'Could not push branch to origin. Ensure a remote is set and you have permissions. Skipping PR creation.',
							),
						)
					} else {
						// Use GitHub CLI if available to create the PR
						const ghCheck = spawnSync('gh', ['--version'], { cwd })
						if (ghCheck.status === 0) {
							console.log(chalk.green('Creating a pull request...'))
							const prBody = [
								'# WorqHat setup and documentation',
								'',
								'## Summary',
								'Initialize WorqHat in this repository with configuration, starter workflows, and a usage guide (WORQHAT.md).',
								'',
								'## Changes',
								'- Add worqhat/config with environment setup guidance (WORQHAT_API_KEY).',
								'- Add worqhat/workflows with example functions and comments (no client passed in examples).',
								'- Generate WORQHAT.md with usage, API overview, and examples.',
								'',
								'## How to use',
								'- Read WORQHAT.md for environment setup and examples.',
								"- Import workflow functions from './worqhat/workflows' directly (no client argument).",
							].join('\n')
							const pr = spawnSync('gh', ['pr', 'create', '--title', title, '--body', prBody], {
								cwd,
								stdio: 'inherit',
							})
							if (pr.status === 0) {
								console.log(chalk.green('Pull request has been created.'))
							} else {
								console.log(
									chalk.yellow(
										'Failed to create PR via GitHub CLI. You may create it manually on your Git host.',
									),
								)
							}
						} else {
							console.log(
								chalk.yellow(
									'GitHub CLI (gh) not found. Skipping PR creation. You can create a PR from your Git host UI.',
								),
							)
						}
					}
				}
			} catch (err) {
				console.log(chalk.red('Automatic commit/PR step failed:'), err)
			}
		}
		// end of response OK else branch
	} catch (err) {
		console.error(chalk.red('Failed during scaffolding:'), err)
	}
})().catch((err) => {
	console.error(chalk.red('Unexpected error:'), err)
	process.exit(1)
})
