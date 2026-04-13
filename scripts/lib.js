import { readdirSync, readFileSync } from 'node:fs'
import { resolveDocUrl } from 'module-replacements'

export function stripFrontmatter(raw) {
  return raw.replace(/^---\n[\s\S]*?\n---\n?/, '')
}

export function adjustHeadingLevels(markdown) {
  return markdown.replace(/^(#{1,5}) /gm, '$1# ')
}

export function groupModulesByUrlId(mappings) {
  const modulesByUrlId = new Map()
  const urlById = new Map()
  for (const mapping of Object.values(mappings)) {
    const urlId = mapping.url?.id
    if (!urlId)
      continue
    if (!modulesByUrlId.has(urlId)) {
      modulesByUrlId.set(urlId, [])
      urlById.set(urlId, mapping.url)
    }
    modulesByUrlId.get(urlId).push(mapping.moduleName)
  }
  const sortedUrlIds = [...modulesByUrlId.keys()].sort()
  for (const urlId of sortedUrlIds) {
    modulesByUrlId.get(urlId).sort()
  }
  return { modulesByUrlId, urlById, sortedUrlIds }
}

export function buildReplacementNameMap(mappings, replacementDefs) {
  const urlIdToReplacementName = new Map()
  const seenUrlIds = new Set()
  for (const mapping of Object.values(mappings)) {
    const urlId = mapping.url?.id
    if (!urlId || seenUrlIds.has(urlId))
      continue
    seenUrlIds.add(urlId)
    for (const rid of mapping.replacements) {
      const rep = replacementDefs[rid]
      if (rep?.type === 'documented') {
        urlIdToReplacementName.set(urlId, rep.replacementModule)
        break
      }
    }
  }
  return urlIdToReplacementName
}

export function loadDocContent(docsDir) {
  const docContent = new Map()
  for (const file of readdirSync(docsDir).filter(
    f => f.endsWith('.md') && f !== 'README.md',
  )) {
    const urlId = file.replace('.md', '')
    const raw = readFileSync(new URL(file, `${docsDir}/`), 'utf-8')
    docContent.set(urlId, stripFrontmatter(raw))
  }
  return docContent
}

export async function fetchLatestVersion(packageName) {
  const res = await fetch(
    `https://registry.npmjs.org/${packageName}/latest`,
  )
  if (!res.ok) {
    console.warn(
      `Warning: could not fetch ${packageName} (${res.status}), skipping`,
    )
    return null
  }
  const { version } = await res.json()
  return version
}

export async function fetchAllVersions(
  replacementNames,
  fetchFn = fetchLatestVersion,
) {
  const latestVersions = new Map()
  await Promise.all(
    replacementNames.map(async (name) => {
      const ver = await fetchFn(name)
      if (ver)
        latestVersions.set(name, ver)
    }),
  )
  return latestVersions
}

export function buildAbandonmentConfig(moduleNames) {
  return {
    $schema: 'https://docs.renovatebot.com/renovate-schema.json',
    description: ['Mark e18e replaceable packages as abandoned'],
    packageRules: [
      {
        description: 'Mark e18e replaceable packages as abandoned',
        matchDatasources: ['npm'],
        matchPackageNames: moduleNames,
        abandonmentThreshold: '1 second', // 0 days is not supported
        addLabels: ['e18e'],
      },
    ],
  }
}

export function buildRecommendationsConfig(sortedUrlIds, modulesByUrlId, urlById, { prBodyColumns, includeNotes = true, matchUpdateTypes = ['!replacement'] } = {}) {
  return {
    $schema: 'https://docs.renovatebot.com/renovate-schema.json',
    description: ['Add e18e replacement recommendations to PR body'],
    packageRules: sortedUrlIds.map((urlId) => {
      const docUrl = resolveDocUrl(urlById.get(urlId))
      return {
        description: 'Add e18e replacement recommendations to PR body',
        matchDatasources: ['npm'],
        matchPackageNames: modulesByUrlId.get(urlId),
        matchUpdateTypes,
        ...(prBodyColumns && { prBodyColumns }),
        prBodyDefinitions: {
          'Community Notes': `[![replacement docs](https://img.shields.io/badge/e18e-replacement%20available-blue)](${docUrl})`,
        },
        ...(includeNotes && {
          prBodyNotes: [
            `{{#unless (includes prBodyColumns "Community Notes")}}> [!WARNING]\n> **This package has a recommended replacement.** Check the [e18e replacement guide for \`{{{depName}}}\`](${docUrl}) to find modern, lighter alternatives.{{/unless}}`,
          ],
        }),
      }
    }),
  }
}

export function buildColumnsConfig() {
  return {
    '$schema': 'https://docs.renovatebot.com/renovate-schema.json',
    'description': ['prBodyColumns presets with e18e Community Notes'],
    'community-notes': {
      description: ['Default Renovate columns with e18e Community Notes'],
      packageRules: [
        {
          description: 'Add Community Notes to default prBodyColumns',
          matchDatasources: ['npm'],
          matchUpdateTypes: ['patch', 'minor', 'major'],
          prBodyColumns: ['Package', 'Type', 'Update', 'Change', 'Pending', 'Community Notes'],
        },
      ],
    },
  }
}

export function buildMergeConfidenceConfig(sortedUrlIds, modulesByUrlId, urlById) {
  const ageConfidence = buildRecommendationsConfig(sortedUrlIds, modulesByUrlId, urlById, {
    prBodyColumns: ['Package', 'Change', 'Age', 'Confidence', 'Community Notes'],
    matchUpdateTypes: ['patch', 'minor', 'major'],
    includeNotes: false,
  })
  const allBadges = buildRecommendationsConfig(sortedUrlIds, modulesByUrlId, urlById, {
    prBodyColumns: ['Package', 'Change', 'Age', 'Adoption', 'Passing', 'Confidence', 'Community Notes'],
    matchUpdateTypes: ['patch', 'minor', 'major'],
    includeNotes: false,
  })
  return {
    '$schema': 'https://docs.renovatebot.com/renovate-schema.json',
    'description': ['Merge Confidence columns combined with e18e Community Notes'],
    'age-confidence': {
      description: ['Age and Confidence columns with e18e Community Notes'],
      packageRules: ageConfidence.packageRules,
    },
    'all-badges': {
      description: ['All Merge Confidence columns with e18e Community Notes'],
      packageRules: allBadges.packageRules,
    },
  }
}

export function buildReplacementsConfig(
  sortedUrlIds,
  urlIdToReplacementName,
  latestVersions,
  modulesByUrlId,
  urlById,
  docContent,
) {
  return {
    $schema: 'https://docs.renovatebot.com/renovate-schema.json',
    description: [
      'Replace e18e replaceable packages with recommended alternatives',
    ],
    packageRules: sortedUrlIds
      .filter(
        urlId =>
          urlIdToReplacementName.has(urlId)
          && latestVersions.has(urlIdToReplacementName.get(urlId)),
      )
      .map((urlId) => {
        const repName = urlIdToReplacementName.get(urlId)
        const content = docContent.get(urlId) || ''
        const migrateBody = adjustHeadingLevels(content)
        const docUrl = resolveDocUrl(urlById.get(urlId))
        return {
          description: `Replace with ${repName}`,
          matchDatasources: ['npm'],
          matchPackageNames: modulesByUrlId.get(urlId),
          matchUpdateTypes: ['replacement'],
          replacementName: repName,
          replacementVersion: latestVersions.get(repName),
          draftPR: true,
          prBodyNotes: [
            `> [!WARNING]\n> **The [e18e](https://e18e.dev) community recommends replacing \`{{{depName}}}\` with a modern alternative.**\n> This replacement requires manual changes to imports and usage. See the full migration guide below.\n\n<details><summary>Migration guide from e18e</summary>\n\n${migrateBody}\n---\n*Source: [e18e module replacements](${docUrl})*\n\n</details>`,
          ],
        }
      }),
  }
}

export function buildBestPracticesConfig(version) {
  return {
    $schema: 'https://docs.renovatebot.com/renovate-schema.json',
    description: ['e18e presets combined with Renovate best practices and Merge Confidence'],
    extends: [
      'config:best-practices',
      `github>OrbisK/renovate-config-e18e:recommendations#${version}`,
      `github>OrbisK/renovate-config-e18e:replacements#${version}`,
      `github>OrbisK/renovate-config-e18e:mergeConfidence:all-badges#${version}`,
    ],
  }
}

export function buildDefaultConfig(version) {
  return {
    $schema: 'https://docs.renovatebot.com/renovate-schema.json',
    description: ['e18e presets for Renovate'],
    extends: [
      `github>OrbisK/renovate-config-e18e:best-practices#${version}`,
    ],
  }
}
