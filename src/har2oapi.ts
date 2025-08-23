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
	forceAllRequestsInSameSpec: Boolean,
	addServersToPaths: Boolean,
	guessAuthenticationHeaders: Boolean,
	relaxedMethods: Boolean,
	relaxedContentTypeJsonParse: Boolean,
	filterStandardHeaders: Boolean,
	logErrors: Boolean,
	attemptToParameterizeUrl: Boolean,
	dropPathsWithoutSuccessfulResponse: Boolean
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
	// { group: `App`, type: String, name: 'src', multiple: true, defaultOption: true },
	// { group: `App`, type: Number, alias: 't', name: 'timeout' },
	{ group: `App`, type: Boolean, defaultValue: false, alias: 'v', name: 'verbose' },
	{ group: `App`, type: Boolean, defaultValue: false, alias: 'h', name: `help`, description: `Display help message.` },
	{ group: `App`, type: Boolean, defaultValue: false, alias: 'V', name: `version`, description: `Display version.` },
	{ group: `HAR`, type: Boolean, defaultValue: false, alias: `S`, name: `${pnf(pns)(`forceAllRequestsInSameSpec`).s}`, description: `Treat every url as having the same domain.` },
	{ group: `HAR`, type: Boolean, defaultValue: false, alias: `P`, name: `${pnf(pns)(`addServersToPaths`).s}`, description: `Add a servers entry to every path object.` },
	{ group: `HAR`, type: Boolean, defaultValue: true, alias: `A`, name: `${pnf(pns)(`guessAuthenticationHeaders`).s}`, description: `Try and guess common auth headers.` },
	{ group: `HAR`, type: Boolean, defaultValue: false, alias: `m`, name: `${pnf(pns)(`relaxedMethods`).s}`, description: `Allow non-standard methods.` },
	{ group: `HAR`, type: Boolean, defaultValue: true, alias: `p`, name: `${pnf(pns)(`relaxedContentTypeJsonParse`).s}`, description: `Try and parse non application/json responses as json.` },
	{ group: `HAR`, type: Boolean, defaultValue: true, alias: `H`, name: `${pnf(pns)(`filterStandardHeaders`).s}`, description: `Filter out all standard headers from the parameter list in openapi.` },
	{ group: `HAR`, type: Boolean, defaultValue: true, alias: `L`, name: `${pnf(pns)(`logErrors`).s}`, description: `Log errors to console.` },
	{ group: `HAR`, type: Boolean, defaultValue: true, alias: `q`, name: `${pnf(pns)(`attemptToParameterizeUrl`).s}`, description: `Try and parameterize an URL.` },
	{ group: `HAR`, type: Boolean, defaultValue: true, alias: `N`, name: `${pnf(pns)(`dropPathsWithoutSuccessfulResponse`).s}`, description: `Don't include paths without a response or with a non-2xx response.` },
	{ group: `HAR`, type: String, alias: `f`, name: `file`, description: 'Input file', defaultOption: true }
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

const vbLogW = verboseLog(options.verbose)

// Print Help, exit

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

if (options.help) printHelp(usage)

// Take input file

// If no file name or no STDIN pipe - print error, exit

!options.file && process.stdin.isTTY && thr()()(erh('Provide input via --file or stdin pipe.')())

// if (no file passed) and (pipe is not a file)
// can be
// t & t = t
// t & f = f
// f & t = f
// f & f = f
// Will execute only when (no file passed) and (pipe is not a file)
// If (file passed) but (pipe is not a file) then we go further
// If (file not passed) but (pipe is a file) then we go further
// If (file passed) and (pipe is a file) then we go further

/*

File conditions:

| Condition | Necessary | Sufficient |
|-----------|-----------|------------|
| Exists    | Yes       | No         |
| Filled    | Yes       | Yes        |

Therefore, in the same function we check for both, but throw a different error on different types of failures

*/

// If no file or file invalid - print error, exit

const loadFile = /* async */ (path: fs.PathLike) => {
	let stats: fs.Stats
	try {
		stats = fs.statSync(path)
		if (stats.size > 0) {
			return fs.readFileSync(path, `utf8`)
		} else {
			throw new Error(`File is empty.`)
		}
	} catch (err) {
		erh()()(err)
	}
}

// 2. Validate the file content

/*

When we want to validate:

1. When we already have confirmed that a file exists
2. When we are loading the file - always

File loader function can be a validator function too?

It can:

1. Load
+ Store loaded data (curried clojure)? - no reason to do it here for now.
2. Validate by parsing - no other way to do it with JSON because it's a string without extra binary headers, unless relying on file name extension
+ Validation already requires parsing, so it can return parsed data
+ Can store parsed data (curried clojure)? - no reason to do it here for now.

*/

const jsonLoad = (data: string): object => {
	let datanc: string = ''
	try {
		datanc = stripJsonComments(data)
		return JSON.parse(datanc)
	} catch (err) {
		erh()()(err)
	}
}

// TODO:
// + Deal with file loading
// + Deal with loaded file data storage
// 	+ Probably no reason to store all param file data, but might be more scalable for future features

// const loadJsonFile = (path: fs.PathOrFileDescriptor): Promise<object> =>
// 	new Promise((resolve, reject) => {
// 		fs.readFile(path, 'utf8', (err, data) => {
// 			if (err) return reject(err)
// 			try {
// 				const jsonParsed = jsonLoad(data)
// 				resolve(jsonParsed)
// 			} catch (e) {
// 				reject(e)
// 			}
// 		})
// 	})

// const readParamFiles = (paths: SysPaths): Promise<object[]> =>
// 	Promise.all(Object.values(paths).map(path => loadJsonFile(path)))

// const fileParams = await readParamFiles(paths)

const paramStrings: string[] = Object.values(paths).map(path => loadFile(path))

type HAR2OAPICLIParams = {
	config: HarToOpenAPIConfig_tmpCompatSubset
}

const paramObj = paramStrings
	.map(jsonLoad)
	.reduce((acc, obj) => ({ ...acc, ...obj }), {} as HAR2OAPICLIParams)

// Runtime

// Options to read HAR file:
// 1. If there's an STDIN pipe - read it
// 2. If there's an input file name - read from it

// let input: string = ``
// process.stdin.on('data', chunk => input += chunk)
// process.stdin.on('end', () => {
// 	// process input here
// })

// TODO:
// + Detect STDIN
// + Detect file path
// 	+ Load file
// + Output through STDOUT

// // 1. Default "hardcoded" params

// const defaults: HarToOpenAPIConfig_tmpCompatSubset = {
// 	forceAllRequestsInSameSpec: false,
// 	addServersToPaths: false,
// 	guessAuthenticationHeaders: true,
// 	relaxedMethods: false,
// 	relaxedContentTypeJsonParse: true,
// 	filterStandardHeaders: true,
// 	logErrors: true,
// 	attemptToParameterizeUrl: true,
// 	dropPathsWithoutSuccessfulResponse: true
// }

// // 6. CLI params

// const cliParams: cla.CommandLineOptions = cla(
// 	cliOpts,
// 	{
// 		partial: true,
// 		//camelCase: true,
// 		caseInsensitive: false
// 	}
// )

// // Conf loading process:
// // CLI params are loaded if present

// // Conf load order:
// // 1. Default "hardcoded" params
// // 2. conf file @ app distro
// // 3. conf file @ /etc/ dir
// // 4. conf file @ Home dir
// // 5. conf file @ Work dir
// // 6. CLI params

// // Reading params
// // 1. Load default params
// // 2. If an app dir config file is present - overwrite loaded params with it's params
// // 3. If an /etc/ dir config file is present - overwrite loaded params with it's params
// // 4. If a Home dir config file is present - overwrite loaded params with it's params
// // 5. If a current work dir config file is present - overwrite loaded params with it's params
// // 6. If cmd params are present - overwrite loaded params with it's params

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