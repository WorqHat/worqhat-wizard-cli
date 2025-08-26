import fs from 'node:fs'
import path from 'node:path'

export function writeScaffoldFiles(cwd: string, filePaths: string[], language: string) {
	const headerFor = (filePath: string): string => {
		const ext = path.extname(filePath).toLowerCase()
		const headerLines = [
			'WorqHat scaffold file',
			`Language: ${language}`,
			`Created: ${new Date().toISOString()}`,
			'You can implement your workflows and database helpers here.',
		]
		const text = headerLines.join('\n')
		if (ext === '.ts' || ext === '.js' || ext === '.tsx' || ext === '.jsx') {
			return `// ${text.split('\n').join('\n// ')}\n\n`
		}
		if (ext === '.py') return `"""\n${text}\n"""\n\n`
		if (ext === '.rb') return `# ${text.split('\n').join('\n# ')}\n\n`
		return `// ${text.split('\n').join('\n// ')}\n\n`
	}

	for (const rel of filePaths) {
		const full = path.join(cwd, rel)
		fs.mkdirSync(path.dirname(full), { recursive: true })
		if (!fs.existsSync(full)) {
			fs.writeFileSync(full, headerFor(rel))
		}
	}
}
