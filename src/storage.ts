import chalk from 'chalk'
import { fetch } from 'undici'
import createSpinner from './spinner'

export type StorageResponse = {
	ok: boolean
	path?: string
	code?: string
}

export async function generateStorage(
	apiKey: string,
	language: string,
	targetPath: string,
	configFileCode: string,
	baseUrl = 'https://cli.worqhat.app',
): Promise<{ ok: boolean; path?: string; code?: string }> {
	const spin = createSpinner('Generating WorqHat storage helpers...')
	spin.start()
	const url = `${baseUrl}/scaffold/storage`
	try {
		// console.log(chalk.dim(`  → Requesting: POST ${url}`))
		// console.log(
		// 	chalk.dim(
		// 		`  → Body: ${JSON.stringify({ language, targetPath, configFileCode: `${configFileCode.substring(0, 100)}...` }, null, 2)}`,
		// 	),
		// )
		const res = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-worqhat-api-key': apiKey,
			},
			body: JSON.stringify({
				language,
				targetPath,
				configFileCode,
			}),
		})
		// console.log(chalk.dim(`  → Response: ${res.status} ${res.statusText}`))

		if (!res.ok) {
			spin.fail('Failed to generate storage helpers')
			console.error(chalk.red('\n  Error Details:'))
			console.error(chalk.red(`    URL: ${url}`))
			console.error(chalk.red(`    Status: ${res.status} ${res.statusText}`))
			console.error(
				chalk.red(
					`    Headers: ${JSON.stringify(Object.fromEntries(res.headers.entries()), null, 2)}`,
				),
			)

			// Try to read the response body for more details
			try {
				const text = await res.text()
				if (text) {
					console.error(chalk.red(`    Response Body: ${text}`))
				}
			} catch {
				// Ignore if we can't read the body
			}
			return { ok: false }
		}

		const body = (await res.json()) as StorageResponse
		// console.log(chalk.dim(`  → Body: ${JSON.stringify(body, null, 2)}`))

		if (!body.ok || !body.path || typeof body.code !== 'string') {
			spin.fail('Invalid response from storage generation')
			return { ok: false }
		}

		spin.succeed(`Storage helpers generated at ${body.path}`)
		return body
	} catch (e) {
		spin.fail('Error generating storage helpers')
		console.error(chalk.red('\n  Error Details:'))
		console.error(chalk.red(`    URL: ${url}`))
		console.error(chalk.red(`    Error: ${String(e)}`))
		if (e instanceof Error && e.stack) {
			console.error(chalk.red(`    Stack: ${e.stack}`))
		}
		return { ok: false }
	}
}
