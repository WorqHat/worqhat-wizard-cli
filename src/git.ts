import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import chalk from 'chalk'

function runGit(args: string[], cwd: string) {
	return spawnSync('git', args, { cwd, encoding: 'utf8' })
}

function isGitRepo(cwd: string): boolean {
	// Rely on git itself so subdirectories within a repo are detected correctly
	const res = runGit(['rev-parse', '--is-inside-work-tree'], cwd)
	return res.status === 0 && String(res.stdout).trim() === 'true'
}

function getCurrentBranch(cwd: string): string | null {
	const res = runGit(['rev-parse', '--abbrev-ref', 'HEAD'], cwd)
	if (res.status !== 0) return null
	return String(res.stdout).trim()
}

function makeBranchName(prefix = 'worqhat-wizard'): string {
	const now = new Date()
	const pad = (n: number) => n.toString().padStart(2, '0')
	const name = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(
		now.getHours(),
	)}${pad(now.getMinutes())}${pad(now.getSeconds())}`
	return `${prefix}/${name}`
}

export async function ensureWizardBranch(
	cwd: string,
	prefix?: string,
): Promise<{
	created: boolean
	name?: string
	from?: string
	message: string
}> {
	console.log('│')
	console.log(chalk.bold('◼ Preparing a dedicated git branch'))

	if (!isGitRepo(cwd)) {
		const msg =
			'No git repository detected here. This might be a mistake; continuing without creating a branch.'
		console.log(chalk.yellow(`! ${msg}`))
		return { created: false, message: msg }
	}

	const from = getCurrentBranch(cwd) || 'HEAD'
	console.log(`• Current branch: ${chalk.cyan(from)}`)

	const name = makeBranchName(prefix)
	console.log(`• Creating new branch: ${chalk.cyan(name)} from ${chalk.cyan(from)} ...`)

	const res = runGit(['checkout', '-b', name], cwd)
	if (res.status !== 0) {
		const err = (res.stderr || res.stdout || '').toString().trim()
		const msg = `Failed to create branch. ${err || ''}`.trim()
		console.log(chalk.red(`✖ ${msg}`))
		console.log(chalk.yellow('! Continuing without a dedicated branch.'))
		return { created: false, message: msg, from }
	}

	console.log(chalk.green(`✔ Switched to new branch ${name}`))
	return { created: true, name, from, message: 'Branch created' }
}
