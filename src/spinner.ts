import chalk from 'chalk'

const createSpinner = (text: string) => {
	const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
	let i = 0
	let timer: NodeJS.Timeout | null = null
	const start = () => {
		if (timer) return
		process.stdout.write(' ')
		timer = setInterval(() => {
			i = (i + 1) % frames.length
			const frame = frames[i]
			process.stdout.write(`\r${frame} ${text}   `)
		}, 80)
	}
	const succeed = (msg?: string) => {
		if (timer) clearInterval(timer)
		timer = null
		process.stdout.write(`\r${chalk.green('✔')} ${msg || text}   \n`)
	}
	const fail = (msg?: string) => {
		if (timer) clearInterval(timer)
		timer = null
		process.stdout.write(`\r${chalk.red('✖')} ${msg || text}   \n`)
	}
	return { start, succeed, fail }
}

export default createSpinner
