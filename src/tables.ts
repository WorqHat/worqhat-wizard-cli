import chalk from 'chalk'
import { fetch } from 'undici'
import createSpinner from './spinner'

export type PostgresEnvironmentsResponse = {
	ok: boolean
	organizationId?: string
	environments?: string[]
}

export type PostgresTablesResponse = {
	ok: boolean
	organizationId?: string
	environments?: string[]
	tables?: Array<{ table: string; environment: string }>
}

export async function fetchEnvironments(
	apiKey: string,
	baseUrl = 'https://cli.worqhat.app',
): Promise<{ organizationId?: string; environments: string[] }> {
	const spin = createSpinner('Fetching available environments...')
	spin.start()
	try {
		const res = await fetch(`${baseUrl}/postgres/environments`, {
			headers: { Authorization: `Bearer ${apiKey}` },
		})
		if (!res.ok) {
			spin.fail('Failed to fetch environments')
			console.error(chalk.red(`HTTP ${res.status}: ${res.statusText}`))
			return { environments: [] }
		}
		const body = (await res.json()) as PostgresEnvironmentsResponse
		const orgId = body.organizationId
		const environments = body.environments || []
		spin.succeed(`Found ${environments.length} environment(s)`)
		if (!body.ok) {
			console.log(chalk.yellow('Warning: backend responded with ok=false'))
		}
		return { organizationId: orgId, environments }
	} catch (e) {
		spin.fail('Error fetching environments')
		console.error(chalk.red(String(e)))
		return { environments: [] }
	}
}

export async function fetchTables(
	apiKey: string,
	selectedEnvironments: string[],
	baseUrl = 'https://cli.worqhat.app',
): Promise<{ organizationId?: string; environments?: string[]; tables: string[]; tableEnvironmentMap: Map<string, string[]> }> {
	const spin = createSpinner('Fetching tables...')
	spin.start()
	try {
		const res = await fetch(`${baseUrl}/postgres/tables`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ environments: selectedEnvironments }),
		})
		if (!res.ok) {
			spin.fail('Failed to fetch tables')
			console.error(chalk.red(`HTTP ${res.status}: ${res.statusText}`))
			return { tables: [], tableEnvironmentMap: new Map() }
		}
		const body = (await res.json()) as PostgresTablesResponse
		const orgId = body.organizationId
		const environments = body.environments || []
		const tableData = body.tables || []
		
		// Create a map of table name to environments
		const tableEnvironmentMap = new Map<string, string[]>()
		const uniqueTables = new Set<string>()
		
		for (const { table, environment } of tableData) {
			uniqueTables.add(table)
			if (!tableEnvironmentMap.has(table)) {
				tableEnvironmentMap.set(table, [])
			}
			const envs = tableEnvironmentMap.get(table)
			if (envs) {
				envs.push(environment)
			}
		}
		
		const tables = Array.from(uniqueTables)
		const envCount = selectedEnvironments.length || environments.length
		spin.succeed(`Fetched ${tables.length} table(s) from ${envCount} environment(s)`)
		if (!body.ok) {
			console.log(chalk.yellow('Warning: backend responded with ok=false'))
		}
		return { organizationId: orgId, environments, tables, tableEnvironmentMap }
	} catch (e) {
		spin.fail('Error fetching tables')
		console.error(chalk.red(String(e)))
		return { tables: [], tableEnvironmentMap: new Map() }
	}
}
