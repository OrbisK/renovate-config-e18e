import { readFileSync, writeFileSync } from 'node:fs'
import { preferredReplacements } from 'module-replacements'
import {
  buildAbandonmentConfig,
  buildColumnsConfig,
  buildDefaultConfig,
  buildMergeConfidenceConfig,
  buildRecommendationsConfig,
  buildReplacementNameMap,
  buildReplacementsConfig,
  fetchAllVersions,
  groupModulesByUrlId,
  loadDocContent,
} from './lib.js'

const { mappings, replacements: replacementDefs } = preferredReplacements

const moduleNames = Object.keys(mappings).sort()
const { modulesByUrlId, urlById, sortedUrlIds }
  = groupModulesByUrlId(mappings)
const urlIdToReplacementName = buildReplacementNameMap(
  mappings,
  replacementDefs,
)

const docsDir = new URL('../docs', import.meta.url)
const docContent = loadDocContent(docsDir)

const replacementNames = [...new Set(urlIdToReplacementName.values())]
const latestVersions = await fetchAllVersions(replacementNames)

const { version } = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf-8'),
)

const abandonment = buildAbandonmentConfig(moduleNames)
const recommendations = buildRecommendationsConfig(
  sortedUrlIds,
  modulesByUrlId,
  urlById,
)
const replacementsConfig = buildReplacementsConfig(
  sortedUrlIds,
  urlIdToReplacementName,
  latestVersions,
  modulesByUrlId,
  urlById,
  docContent,
)
const columns = buildColumnsConfig()
const mergeConfidence = buildMergeConfidenceConfig(
  sortedUrlIds,
  modulesByUrlId,
  urlById,
)
const defaultConfig = buildDefaultConfig(version)

writeFileSync(
  new URL('../abandonment.json', import.meta.url),
  `${JSON.stringify(abandonment, null, 2)}\n`,
)
writeFileSync(
  new URL('../recommendations.json', import.meta.url),
  `${JSON.stringify(recommendations, null, 2)}\n`,
)
writeFileSync(
  new URL('../replacements.json', import.meta.url),
  `${JSON.stringify(replacementsConfig, null, 2)}\n`,
)
writeFileSync(
  new URL('../columns.json', import.meta.url),
  `${JSON.stringify(columns, null, 2)}\n`,
)
writeFileSync(
  new URL('../mergeConfidence.json', import.meta.url),
  `${JSON.stringify(mergeConfidence, null, 2)}\n`,
)
writeFileSync(
  new URL('../default.json', import.meta.url),
  `${JSON.stringify(defaultConfig, null, 2)}\n`,
)

console.log(`Generated abandonment.json with ${moduleNames.length} packages`)
console.log(
  `Generated recommendations.json with ${recommendations.packageRules.length} rules for ${moduleNames.length} packages`,
)
console.log(
  `Generated replacements.json with ${replacementsConfig.packageRules.length} replacements`,
)
console.log(
  `Generated columns.json with ${columns['community-notes'].packageRules.length} rules`,
)
console.log(
  `Generated mergeConfidence.json with ${mergeConfidence['age-confidence'].packageRules.length} rules per sub-preset`,
)
