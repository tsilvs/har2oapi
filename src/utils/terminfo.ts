import { PackageJson } from 'type-fest'


export const printHelp = (usage: string) => {
	process.stdout.write(`${usage}\n`)
	process.exit(0)
}
export const printVer = (pkgManif: PackageJson) => {
	process.stdout.write(`${pkgManif.name} ${pkgManif.version}\n`)
	process.exit(0)
}
