import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import chalk from 'chalk'

export type Language = 'typescript' | 'javascript' | 'python' | 'ruby'

function detectNodePackageManager(cwd: string): 'npm' | 'yarn' | 'pnpm' {
	if (fs.existsSync(path.join(cwd, 'yarn.lock'))) return 'yarn'
	if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) return 'pnpm'
	return 'npm'
}

function run(cmd: string, args: string[], cwd: string): number {
	const res = spawnSync(cmd, args, { stdio: 'inherit', cwd, env: process.env })
	return res.status ?? 1
}

export async function installPackagesForLanguage(opts: {
	cwd: string
	language: Language
	hasWorkflows: boolean
	hasDatabase: boolean
	hasStorage: boolean
	forceInstall?: boolean
}) {
	const { cwd, language, forceInstall } = opts

	if (language === 'javascript' || language === 'typescript') {
		console.log(chalk.bold('\nInstalling WorqHat SDK for JavaScript/TypeScript'))
		console.log(chalk.dim("Using your project's package manager to add dependency."))
		const manager = detectNodePackageManager(cwd)
		const pkgName = 'worqhat'
		console.log(chalk.cyan(`Installing ${pkgName} via ${manager}...`))
		let status = 1
		if (manager === 'npm') {
			const args = ['install', pkgName]
			if (forceInstall) args.push('--legacy-peer-deps')
			status = run('npm', args, cwd)
		} else if (manager === 'yarn') {
			status = run('yarn', ['add', pkgName], cwd)
		} else {
			status = run('pnpm', ['add', pkgName], cwd)
		}
		if (status === 0) console.log(chalk.green('✔ SDK installed'))
		else console.log(chalk.red('✖ Failed to install SDK'))
		return
	}

	if (language === 'python') {
		console.log(chalk.bold('\nInstalling WorqHat SDK for Python'))
		console.log(chalk.dim('Using your active Python environment.'))
		const pkgName = 'worqhat'
		console.log(chalk.cyan(`Installing ${pkgName} via pip...`))
		// Try python3 -m pip install, then fallback to pip3, then pip
		let status = run('python3', ['-m', 'pip', 'install', pkgName], cwd)
		if (status !== 0) status = run('pip3', ['install', pkgName], cwd)
		if (status !== 0) status = run('pip', ['install', pkgName], cwd)
		if (status === 0) console.log(chalk.green('✔ SDK installed'))
		else console.log(chalk.red('✖ Failed to install SDK'))
		return
	}

	// Ruby or others: no official SDK, advise REST usage
	console.log(chalk.bold('\nWorqHat SDK installation'))
	console.log(
		chalk.yellow(
			'No official SDK detected for this language. Use the REST API in your code. Skipping installation.',
		),
	)
}
