import chalk from 'chalk'
import { fetch } from 'undici'
import createSpinner from './spinner'

export type ClickHouseTablesResponse = {
	ok: boolean
	database?: string
	data?: Array<{ name: string }>
}

export async function fetchTables(
	apiKey: string,
	baseUrl = 'https://cli.worqhat.app',
): Promise<{ database?: string; tables: string[] }> {
	const spin = createSpinner('Fetching tables...')
	spin.start()
	try {
		const res = await fetch(`${baseUrl}/clickhouse/tables`, {
			headers: { Authorization: `Bearer ${apiKey}` },
		})
		if (!res.ok) {
			spin.fail('Failed to fetch tables')
			console.error(chalk.red(`HTTP ${res.status}: ${res.statusText}`))
			return { tables: [] }
		}
		const body = (await res.json()) as ClickHouseTablesResponse
		const db = body.database
		const tables = Array.isArray(body.data) ? body.data.map((t) => t.name) : []
		spin.succeed(`Fetched ${tables.length} table(s)`)
		if (!body.ok) {
			console.log(chalk.yellow('Warning: backend responded with ok=false'))
		}
		return { database: db, tables }
	} catch (e) {
		spin.fail('Error fetching tables')
		console.error(chalk.red(String(e)))
		return { tables: [] }
	}
}
