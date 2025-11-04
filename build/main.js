import { execSync } from 'child_process'
import { cpSync } from 'fs'
import tsconfig from '../tsconfig.json' with { type: 'json' }

// "tsc"
execSync(`tsc`, { stdio: 'inherit' })
// "tsc-esm-fix --target .build"
execSync(`tsc-esm-fix --target ${tsconfig.compilerOptions.outDir}`, { stdio: 'inherit' })

cpSync(`${tsconfig.compilerOptions.rootDir}/data`, `${tsconfig.compilerOptions.outDir}/data`, { recursive: true })

