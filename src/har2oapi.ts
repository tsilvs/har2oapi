import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import cla from 'command-line-args'
import clu from 'command-line-usage'
import type { Har } from "har-format"
import { generateSpec } from "har-to-openapi"
import { HarToOpenAPIConfig } from "har-to-openapi/dist/types"
import stripJsonComments from 'strip-json-comments'

const paramNames: { long: string, short: string }[] = [
	{ long: `forceAllRequestsInSameSpec`, short: `inSameSpec` },
	{ long: `addServersToPaths`, short: `srvToPaths` },
	{ long: `guessAuthenticationHeaders`, short: `guessAuth` },
	{ long: `relaxedMethods`, short: `relaxMtd` },
	{ long: `relaxedContentTypeJsonParse`, short: `relaxParse` },
	{ long: `filterStandardHeaders`, short: `filterStdHeads` },
	{ long: `logErrors`, short: `logErrors` },
	{ long: `attemptToParameterizeUrl`, short: `tryParamUrl` },
	{ long: `dropPathsWithoutSuccessfulResponse`, short: `drop404` },
]

const cliOpts: clu.OptionDefinition[] = [
	//{ name: 'verbose', alias: 'v', type: Boolean },
	//{ name: 'src', type: String, multiple: true, defaultOption: true },
	//{ name: 'timeout', alias: 't', type: Number }
	{ name: `help`, alias: 'h', type: Boolean, defaultValue: false, description: `Display help message.` },
	{ name: `version`, alias: 'v', type: Boolean, defaultValue: false, description: `Display version.` },
	{ name: `${paramNames.find(pn => pn.long == `forceAllRequestsInSameSpec`).short}`, alias: `S`, type: Boolean, defaultValue: false, description: `Treat every url as having the same domain.` },
	{ name: `${paramNames.find(pn => pn.long == `addServersToPaths`).short}`, alias: `P`, type: Boolean, defaultValue: false, description: `Add a servers entry to every path object.` },
	{ name: `${paramNames.find(pn => pn.long == `guessAuthenticationHeaders`).short}`, alias: `A`, type: Boolean, defaultValue: true, description: `Try and guess common auth headers.` },
	{ name: `${paramNames.find(pn => pn.long == `relaxedMethods`).short}`, alias: `m`, type: Boolean, defaultValue: false, description: `Allow non-standard methods.` },
	{ name: `${paramNames.find(pn => pn.long == `relaxedContentTypeJsonParse`).short}`, alias: `p`, type: Boolean, defaultValue: true, description: `Try and parse non application/json responses as json.` },
	{ name: `${paramNames.find(pn => pn.long == `filterStandardHeaders`).short}`, alias: `H`, type: Boolean, defaultValue: true, description: `Filter out all standard headers from the parameter list in openapi.` },
	{ name: `${paramNames.find(pn => pn.long == `logErrors`).short}`, alias: `L`, type: Boolean, defaultValue: true, description: `Log errors to console.` },
	{ name: `${paramNames.find(pn => pn.long == `attemptToParameterizeUrl`).short}`, alias: `q`, type: Boolean, defaultValue: true, description: `Try and parameterize an URL.` },
	{ name: `${paramNames.find(pn => pn.long == `dropPathsWithoutSuccessfulResponse`).short}`, alias: `N`, type: Boolean, defaultValue: true, description: `Don't include paths without a response or with a non-2xx response.` },
]

const usage: string = clu(
	{
		header: `Options`,
		optionList: cliOpts
	}
)

const appinfo = {
	name: `har2oapi`,
	configfile: `config.jsonc`,
	buildroot: `${__dirname}`,
	systemroot: ``,
	homeroot: `${os.homedir()}`,
	workdir: `${process.cwd()}`
}
type HAR2OAPICLIParams = {
	config: HarToOpenAPIConfig
}

type SysPaths = {
	builtin: fs.PathOrFileDescriptor,
	shared: fs.PathOrFileDescriptor,
	home: fs.PathOrFileDescriptor,
	workdir: fs.PathOrFileDescriptor
}

// 1. Default "hardcoded" params

const defaults: HarToOpenAPIConfig = {
	forceAllRequestsInSameSpec: false,
	addServersToPaths: false,
	guessAuthenticationHeaders: true,
	relaxedMethods: false,
	relaxedContentTypeJsonParse: true,
	filterStandardHeaders: true,
	logErrors: true,
	attemptToParameterizeUrl: true,
	dropPathsWithoutSuccessfulResponse: true
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

// 6. CLI params

const cliParams: cla.CommandLineOptions = cla(
	cliOpts,
	{
		partial: true,
		//camelCase: true,
		caseInsensitive: false
	}
)

// TODO:
// + Deal with file loading
// + Deal with loaded file data storage
// 	+ Probably no reason to store all param file data, but might be more scalable for future features

const loadJsonFile = (path: fs.PathOrFileDescriptor): Promise<object> =>
	new Promise((resolve, reject) => {
		fs.readFile(path, 'utf8', (err, data) => {
			if (err) return reject(err)
			try {
				const jsonParsed = JSON.parse(stripJsonComments(data))
				resolve(jsonParsed)
			} catch (e) {
				reject(e)
			}
		})
	})

const readParamFiles = (paths: SysPaths): Promise<object[]> =>
	Promise.all(Object.values(paths).map(path => loadJsonFile(path)))

const fileParams = await readParamFiles(paths)

// Conf loading process:
// CLI params are loaded if present

// Conf load order:
// 1. Default "hardcoded" params
// 2. conf file @ app distro
// 3. conf file @ /etc/ dir
// 4. conf file @ Home dir
// 5. conf file @ Work dir
// 6. CLI params

// Reading params
// 1. Load default params
// 2. If an app dir config file is present - overwrite loaded params with it's params
// 3. If an /etc/ dir config file is present - overwrite loaded params with it's params
// 4. If a Home dir config file is present - overwrite loaded params with it's params
// 5. If a current work dir config file is present - overwrite loaded params with it's params
// 6. If cmd params are present - overwrite loaded params with it's params

const composeParams = (defaults: HarToOpenAPIConfig) => {
	let params = defaults
	return (fileParams: object[]) => {
		const merged = fileParams.reduce((acc, obj) => ({ ...acc, ...obj }), params)
		return (cliParams: cla.CommandLineOptions) => ({ ...params, ...cliParams })
	}
}

// read a har file from wherever you want - in this example its just a root json object
// const har = await fs.readFile("my.har")

// const serializers = {
// 	json: (obj: object) => JSON.stringify(obj),
// 	yaml: (obj: object) => YAML.stringify(obj)
// }

const params = composeParams(defaults)(fileParams)(cliParams)

const processInput = (): Har => {
	/*
	Options to read HAR file:
	1. If there's an STDIN pipe - read it
	2. If there's an input file name - read from it
	*/
	// 1. Read a HAR input - file or pipe
	// 2. Parse JSON
	// 3. Return object. HAR Log structure is expected
	// With the structure: har.log.entries[]
}

const har: Har = processInput()

const config: HarToOpenAPIConfig = params.config

const openapi = await generateSpec(har, config)
const { spec, yamlSpec } = openapi
// spec = { ... } openapi spec schema document
// yamlSpec = string, "info: ..."

const processOutput = (handler, config): void => {
	/*
	Output options:
	+ Pipe to STDOUT
	+ Write to a file by a filename
	+ Optionally ask for a proper output format
	*/
}

// return or write a YAML