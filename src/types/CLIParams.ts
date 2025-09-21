import { jsonLoad, loadFile } from '../utils/files'
import { HarToOpenAPIConfig } from './HarToOpenAPIConfig'
import { SysPaths } from './SysPaths'
import { appConfig } from './appConfig'

export type CLIParams = HarToOpenAPIConfig & appConfig // TODO: Adapt for a generic
export namespace CLIParams {
	/**
	 * Type array reducer function
	 *
	 * @param state {Partial<CLIParams>} Accumulator
	 * @param update {Partial<CLIParams>} Next object in the line
	 * @returns Layered object
	 */
	export const reducer = (
		state: Partial<CLIParams>,
		update: Partial<CLIParams>
	): CLIParams => {
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
	 */
	export const layer = (paths: SysPaths) => (defaults: CLIParams): CLIParams => Object.values(paths)
		.map(path => jsonLoad<CLIParams>(loadFile(path)(false)))
		.reduce(reducer, defaults)
}

