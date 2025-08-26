import fs from 'node:fs'
import path from 'node:path'

export type DetectResult = {
	frameworks: string[]
	languages: string[]
}

const detectProject = (cwd: string): DetectResult => {
	const frameworks: string[] = []
	const languages = new Set<string>()

	// 1) package.json dependency checks
	const pkgPath = path.join(cwd, 'package.json')
	if (fs.existsSync(pkgPath)) {
		try {
			const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
				dependencies?: Record<string, unknown>
				devDependencies?: Record<string, unknown>
			}
			const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) } as Record<
				string,
				unknown
			>
			if (deps.next) frameworks.push('Next.js')
			if (deps.astro) frameworks.push('Astro')
			// If React is present without Next
			if (deps.react && !frameworks.includes('Next.js')) frameworks.push('React')
			if (deps.svelte || deps['@sveltejs/kit']) frameworks.push('Svelte')
			languages.add('javascript')
			if (deps.typescript) languages.add('typescript')
		} catch {}
	}

	// 2) Quick recursive scan for common language extensions
	const extsToLang: Record<string, string> = {
		'.py': 'python',
		'.rb': 'ruby',
		'.ts': 'typescript',
		'.tsx': 'typescript',
		'.js': 'javascript',
		'.jsx': 'javascript',
	}

	const ignoreDirs = new Set([
		'node_modules',
		'.git',
		'dist',
		'build',
		'.next',
		'.astro',
		'.svelte-kit',
	])

	const walk = (dir: string, depth = 0) => {
		if (depth > 3) return // keep it fast
		let children: string[] = []
		try {
			children = fs.readdirSync(dir)
		} catch {
			return
		}
		for (const name of children) {
			const full = path.join(dir, name)
			let stat: fs.Stats
			try {
				stat = fs.statSync(full)
			} catch {
				continue
			}
			if (stat.isDirectory()) {
				if (!ignoreDirs.has(name)) walk(full, depth + 1)
			} else {
				const ext = path.extname(name).toLowerCase()
				const lang = extsToLang[ext]
				if (lang) languages.add(lang)
			}
		}
	}

	walk(cwd)

	return { frameworks, languages: Array.from(languages) }
}

export default detectProject
