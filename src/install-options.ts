import chalk from 'chalk'
import { prompt } from 'enquirer'

export type InstallChoices = {
	workflows: boolean
	database: boolean
	storage: boolean
}

export async function promptInstallOptions(): Promise<InstallChoices> {
	console.log('')
	console.log(chalk.bold('What do you want to install?'))
	console.log(
		chalk.dim('Use ↑/↓ to move, Space to select/deselect, A to toggle all, Enter to confirm.'),
	)
	let selected: string[] = []
	try {
		const ans = await prompt<{ install: string[] }>([
			{
				type: 'multiselect',
				name: 'install',
				message: 'Select one or more options',
				choices: [
					{ name: 'workflows', message: 'Workflows' },
					{ name: 'database', message: 'Database' },
					{ name: 'storage', message: 'Storage' },
				],
			},
		])
		selected = ans.install || []
	} catch {
		selected = []
	}

	return {
		workflows: selected.includes('workflows'),
		database: selected.includes('database'),
		storage: selected.includes('storage'),
	}
}
