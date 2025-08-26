import chalk from 'chalk'
import { prompt } from 'enquirer'
import { fetch } from 'undici'
import createSpinner from './spinner'

export type WorkflowItem = { id: string; name: string }
export type WorkflowsResponse = { ok: boolean; data?: WorkflowItem[] }

export async function fetchAndSelectWorkflows(
	apiKey: string,
	baseUrl = 'https://cli.worqhat.app',
): Promise<{ selectedIds: string[]; selectedNames: string[]; items: WorkflowItem[] }> {
	const fetchSpin = createSpinner('Fetching workflows from backend...')
	fetchSpin.start()
	try {
		const res = await fetch(`${baseUrl}/workflows`, {
			headers: { Authorization: `Bearer ${apiKey}` },
		})
		if (!res.ok) {
			fetchSpin.fail('Failed to fetch workflows')
			console.error(chalk.red(`HTTP ${res.status}: ${res.statusText}`))
			return { selectedIds: [], selectedNames: [], items: [] }
		}

		const body = (await res.json()) as WorkflowsResponse
		const items: WorkflowItem[] = Array.isArray(body.data) ? body.data : []
		if (!body.ok || !items) {
			fetchSpin.fail('Backend returned an unexpected response')
			return { selectedIds: [], selectedNames: [], items: [] }
		}

		fetchSpin.succeed(`Fetched ${items.length} workflow(s)`)

		// Prompt user to select workflows
		console.log('')
		console.log(chalk.bold('Select workflows to install/configure'))
		console.log(
			chalk.dim('Use ↑/↓ to move, Space to select/deselect, A to toggle all, Enter to confirm.'),
		)

		let selectedIds: string[] = []
		try {
			const ans = await prompt<{ workflows: string[] }>([
				{
					type: 'multiselect',
					name: 'workflows',
					message: 'Workflows',
					choices: items.map((w) => ({ name: w.id, message: w.name })),
				},
			])
			selectedIds = ans.workflows || []
		} catch {
			selectedIds = []
		}

		const selectedNames = items.filter((w) => selectedIds.includes(w.id)).map((w) => w.name)
		if (selectedNames.length) {
			console.log(chalk.green(`✔ Selected workflows: ${selectedNames.join(', ')}`))
		} else {
			console.log(chalk.yellow('No workflows selected.'))
		}

		return { selectedIds, selectedNames, items }
	} catch (e) {
		console.log(JSON.stringify(e))
		fetchSpin.fail('Error fetching workflows')
		console.error(chalk.red(String(e)))
		return { selectedIds: [], selectedNames: [], items: [] }
	}
}
