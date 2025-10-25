import { jsonLoad, loadFile } from '../utils/files'
import { HarToOpenAPIConfig } from './HarToOpenAPIConfig'
import { SysPaths } from './SysPaths'
import { appConfig } from './appConfig'

export type RunParams = HarToOpenAPIConfig & appConfig // TODO: Adapt for a generic
export namespace RunParams {
	/**
	 * Type array reducer function
	 *
	 * @param state {Partial<RunParams>} Accumulator
	 * @param update {Partial<RunParams>} Next object in the line
	 * @returns Layered object
	 */
	export const reducer = (
		state: Partial<RunParams>,
		update: Partial<RunParams>
	): RunParams => {
		return { ...state, ...update }
		// Still not universal for arbitrary nested objects, but for that we can import lodash
		/*
		{
			harConfig: { ...state.harConfig, ...update.harConfig },
			config: { ...state.config, ...update.config }
		}
		*/
		// Was pretty cool yet simple, but we don't need it anymore
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
	export const layer = (paths: SysPaths) => (defaults: RunParams): RunParams => Object.values(paths)
		.map(path => jsonLoad<RunParams>(loadFile(path)(false)))
		.reduce(reducer, defaults)
}

