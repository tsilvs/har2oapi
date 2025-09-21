import * as fs from 'fs'

export type SysPaths = {
	builtin: fs.PathLike
	shared: fs.PathLike
	home: fs.PathLike
	workdir: fs.PathLike
}
