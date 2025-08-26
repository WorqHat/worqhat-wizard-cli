import fs from 'node:fs'
import path from 'node:path'

export const buildProjectTree = (root: string): string => {
	const ignore = new Set([
		'node_modules',
		'.git',
		'dist',
		'build',
		'.next',
		'.astro',
		'.svelte-kit',
	])

	const toTree = (dir: string, prefix = ''): string[] => {
		let names: string[] = []
		try {
			names = fs.readdirSync(dir).filter((n) => !ignore.has(n))
		} catch {
			return []
		}
		names.sort((a, b) => a.localeCompare(b))
		const lines: string[] = []
		names.forEach((name, idx) => {
			const full = path.join(dir, name)
			let stat: fs.Stats
			try {
				// lstat to detect symlinks and avoid following them
				stat = fs.lstatSync(full)
			} catch {
				return
			}
			const isLast = idx === names.length - 1
			const branch = isLast ? '└── ' : '├── '
			lines.push(prefix + branch + name)
			if (stat.isDirectory() && !stat.isSymbolicLink()) {
				const childPrefix = prefix + (isLast ? '    ' : '│   ')
				lines.push(...toTree(full, childPrefix))
			}
		})
		return lines
	}

	const relRoot = path.basename(root) || root
	return [relRoot, ...toTree(root)].join('\n')
}
