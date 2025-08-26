import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
// import * as wt from 'worker_threads'
import cla from 'command-line-args'
import clu from 'command-line-usage'
import type { Har } from "har-format"
import { generateSpec } from 'har-to-openapi'
import stripJsonComments from 'strip-json-comments'
//import('strip-json-comments')

// Should've been imported, but not exposed from the module:
//type HarToOpenAPIConfig = import('har-to-openapi/dist/types').HarToOpenAPIConfig
//import type { HarToOpenAPIConfig } from 'har-to-openapi/dist/types'
type HarToOpenAPIConfig_tmpCompatSubset = {
	forceAllRequestsInSameSpec?: Boolean,
	addServersToPaths?: Boolean,
	guessAuthenticationHeaders?: Boolean,
	relaxedMethods?: Boolean,
	relaxedContentTypeJsonParse?: Boolean,
	filterStandardHeaders?: Boolean,
	logErrors?: Boolean,
	attemptToParameterizeUrl?: Boolean,
	dropPathsWithoutSuccessfulResponse?: Boolean
}

type appConfig = {
	verbose?: Boolean,
	file?: fs.PathLike,
	out?: fs.PathLike
}

type HAR2OAPICLIParams = {
	harConfig?: HarToOpenAPIConfig_tmpCompatSubset,
	config?: appConfig
}

namespace HAR2OAPICLIParams {
	export const reducer = (
		state: HAR2OAPICLIParams,
		update: Partial<HAR2OAPICLIParams>
	): HAR2OAPICLIParams => {
		return {
			harConfig: { ...state.harConfig, ...update.harConfig },
			config: { ...state.config, ...update.config }
		}
	}
}

// Utils

const erh = (msg?: string) => (code: number = 1) => (err: Error): void => { console.error(err, msg); process.exit(code) }
const thr = (msg?: string) => (code: number = 1) => (erhmc: Function): void => { try { throw new Error(msg) } catch (err) { erhmc(err) } }
const pnf = (pns: ParamName[]) => (n: string): ParamName => pns.find(pn => pn.l == n)
const verboseLog = (verbose: Boolean) => (msg: string): void => { verbose && process.stdout.write(msg) }

// OS

const appinfo = {
	name: `har2oapi`,
	configfile: `config.jsonc`,
	buildroot: `${__dirname}`,
	systemroot: ``,
	homeroot: `${os.homedir()}`,
	workdir: `${process.cwd()}`
}

type SysPaths = {
	builtin: fs.PathLike,
	shared: fs.PathLike,
	home: fs.PathLike,
	workdir: fs.PathLike
}

const paths: SysPaths = {
	// 2. conf file @ app distro
	builtin: `${appinfo.buildroot}/defaults/${appinfo.configfile}`,
	// 3. conf file @ /etc/ dir
	shared: `${appinfo.systemroot}/etc/${appinfo.name}/${appinfo.configfile}`,
	// 4. conf file @ Home dir
	home: `${appinfo.homeroot}/.config/${appinfo.name}/${appinfo.configfile}`,
	// 5. conf file @ Work dir
	workdir: `${appinfo.workdir}/.${appinfo.name}.config.${appinfo.configfile}`
}

// CLI

/**
 * @type ParamName
 * 
*/

type ParamName = {
	l: string,
	s: string
}

/**
 * @constant pns
 * Param names
*/

const pns: ParamName[] = [
	{ s: `inSameSpec`, l: `forceAllRequestsInSameSpec` },
	{ s: `srvToPaths`, l: `addServersToPaths` },
	{ s: `guessAuth`, l: `guessAuthenticationHeaders` },
	{ s: `relaxMtd`, l: `relaxedMethods` },
	{ s: `relaxParse`, l: `relaxedContentTypeJsonParse` },
	{ s: `filterStdHeads`, l: `filterStandardHeaders` },
	{ s: `logErrors`, l: `logErrors` },
	{ s: `tryParamUrl`, l: `attemptToParameterizeUrl` },
	{ s: `drop404`, l: `dropPathsWithoutSuccessfulResponse` },
]

const cliOpts: clu.OptionDefinition[] = [
	//{ group: `App`, type: String, name: 'src', multiple: true, defaultOption: true },
	//{ group: `App`, type: Number, alias: 't', name: 'timeout' },
	{ group: `App`, type: Boolean, defaultValue: false, alias: 'v', name: 'verbose', description: `Print diagnostic messages` },
	//{ group: `App`, type: Boolean, defaultValue: false, alias: 'd', name: 'debug', description: `Print diagnostic messages.` },
	{ group: `App`, type: Boolean, defaultValue: false, alias: 'h', name: `help`, description: `Display help message.` },
	{ group: `App`, type: Boolean, defaultValue: false, alias: 'V', name: `version`, description: `Display version.` },
	//{ group: `App`, type: Boolean, defaultValue: false, alias: `C`, name: `configExport`, description: `Print effective config to stderr.` },
	{ group: `App`, type: String, defaultValue: `./openapi.yaml`, alias: `o`, name: `out`, description: 'Output file path.' },
	//{ group: `App`, type: Boolean, defaultValue: false, alias: 's', name: `safeOut`, description: `Safe output - doesn't write to a non-empty file.` },
	//{ group: `App`, type: Boolean, defaultValue: false, alias: 'a', name: `append`, description: `Append to an output file. Conflicts with --safeOut.` },
	{ group: `HAR`, type: Boolean, defaultValue: false, alias: `S`, name: `${pnf(pns)(`forceAllRequestsInSameSpec`).s}`, description: `Treat every url as having the same domain.` },
	{ group: `HAR`, type: Boolean, defaultValue: false, alias: `P`, name: `${pnf(pns)(`addServersToPaths`).s}`, description: `Add a servers entry to every path object.` },
	{ group: `HAR`, type: Boolean, defaultValue: true, alias: `A`, name: `${pnf(pns)(`guessAuthenticationHeaders`).s}`, description: `Try and guess common auth headers.` },
	{ group: `HAR`, type: Boolean, defaultValue: false, alias: `m`, name: `${pnf(pns)(`relaxedMethods`).s}`, description: `Allow non-standard methods.` },
	{ group: `HAR`, type: Boolean, defaultValue: true, alias: `p`, name: `${pnf(pns)(`relaxedContentTypeJsonParse`).s}`, description: `Try and parse non application/json responses as json.` },
	{ group: `HAR`, type: Boolean, defaultValue: true, alias: `H`, name: `${pnf(pns)(`filterStandardHeaders`).s}`, description: `Filter out all standard headers from the parameter list in openapi.` },
	{ group: `HAR`, type: Boolean, defaultValue: true, alias: `L`, name: `${pnf(pns)(`logErrors`).s}`, description: `Log errors to console.` },
	{ group: `HAR`, type: Boolean, defaultValue: true, alias: `q`, name: `${pnf(pns)(`attemptToParameterizeUrl`).s}`, description: `Try and parameterize an URL.` },
	{ group: `HAR`, type: Boolean, defaultValue: true, alias: `N`, name: `${pnf(pns)(`dropPathsWithoutSuccessfulResponse`).s}`, description: `Don't include paths without a response or with a non-2xx response.` },
	{ group: `App`, type: String, alias: `f`, name: `file`, description: 'Input file', defaultOption: true }
]

const options: cla.CommandLineOptions = cla(
	cliOpts,
	{
		argv: [],
		partial: false,
		stopAtFirstUnknown: true,
		camelCase: true,
		caseInsensitive: true,
	}
)

/**
 * If verbose - will print verbose logs. // TODO: Start using it.
 */
const vbLogW = verboseLog(options.verbose)

const usage: string = clu([
	{
		header: `Options`,
		content: 'Usage'
	},
	{
		optionList: cliOpts
	}
])

const printHelp = (usage: string) /* => (err: Error) */ => {
	process.stdout.write(usage)
	process.exit(0)
}

/**
 * If (help) - Print Help, exit
 */

options.help && printHelp(usage)

/**
 * Take input file.
 * If (no file name) and (no STDIN pipe) - print error, exit
 */

!options.file && process.stdin.isTTY && thr()()(erh('Provide input via --file or stdin pipe.')())

/**
 * File conditions:
 * 
 * | Condition | Necessary | Sufficient |
 * |-----------|-----------|------------|
 * | Exists    | Yes       | No         |
 * | Filled    | Yes       | Yes        |
 * 
 * Therefore, in the same function we check for both, but throw a different error on different types of failures
 * If no file or file invalid - print error, exit
 * //TODO: Maybe rewrite with workers for parallelism?
 */

const loadFile = /* async */ (path: fs.PathLike) => (throwErrors: boolean = false) => {
	let stats: fs.Stats
	try {
		stats = fs.statSync(path)
		if (stats.size > 0) {
			return fs.readFileSync(path, `utf8`)
		} else {
			if (throwErrors) throw new Error(`File is empty.`)
		}
	} catch (err) {
		erh()()(err)
	}
}

/** 
 * Validate JSON file content.
 * 
 * When we want to validate:
 * 
 * 1. When we already have confirmed that a file exists
 * 2. When we are loading the file - always
 * 
 * File loader function can be a validator function too?
 * 
 * It can:
 * 
 * 1. Load
 * 	+ Store loaded data (curried clojure)? - no reason to do it here for now.
 * 2. Validate by parsing - no other way to do it with JSON because it's a string without extra binary headers, unless relying on file name extension
 * 	+ Validation already requires parsing, so it can return parsed data
 * 	+ Can store parsed data (curried clojure)? - no reason to do it here for now.
 */

const jsonLoad = (data: string): object => {
	let datanc: string = ''
	try {
		datanc = stripJsonComments(data) // TODO: Decide if I need it all the time or not. It may come out as an overhead and slow down the runtime.
		return JSON.parse(datanc)
	} catch (err) {
		erh()()(err)
	}
}

/* Default "hardcoded" params */

const defaults: HAR2OAPICLIParams = {
	harConfig: {
		forceAllRequestsInSameSpec: false,
		addServersToPaths: false,
		guessAuthenticationHeaders: true,
		relaxedMethods: false,
		relaxedContentTypeJsonParse: true,
		filterStandardHeaders: true,
		logErrors: true,
		attemptToParameterizeUrl: true,
		dropPathsWithoutSuccessfulResponse: true
	},
	config: {
		verbose: false,
		file: "./har.json",
		out: "./openapi.yaml"
	}
}

/**
 * Params are loaded if present.
 * 
 * Conf load order:
 * 
 * 1. Default "hardcoded" params
 * 2. conf file @ app distro
 * 3. conf file @ /etc/ dir
 * 4. conf file @ Home dir
 * 5. conf file @ Work dir
 * 6. CLI params
*/

/**
 * Loads configs from all possible config file locations, layering one over the other, all over hardcoded defaults.
 * Probably no reason to store all param file data, so not doing it now.
 * But it might be more scalable for future features than current strategy.
 */
//TODO: Process CLI `options` here or later? Does `options` have nested objects by groups or everything in a shallow 1L object?
//const paramObj: HAR2OAPICLIParams = Object.values(paths).map(path => jsonLoad(loadFile(path)())).reduce(HAR2OAPICLIParams.reducer, defaults)

const paramObj: HAR2OAPICLIParams = Object.values(paths).map(path => jsonLoad(loadFile(path)())).reduce(HAR2OAPICLIParams.reducer, defaults)

//options

/** 
 * Runtime
 * 
 * Options to read HAR file:
 * 
 * 1. If there's an STDIN pipe - read it
 * 2. If there's an input file name - read from it
 * 
 * // TODO:
 * 
 * + Input
 * 	+ STDIN
 * 	+ File path -> Load
 * + Output
 * 	+ STDOUT
 * 	+ File path -> Write
 */

// let input: string = ``
// process.stdin.on('data', chunk => input += chunk)
// process.stdin.on('end', () => {
// 	// process input here
// })


// const composeParams = (defaults: HarToOpenAPIConfig_tmpCompatSubset) => {
// 	let params = defaults
// 	return (fileParams: object[]) => {
// 		const merged = fileParams.reduce((acc, obj) => ({ ...acc, ...obj }), params)
// 		return (cliParams: cla.CommandLineOptions) => ({ ...params, ...cliParams })
// 	}
// }

// // read a har file from wherever you want - in this example its just a root json object
// // const har = await fs.readFile("my.har")

// // const serializers = {
// // 	json: (obj: object) => JSON.stringify(obj),
// // 	yaml: (obj: object) => YAML.stringify(obj)
// // }

// const params = composeParams(defaults)(fileParams)(cliParams)

// const processInput = (): Har => {
// 	// 1. Read a HAR input - file or pipe
// 	// 2. Parse JSON
// 	// 3. Return object. HAR Log structure is expected
// 	// With the structure: har.log.entries[]
// }

// const har: Har = processInput()

// const config: HarToOpenAPIConfig_tmpCompatSubset = params.config

// const openapi = await generateSpec(har, config)
// const { spec, yamlSpec } = openapi
// // spec = { ... } openapi spec schema document
// // yamlSpec = string, "info: ..."

// const processOutput = (handler, config): void => {
// 	/*
// 	Output options:
// 	+ Pipe to STDOUT
// 	+ Write to a file by a filename
// 	+ Optionally ask for a proper output format
// 	*/
// }

// // return or write a YAML