import fs from 'node:fs'
import readline from 'node:readline'
import chalk from 'chalk'

const promptLine = async (question: string) =>
	await new Promise<string>((resolve) => {
		const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
		rl.question(question, (ans) => {
			rl.close()
			resolve(ans.trim())
		})
	})

export async function ensureApiKey(
	secretsFile: string,
): Promise<{ apiKey: string; saved: boolean }> {
	// If key exists, show masked and return
	try {
		if (fs.existsSync(secretsFile)) {
			const raw = fs.readFileSync(secretsFile, 'utf8')
			const parsed = JSON.parse(raw)
			if (parsed && typeof parsed.apiKey === 'string' && parsed.apiKey.trim()) {
				const existingKey: string = parsed.apiKey.trim()
				const last4 = existingKey.slice(-4)
				console.log(chalk.green(`🔐 Found saved API key (wh_***************${last4}).`))
				return { apiKey: existingKey, saved: false }
			}
		}
	} catch {}

	// No key saved; instruct and prompt
	console.log('│')
	console.log('●  Authenticate with your WorqHat account')
	console.log(`│  1) Visit ${chalk.cyan('https://worqhat.app')}`)
	console.log('│  2) Create or copy an API key for CLI usage')
	console.log('│  3) Paste the API key below')

	let apiKey = ''
	while (true) {
		apiKey = await promptLine('◇  Paste your WorqHat API key: ')
		if (apiKey.length > 0) break
		console.log(chalk.yellow('!  API key cannot be empty. Please paste the full key.'))
	}

	// Persist
	fs.mkdirSync(require('node:path').dirname(secretsFile), { recursive: true })
	const payload = { apiKey: apiKey.trim(), savedAt: new Date().toISOString() }
	fs.writeFileSync(secretsFile, JSON.stringify(payload, null, 2))
	try {
		fs.chmodSync(secretsFile, 0o600)
	} catch {}
	console.log(chalk.green('🔐 API key saved. You are now authenticated.'))
	return { apiKey: apiKey.trim(), saved: true }
}

export function logout(secretsFile: string) {
	try {
		if (fs.existsSync(secretsFile)) {
			fs.rmSync(secretsFile)
			console.log(chalk.green('🔐 Logged out. Removed saved API key.'))
		} else {
			console.log('No saved API key found. Nothing to do.')
		}
	} catch (e) {
		console.error(chalk.red('Failed to remove credentials:'), e)
		process.exit(1)
	}
}
