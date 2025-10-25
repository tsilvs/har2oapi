import * as fs from 'fs'
import * as os from 'os'
import stripJsonComments from 'strip-json-comments'
import { erh } from './errors'
import * as path from 'path'
import { SysPaths } from '../types/SysPaths'
import { AppInfo } from '../types/AppInfo'
import pkgManif from '../../package.json' with { type: "json" }

export const ainf: AppInfo = {
	name: `${pkgManif.name}`,
	configfile: `config.jsonc`,
	buildroot: `${__dirname}`,
	systemroot: ``,
	homeroot: `${os.homedir()}`,
	workdir: `${process.cwd()}`
}

export const paths: SysPaths = {
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

export const loadFile = /* async */ (path: fs.PathLike) => (exitOnError: boolean = true): string => {
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

export const jsonLoad = <T>(data: string): T => {
	let datanc: string = ''
	try {
		datanc = stripJsonComments(data) // TODO: Decide if I need it all the time or not. It may come out as an overhead and slow down the runtime. But also gives more versatility.
		return JSON.parse(datanc) as T
	} catch (err) {
		erh()()()(err)
	}
}

