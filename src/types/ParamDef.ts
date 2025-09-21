import clu from 'command-line-usage'
import { CLIParams } from './CLIParams'

/**
 * @type ParamDef
 *
*/
export type ParamDef = {
	a: string
	s?: string
	l: string
	d: string
	g: string
	def?: boolean
}

export namespace ParamDef {
	/**
	 *
	 * @param pdefs
	 * @param n
	 * @returns
	*/
	export const find = (pdefs: ParamDef[]) => (n: string): ParamDef => pdefs.find(pn => pn.l == n)

	export const mapper = (defaults: CLIParams) => (pdef: ParamDef): clu.OptionDefinition => {
		const curDeVal = defaults[`${pdef.l}`]
		return {
			group: `${pdef.g}`,
			type: curDeVal.constructor,
			defaultValue: curDeVal,
			alias: `${pdef.a}`,
			name: `${pdef.s ? pdef.s : pdef.l}`,
			description: `${pdef.d}`,
			...(pdef.def !== undefined && { defaultOption: pdef.def })
		}
	}
	export const rename = <T1>(names: ParamDef[]) => <T2>(obj: T2): T1 => Object.fromEntries(names.map(({ s, l }) => [l, obj[s]])) as T1
}

