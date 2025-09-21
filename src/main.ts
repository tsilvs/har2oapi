import * as fs from 'fs'
// import * as wt from 'worker_threads'
import cla from 'command-line-args'
import clu from 'command-line-usage'
import type { Har } from "har-format"
//import { OpenAPIObject } from 'openapi3-ts'
import { generateSpec } from 'har-to-openapi'
import pkgManif from '../package.json'
import * as YAML from 'yaml'
import { CLIParams } from './types/HAR2OAPICLIParams'
import { PackageJson } from 'type-fest'
import { HarToOpenAPIConfig } from './types/HarToOpenAPIConfig'
import { HarToOpenAPISpec } from './types/HarToOpenAPISpec'
import { ParamDef } from './types/ParamDef'
import { jsonLoad, loadFile, paths } from './utils/files'
import { printHelp, printVer } from './utils/terminfo'
import { thr, erh } from './utils/errors'
import { defaults } from './const/defaults'
import { PARAM_DEFS } from './const/PARAM_DEFS'

/**
 *
 * @param verbose {Bollean} Verbose logging switch
 * @param msg {String} Custom message
 * @returns
*/
//const verboseLog = (verbose: boolean) => (msg: string): void => { verbose && process.stdout.write(msg) }

/* Interconnected parameter hierarchy:

runtimeParams.format = options.output.ext <- options.format

*/

const cliOpts: clu.OptionDefinition[] = PARAM_DEFS.map(ParamDef.mapper(defaults))

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
 * If verbose - will print verbose logs. // TODO: Use it.
 */
//const vbLogW = verboseLog(runtimeParams.verbose)

const usage: string = clu([{ header: `Options`, content: 'Usage' }, { optionList: cliOpts }])

options.help && printHelp(usage)

options.version && printVer(pkgManif as PackageJson)

const optsExpanded: CLIParams = ParamDef.rename<CLIParams>(PARAM_DEFS)<cla.CommandLineOptions>(options)

/** 
 * Processing CLI `options` here.
 * 
 * `options` is a flat 1L object.
 * 
 * + `options` uses shortened param names
 * + stores of type `HAR2OAPICLIParams` - long full names
 * + Mapping is in `pns`
 */
const runtimeParams: CLIParams = { ...CLIParams.layer(paths)(defaults) as CLIParams, ...optsExpanded as CLIParams }

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

/**
 * Take input file.
 * If (no file name) and (no STDIN pipe) - print error, exit
 */
!HAS_INPUT && thr()(erh(`Provide input via --file or stdin pipe.`)()())

let har: Har = null

if (HAS_FILE) {
	har = jsonLoad<Har>(loadFile(INPUT_PATH)(true))
} else if (HAS_PIPE) {
	let pipedHarData: string = ``
	for await (const chunk of process.stdin) pipedHarData += chunk
	har = jsonLoad<Har>(pipedHarData)
}

if (har === null) { thr()(erh(`Provide input via --file or stdin pipe.`)()()) }

// Actually generating the specification

const { spec: openAPIObj }: HarToOpenAPISpec = await generateSpec(har, runtimeParams as HarToOpenAPIConfig)

let output: string = ``

switch (runtimeParams.format) {
	case `yaml`: output = YAML.stringify(openAPIObj); break;
	case `json`: output = JSON.stringify(openAPIObj); break;
	default: thr()(erh(`Entering Tormented Space. It's a rough neighborhood. Those who go there usually vanish.`)()()); break;
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
if (OUTPUT_FILE) fs.writeFile(OUTPUT_PATH, output, erh(`Error writing file ${OUTPUT_PATH}`)()(true))
