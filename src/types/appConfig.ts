import * as fs from 'fs'

/**
 * App CLI options
 */
export type appConfig = {
	verbose?: boolean,
	input?: fs.PathLike,
	output?: fs.PathLike,
	debug?: boolean,
	help?: boolean,
	version?: boolean,
	configExport?: boolean,
	format?: "yaml"|"yml"|"json",
	safeOut?: boolean,
	append?: boolean,
	stdout?: boolean
}
