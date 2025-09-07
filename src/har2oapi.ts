import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
// import * as wt from 'worker_threads'
import cla from 'command-line-args'
import clu from 'command-line-usage'
import type { Har } from "har-format"
import { OpenAPIObject } from 'openapi3-ts'
import { generateSpec } from 'har-to-openapi'
import stripJsonComments from 'strip-json-comments'
import pkgManif from '../package.json'
import * as YAML from 'yaml'

type PackageManifest = typeof pkgManif

//import('strip-json-comments')

/** 
 * Should've been imported, but is not exported from `har-to-openapi`.
 * 
 * Failing attempts to import:
 * + `type HarToOpenAPIConfig = import('har-to-openapi/dist/types').HarToOpenAPIConfig`
 * + `import type { HarToOpenAPIConfig } from 'har-to-openapi/dist/types'`
 */
type HarToOpenAPIConfig = Parameters<typeof generateSpec>[1]

/**
 * App CLI options
 */
type appConfig = {
	verbose?: boolean,
	file?: fs.PathLike,
	out?: fs.PathLike
}

type HAR2OAPICLIParams = HarToOpenAPIConfig & appConfig

namespace HAR2OAPICLIParams {
	/**
	 * Type array reducer function
	 * 
	 * @param state {Partial<HAR2OAPICLIParams>} Accumulator
	 * @param update {Partial<HAR2OAPICLIParams>} Next object in the line
	 * @returns Layered object
	 */
	export const reducer = (
		state: Partial<HAR2OAPICLIParams>,
		update: Partial<HAR2OAPICLIParams>
	): HAR2OAPICLIParams => {
		return { ...state, ...update }
		/*
		// Was pretty cool yet simple, but we don't need it anymore
		// Still not universal for arbitrary nested objects, but for that we can import lodash
		{
			harConfig: { ...state.harConfig, ...update.harConfig },
			config: { ...state.config, ...update.config }
		}
		*/
	}
}

interface HarToOpenAPISpec_tmpComp {
	spec: OpenAPIObject
	yamlSpec: string
	domain: string | undefined
}

// Utils

/**
 * My default error handler.
 * @param msg {String} Custom error message
 * @param code {number} Custom exit code
 * @param exitOnError {Bollean} Exit on error switch
 * @param err {Error} Error object
*/
const erh = (msg?: string) => (code: number = 1) => (exitOnError: boolean = true) => (err: Error): void => { console.error(err, msg); exitOnError && process.exit(code) }
/**
 * Call this to throw and catch an error when 3rd party doesn't.
 * @param msg 
 * @param erhmc Error handling function
 * @returns 
*/
const thr = (msg?: string) => (erhmc: Function): void => { try { throw new Error(msg) } catch (err) { erhmc(err) } }
/**
 * @type ParamName
 * 
*/
type ParamName = {
	a?: string,
	s?: string,
	l?: string
}
/**
 * 
 * @param pns 
 * @param n 
 * @returns 
*/
const pnf = (pns: ParamName[]) => (n: string): ParamName => pns.find(pn => pn.l == n)

const printHelp = (usage: string) /* => (err: Error) */ => {
	process.stdout.write(`${usage}\n`)
	process.exit(0)
}

const printVer = (pkgManif: PackageManifest) /* => (err: Error) */ => {
	process.stdout.write(`${pkgManif.name} ${pkgManif.version}\n`)
	process.exit(0)
}

/**
 * Loads a file.
 * 
 * File conditions:
 * 
 * | Condition | Necessary | Sufficient |
 * |-----------|-----------|------------|
 * | Exists    | Yes       | No         |
 * | Filled    | Yes       | Yes        |
 * 
 * Therefore, in the same function we check for both, but throw a different error on different types of failures.
 * 
 * If no file or file invalid - prints error, exits by default.
 * 
 * //TODO: Maybe rewrite with workers for parallelism / multithreading?
 */
const loadFile = /* async */ (path: fs.PathLike) => (exitOnError: boolean = true): string => {
	let stats: fs.Stats
	try {
		stats = fs.statSync(path)
		if (stats.size > 0) {
			return fs.readFileSync(path, `utf8`)
		} else {
			throw new Error(`File is empty.`)
		}
	} catch (err) {
		erh()()(exitOnError)(err)
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
const jsonLoad = <T>(data: string): T => {
	let datanc: string = ''
	try {
		datanc = stripJsonComments(data) // TODO: Decide if I need it all the time or not. It may come out as an overhead and slow down the runtime. But also gives more versatility.
		return JSON.parse(datanc) as T
	} catch (err) {
		erh()()()(err)
	}
}

/**
 * Parameter can be built from:
 * + default value
 * + short name
 * + alias
 * + group
 * 
 * clu.OptionDefinition <=> My Types:
 * + group <=> ?
 * + name <=> ParamName.s
 * + alias <=> ParamName.a
 * + type <=> typeof HAR2OAPICLIParams[ParamName.l]
 * + typeLabel <=> ?
 * + multiple <=> ?
 * + lazyMultiple <=> ?
 * + defaultOption <=> ?
 * + defaultValue <=> defaults[ParamName.l]
 * + description <=> ?
 */

/**
 * 
 * @param verbose {Bollean} Verbose logging switch
 * @param msg {String} Custom message
 * @returns 
*/
//const verboseLog = (verbose: boolean) => (msg: string): void => { verbose && process.stdout.write(msg) }

// OS

type AppInfo = {
	name: string,
	configfile: string,
	buildroot: string,
	systemroot: string,
	homeroot: string,
	workdir: string
}

const ainf: AppInfo = {
	name: `${pkgManif.name}`,
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
	builtin: path.normalize(`${ainf.buildroot}/defaults/${ainf.configfile}`),
	// 3. conf file @ /etc/ dir
	shared: path.normalize(`${ainf.systemroot}/etc/${ainf.name}/${ainf.configfile}`),
	// 4. conf file @ Home dir
	home: path.normalize(`${ainf.homeroot}/.config/${ainf.name}/${ainf.configfile}`),
	// 5. conf file @ Work dir
	workdir: path.normalize(`${ainf.workdir}/.${ainf.name}.config.${ainf.configfile}`)
}

/**
 * Default "hardcoded" params
 */
const defaults: HAR2OAPICLIParams = {
	forceAllRequestsInSameSpec: false,
	addServersToPaths: false,
	guessAuthenticationHeaders: true,
	relaxedMethods: false,
	relaxedContentTypeJsonParse: true,
	filterStandardHeaders: true,
	logErrors: true,
	attemptToParameterizeUrl: true,
	dropPathsWithoutSuccessfulResponse: true,
	verbose: false,
	file: path.normalize(`./har.json`),
	out: path.normalize(`./openapi.yaml`)
}

/*
interface Config {
	apiKey: string
	// other properties
}

const config = require('./config.json') as Config
*/

// CLI

/**
 * @constant pns
 * Param names
*/
const pns: ParamName[] = [
	{ a: `S`, s: `inSameSpec`, l: `forceAllRequestsInSameSpec` },
	{ a: `P`, s: `srvToPaths`, l: `addServersToPaths` },
	{ a: `A`, s: `guessAuth`, l: `guessAuthenticationHeaders` },
	{ a: `m`, s: `relaxMtd`, l: `relaxedMethods` },
	{ a: `p`, s: `relaxParse`, l: `relaxedContentTypeJsonParse` },
	{ a: `H`, s: `filterStdHeads`, l: `filterStandardHeaders` },
	{ a: `L`, s: `logErrors`, l: `logErrors` },
	{ a: `q`, s: `tryParamUrl`, l: `attemptToParameterizeUrl` },
	{ a: `N`, s: `drop404`, l: `dropPathsWithoutSuccessfulResponse` },
]

const pnsf = pnf(pns)

const cliOpts: clu.OptionDefinition[] = [
	//{ group: `App`, type: String, name: 'src', multiple: true, defaultOption: true },
	//{ group: `App`, type: Number, alias: 't', name: 'timeout' },
	//{ group: `App`, type: Boolean, defaultValue: false, alias: 'v', name: 'verbose', description: `Report on most performed operations` },
	//{ group: `App`, type: Boolean, defaultValue: false, alias: 'd', name: 'debug', description: `Print diagnostic messages.` },
	{ group: `App`, type: Boolean, defaultValue: false, alias: 'h', name: `help`, description: `Display help message.` },
	{ group: `App`, type: Boolean, defaultValue: false, alias: 'V', name: `version`, description: `Display version.` },
	//{ group: `App`, type: Boolean, defaultValue: false, alias: `C`, name: `configExport`, description: `Print effective config to stderr.` },
	{ group: `App`, type: String, defaultValue: `./openapi.yaml`, alias: `o`, name: `out`, description: 'Output file path.' },
	//{ group: `App`, type: String, defaultValue: `yaml`, alias: `F`, name: `format`, description: 'Output file format.' },
	//{ group: `App`, type: Boolean, defaultValue: false, alias: 's', name: `safeOut`, description: `Safe output - doesn't write to a non-empty file.` },
	//{ group: `App`, type: Boolean, defaultValue: false, alias: 'a', name: `append`, description: `Append to an output file. Conflicts with --safeOut.` },
	//TODO: Replace with `...f(pns, defaults, ): clu.OptionDefinition[]`
	{ group: `HAR`, type: Boolean, defaultValue: false, alias: `S`, name: `${pnsf(`forceAllRequestsInSameSpec`).s}`, description: `Treat every url as having the same domain.` },
	{ group: `HAR`, type: Boolean, defaultValue: false, alias: `P`, name: `${pnsf(`addServersToPaths`).s}`, description: `Add a servers entry to every path object.` },
	{ group: `HAR`, type: Boolean, defaultValue: true, alias: `A`, name: `${pnsf(`guessAuthenticationHeaders`).s}`, description: `Try and guess common auth headers.` },
	{ group: `HAR`, type: Boolean, defaultValue: false, alias: `m`, name: `${pnsf(`relaxedMethods`).s}`, description: `Allow non-standard methods.` },
	{ group: `HAR`, type: Boolean, defaultValue: true, alias: `p`, name: `${pnsf(`relaxedContentTypeJsonParse`).s}`, description: `Try and parse non application/json responses as json.` },
	{ group: `HAR`, type: Boolean, defaultValue: true, alias: `H`, name: `${pnsf(`filterStandardHeaders`).s}`, description: `Filter out all standard headers from the parameter list in openapi.` },
	{ group: `HAR`, type: Boolean, defaultValue: true, alias: `L`, name: `${pnsf(`logErrors`).s}`, description: `Log errors to console.` },
	{ group: `HAR`, type: Boolean, defaultValue: true, alias: `q`, name: `${pnsf(`attemptToParameterizeUrl`).s}`, description: `Try and parameterize an URL.` },
	{ group: `HAR`, type: Boolean, defaultValue: true, alias: `N`, name: `${pnsf(`dropPathsWithoutSuccessfulResponse`).s}`, description: `Don't include paths without a response or with a non-2xx response.` },
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
//const vbLogW = verboseLog(options.verbose)

const usage: string = clu([
	{
		header: `Options`,
		content: 'Usage'
	},
	{
		optionList: cliOpts
	}
])

options.help && printHelp(usage)

options.version && printVer(pkgManif)

/**
 * Loads configs from all possible config file locations, layering one over the other, all over hardcoded defaults.
 * 
 * Params are loaded if present.
 * 
 * Conf load order:
 * 
 * 1. Default "hardcoded" params
 * 2. `conf` file @ app distro
 * 3. `conf` file @ `/etc` dir
 * 4. `conf` file @ Home dir
 * 5. `conf` file @ Work dir
 * 6. CLI params
 * 
 * Probably no reason to store all param file data, so not doing it now.
 * 
 * But it might be more scalable for future features than current strategy.
 * 
 * 
 */
const layerParams = (paths: SysPaths) => (defaults: HAR2OAPICLIParams): HAR2OAPICLIParams =>
	Object.values(paths)
		.map(path => jsonLoad<HAR2OAPICLIParams>(loadFile(path)(false)))
		.reduce(HAR2OAPICLIParams.reducer, defaults)

//const paramObj: HAR2OAPICLIParams = Object.values(paths).map(path => jsonLoad(loadFile(path)())).reduce(HAR2OAPICLIParams.reducer, defaults)

const paramRename = <T1>(names: ParamName[]) => <T2>(obj: T2): T1 => Object.fromEntries(names.map(({ s, l }) => [l, obj[s]])) as T1

const optsExpanded: HAR2OAPICLIParams = paramRename<HAR2OAPICLIParams>(pns)<cla.CommandLineOptions>(options)

/** 
 * Processing CLI `options` here.
 * 
 * `options` is a flat 1L object.
 * 
 * + `options` uses shortened param names
 * + stores of type `HAR2OAPICLIParams` - long full names
 * + Mapping is in `pns`
 */
const runtimeParams: HAR2OAPICLIParams = {
	...layerParams(paths)(defaults) as HAR2OAPICLIParams,
	...optsExpanded as HAR2OAPICLIParams
}

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
 * 
 * Reading HAR from inputs
 * <- Process file and stdin streams
 * <- Detect and prioritize stdin stream over file
 * 	+ throw error if there is an input file option while HAS_PIPE?
 * 	+ fallback on using the only non-empty out of 2?
 */

// process.stdin.on('data', chunk => input += chunk)
// process.stdin.on('end', () => {
// 	// process input here
// })

// Runtime constants

const HAS_PIPE: boolean = !process.stdin.isTTY
const HAS_FILE: boolean = !!options.file
const HAS_INPUT: boolean = HAS_FILE || HAS_PIPE

/**
 * Take input file.
 * If (no file name) and (no STDIN pipe) - print error, exit
 */
!HAS_INPUT && thr()(erh('Provide input via --file or stdin pipe.')()())

let har: Har = null

if (HAS_FILE) {
	har = jsonLoad<Har>(loadFile(options.file)(true))
} else if (HAS_PIPE) {
	let pipedHarData: string = ""
	for await (const chunk of process.stdin) pipedHarData += chunk
	har = jsonLoad<Har>(pipedHarData)
}

if (har === null) { thr()(erh('Provide input via --file or stdin pipe.')()()) }

// Actually generating the specification

const { spec: openAPIObj }: HarToOpenAPISpec_tmpComp = await generateSpec(har, runtimeParams as HarToOpenAPIConfig)

// TODO: Serialize it into specified format

//JSON.stringify(obj)
//YAML.stringify(obj)

// const processOutput = (handler, config): void => {
// 	/*
// 	Output options:
// 	+ Pipe to STDOUT
// 	+ Write to a file by a filename
// 	+ Optionally ask for a proper output format
// 	*/
// }

// TODO: Return serialized to specified output destination

