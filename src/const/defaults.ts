import * as path from 'path'
import { CLIParams } from '../types/HAR2OAPICLIParams'

/**
 * @constant defaults
 * Default "hardcoded" params
*/
export const defaults: CLIParams = {
	forceAllRequestsInSameSpec: false,
	addServersToPaths: false,
	guessAuthenticationHeaders: true,
	relaxedMethods: false,
	relaxedContentTypeJsonParse: true,
	filterStandardHeaders: true,
	logErrors: true,
	attemptToParameterizeUrl: true,
	dropPathsWithoutSuccessfulResponse: true,
	//verbose: false,
	input: path.normalize(`./har2oapi.json`),
	output: path.normalize(`./openapi.yaml`),
	debug: false,
	help: false,
	version: false,
	configExport: false,
	format: `yaml`, // TODO: read from output path by default, then overwrite with a specified parameter
	safeOut: true,
	append: false
}
