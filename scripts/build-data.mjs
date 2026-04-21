import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function loadYaml(relPath) {
  const content = readFileSync(resolve(root, relPath), 'utf-8')
  return yaml.load(content)
}

const concerthalls = loadYaml('data/facilities/concerthall.yaml')
const practices = loadYaml('data/facilities/facilities.yaml')

const outDir = resolve(root, 'src/data')
mkdirSync(outDir, { recursive: true })

writeFileSync(
  resolve(outDir, 'concerthalls.json'),
  JSON.stringify(concerthalls, null, 2),
  'utf-8'
)
writeFileSync(
  resolve(outDir, 'practices.json'),
  JSON.stringify(practices, null, 2),
  'utf-8'
)

console.log(`Built: ${concerthalls.length} concerthalls, ${practices.length} practices`)
