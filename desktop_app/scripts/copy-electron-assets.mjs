import { cpSync, mkdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const sourcePreloadPath = path.join(projectRoot, 'src/electron/preload.cjs')
const outputDirectory = path.join(projectRoot, 'dist-electron/electron')
const outputPreloadPath = path.join(outputDirectory, 'preload.cjs')

mkdirSync(outputDirectory, { recursive: true })
cpSync(sourcePreloadPath, outputPreloadPath)
