import { ParamDef } from '../types/ParamDef'

// CLI
/**
 * @constant pns
 * Param names
*/
export const PARAM_DEFS: ParamDef[] = [
	{ g: `HAR`, a: `S`, s: `inSameSpec`, l: `forceAllRequestsInSameSpec`, d: `Treat every url as having the same domain.` },
	{ g: `HAR`, a: `P`, s: `srvToPaths`, l: `addServersToPaths`, d: `Add a servers entry to every path object.` },
	{ g: `HAR`, a: `A`, s: `guessAuth`, l: `guessAuthenticationHeaders`, d: `Try and guess common auth headers.` },
	{ g: `HAR`, a: `m`, s: `relaxMtd`, l: `relaxedMethods`, d: `Allow non-standard methods.` },
	{ g: `HAR`, a: `r`, s: `relaxParse`, l: `relaxedContentTypeJsonParse`, d: `Try and parse non application/json responses as json.` },
	{ g: `HAR`, a: `H`, s: `filterStdHeads`, l: `filterStandardHeaders`, d: `Filter out all standard headers from the parameter list in openapi.` },
	{ g: `HAR`, a: `L`, s: `logErrors`, l: `logErrors`, d: `Log errors to console.` },
	{ g: `HAR`, a: `q`, s: `tryParamUrl`, l: `attemptToParameterizeUrl`, d: `Try and parameterize an URL.` },
	{ g: `HAR`, a: `N`, s: `drop404`, l: `dropPathsWithoutSuccessfulResponse`, d: `Don't include paths without a response or with a non-2xx response.` },
	{ g: `App`, a: 'v', l: 'verbose', d: `Report on most performed operations` },
	{ g: `App`, a: 'd', l: 'debug', d: `Print diagnostic messages.` },
	{ g: `App`, a: 'h', l: `help`, d: `Display help message.` },
	{ g: `App`, a: 'V', l: `version`, d: `Display version.` },
	{ g: `App`, a: `C`, l: `configExport`, d: `Print effective config to stderr.` },
	{ g: `App`, a: `o`, l: `output`, d: 'Output file path.' },
	{ g: `App`, a: `F`, l: `format`, d: 'Output file format.' },
	{ g: `App`, a: `p`, l: `stdout`, d: 'Output to STDOUT.' },
	{ g: `App`, a: 's', l: `safeOut`, d: `Safe output - doesn't write to a non-empty file.` },
	{ g: `App`, a: 'a', l: `append`, d: `Append to an output file. Conflicts with --safeOut.` },
	{ g: `App`, a: `i`, l: `input`, d: 'Input file path.', def: true }
] as const
