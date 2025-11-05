import * as fs from 'fs'
import * as fsp from 'fs/promises'
// import * as wt from 'worker_threads'
import cla from 'command-line-args'
import clu from 'command-line-usage'
import type { Har } from "har-format"
//import { OpenAPIObject } from 'openapi3-ts'
import * as YAML from 'yaml'
import { generateSpec } from 'har-to-openapi'
import { RunParams } from './types/RunParams'
import { PackageJson } from 'type-fest'
import { HarToOpenAPIConfig } from './types/HarToOpenAPIConfig'
import { HarToOpenAPISpec } from './types/HarToOpenAPISpec'
import { ParamDef } from './types/ParamDef'
import { jsonLoad, loadFile, paths } from './utils/files'
import { printHelp, printVer } from './utils/terminfo'
import { thr, erh } from './utils/errors'
import { defaults } from './const/defaults'
import { PARAM_DEFS } from './const/PARAM_DEFS'
import pkgManif from '../package.json' with { type: "json" }

/**
 *
 * @param verbose {Bollean} Verbose logging switch
 * @param msg {String} Custom message
 * @returns
*/

// const verboseLog = (verbose: boolean) => (msg: string): void => { verbose && process.stdout.write(msg) }

const cliOpts: clu.OptionDefinition[] = PARAM_DEFS.map(ParamDef.mapper(defaults))

const options: cla.CommandLineOptions = cla(
	cliOpts,
	{
		argv: [...process.argv.slice(2)],
		partial: false,
		stopAtFirstUnknown: true,
		camelCase: true,
		caseInsensitive: false,
	}
)._all // Fixed: wasn't reading CLI options

/**
 * If verbose - will print verbose logs. // TODO: Use it.
 */
//const vbLogW = verboseLog(runtimeParams.verbose)

const usage: string = clu(
	[
		{
			header: `Options`,
			content: 'Usage'
		},
		{
			header: 'HAR Options',
			optionList: cliOpts,
			group: 'HAR',
			hide: '',
			reverseNameOrder: false,
			raw: false
		},
		{
			header: 'App Options',
			optionList: cliOpts,
			group: 'App',
			hide: '',
			reverseNameOrder: false,
			raw: false
		}
	]
)

// tbh,
// kind of stupid that in this library
// you have to filter the groups manually for grouping
// instead of just relying on it to construct the group usage text
// as it iterates over definitions and detect groups

// Section {
// 	header?: string                                     // The section header, always bold and underlined
// 	content?: string[] | { data: any; options: any }    // string(s) or { data, options } for help text rendering
// 	optionList?: OptionDefinition[]                     // An array of option definition objects
// 	tableOptions?: any;                                 // An options object suitable for passing into table-layout
// 	group?: string[]                                    // positive filter by groups
// 	hide?: string[]                                     // negative filter by option names
// 	raw?: boolean                                       // Set to true to avoid indentation and wrapping
// 	reverseNameOrder?: boolean                          // display as `--name, -n`
// }

options.help && printHelp(usage)

options.version && printVer(pkgManif as PackageJson)

const optsExpanded: RunParams = ParamDef.rename<RunParams>(PARAM_DEFS)<cla.CommandLineOptions>(options) // Fixed: was Generating `undefined` object param values

/** 
 * Processing CLI `options` here.
 * 
 * `options` is a flat 1L object.
 * 
 * + `options` uses shortened param names
 * + stores of type `HAR2OAPICLIParams` - long full names
 * + Mapping is in `pns`
 */
const runtimeParams: RunParams = { ...RunParams.layer(paths)(defaults) as RunParams, ...optsExpanded as RunParams }

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

// TODO: Check if input file is empty

const INPUT_PATH: fs.PathLike = runtimeParams.input
const HAS_PIPE: boolean = !process.stdin.isTTY
const HAS_FILE: boolean = !!runtimeParams.input
const HAS_INPUT: boolean = HAS_FILE || HAS_PIPE

// TODO: Check if output file is empty

const OUTPUT_PATH: fs.PathLike = runtimeParams.output
const OUTPUT_STDOUT: boolean = !runtimeParams.output
const OUTPUT_FILE: boolean = !!runtimeParams.output

const __msg_nofile = `Provide input via --input or stdin pipe.`

/**
 * Take input file.
 * If (no file name) and (no STDIN pipe) - print error, exit
 */
!HAS_INPUT && thr(`${__msg_nofile}`)(erh()()(true))

let har: Har = null

if (HAS_FILE) {
	har = jsonLoad(true)<Har>(loadFile(INPUT_PATH)(true)())
} else if (HAS_PIPE) {
	let pipedHarData: string = ``
	for await (const chunk of process.stdin) pipedHarData += chunk
	har = jsonLoad(true)<Har>(pipedHarData)
}

if (har === null) { thr(`${__msg_nofile}`)(erh()()(true)) }

// Actually generating the specification

const { spec: openAPIObj }: HarToOpenAPISpec = await generateSpec(har, runtimeParams as HarToOpenAPIConfig)

let output: string = ``

switch (runtimeParams.format) {
	case `yml`:
	case `yaml`: output = YAML.stringify(openAPIObj); break
	case `json`: output = JSON.stringify(openAPIObj); break
	default: thr(`Entering Tormented Space. It's a rough neighborhood. Those who go there usually vanish.`)(erh()()())
}

/*
// TODO: Return serialized to specified output destination
Output options:
+ Pipe to STDOUT
+ Write to a file by a filename
+ Optionally ask for a proper output format
*/

if (OUTPUT_STDOUT) process.stdout.write(`${output}\n`)

// TODO: 'await' has no effect on the type of this expression.ts(80007)

if (OUTPUT_FILE) fs.writeFile(OUTPUT_PATH, output, {
	encoding: `utf8`,
	// signal: ,
	// mode: ``,
	flag: `w`,
	// flush: ``,
}, (err) => {
	if (err) {
		thr(`Error writing file ${OUTPUT_PATH}`)(erh()()(true))
		return
	}
	console.log('File written successfully!')
})


