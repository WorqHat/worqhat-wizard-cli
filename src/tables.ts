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
	const url = `${baseUrl}/postgres/environments`
	try {
		// console.log(chalk.dim(`  → Requesting: GET ${url}`))
		const res = await fetch(url, {
			headers: { Authorization: `Bearer ${apiKey}` },
		})
		// console.log(chalk.dim(`  → Response: ${res.status} ${res.statusText}`))
		
		if (!res.ok) {
			spin.fail('Failed to fetch environments')
			console.error(chalk.red('\n  Error Details:'))
			console.error(chalk.red(`    URL: ${url}`))
			console.error(chalk.red(`    Status: ${res.status} ${res.statusText}`))
			console.error(chalk.red(`    Headers: ${JSON.stringify(Object.fromEntries(res.headers.entries()), null, 2)}`))
			
			// Try to read the response body for more details
			try {
				const text = await res.text()
				if (text) {
					console.error(chalk.red(`    Response Body: ${text}`))
				}
			} catch {
				// Ignore if we can't read the body
			}
			return { environments: [] }
		}
		const body = (await res.json()) as PostgresEnvironmentsResponse
		// console.log(chalk.dim(`  → Body: ${JSON.stringify(body, null, 2)}`))
		const orgId = body.organizationId
		const environments = body.environments || []
		spin.succeed(`Found ${environments.length} environment(s)`)
		if (!body.ok) {
			console.log(chalk.yellow('Warning: backend responded with ok=false'))
		}
		return { organizationId: orgId, environments }
	} catch (e) {
		spin.fail('Error fetching environments')
		console.error(chalk.red('\n  Error Details:'))
		console.error(chalk.red(`    URL: ${url}`))
		console.error(chalk.red(`    Error: ${String(e)}`))
		if (e instanceof Error && e.stack) {
			console.error(chalk.red(`    Stack: ${e.stack}`))
		}
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
	const url = `${baseUrl}/postgres/tables`
	try {
		// console.log(chalk.dim(`  → Requesting: POST ${url}`))
		// console.log(chalk.dim(`  → Body: ${JSON.stringify({ environments: selectedEnvironments }, null, 2)}`))
		const res = await fetch(url, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ environments: selectedEnvironments }),
		})
		// console.log(chalk.dim(`  → Response: ${res.status} ${res.statusText}`))
		
		if (!res.ok) {
			spin.fail('Failed to fetch tables')
			console.error(chalk.red('\n  Error Details:'))
			console.error(chalk.red(`    URL: ${url}`))
			console.error(chalk.red(`    Status: ${res.status} ${res.statusText}`))
			console.error(chalk.red(`    Headers: ${JSON.stringify(Object.fromEntries(res.headers.entries()), null, 2)}`))
			
			// Try to read the response body for more details
			try {
				const text = await res.text()
				if (text) {
					console.error(chalk.red(`    Response Body: ${text}`))
				}
			} catch {
				// Ignore if we can't read the body
			}
			return { tables: [], tableEnvironmentMap: new Map() }
		}
		const body = (await res.json()) as PostgresTablesResponse
		// console.log(chalk.dim(`  → Body: ${JSON.stringify(body, null, 2)}`))
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
		console.error(chalk.red('\n  Error Details:'))
		console.error(chalk.red(`    URL: ${url}`))
		console.error(chalk.red(`    Error: ${String(e)}`))
		if (e instanceof Error && e.stack) {
			console.error(chalk.red(`    Stack: ${e.stack}`))
		}
		return { tables: [], tableEnvironmentMap: new Map() }
	}
}
