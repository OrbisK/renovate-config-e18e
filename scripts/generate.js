import { readFileSync, writeFileSync } from "node:fs";
import { preferredReplacements } from "module-replacements";

const moduleNames = preferredReplacements.moduleReplacements
  .map((r) => r.moduleName)
  .sort();

const { version } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf-8"),
);

const abandonment = {
  $schema: "https://docs.renovatebot.com/renovate-schema.json",
  description: ["Mark e18e replaceable packages as abandoned"],
  packageRules: [
    {
      description: "Mark e18e replaceable packages as abandoned",
      matchDatasources: ["npm"],
      matchPackageNames: moduleNames,
      abandonmentThreshold: "1 second", // 0 days is not supported
      addLabels: ["e18e"],
    },
  ],
};

const recommendations = {
  $schema: "https://docs.renovatebot.com/renovate-schema.json",
  description: ["Add e18e replacement recommendations to PR body"],
  packageRules: [
    {
      description: "Add e18e replacement guide link to PR body",
      matchDatasources: ["npm"],
      matchPackageNames: moduleNames,
      prBodyNotes: [
        `> [!WARNING]
> **This package has a recommended replacement.** Check the [e18e replacement guide for \`{{{depName}}}\`](https://e18e.dev/docs/replacements/{{{depName}}}) to find modern, lighter alternatives.`,
      ],
    },
  ],
};

const replacements = {
  $schema: "https://docs.renovatebot.com/renovate-schema.json",
  description: ["Replace e18e replaceable packages with recommended alternatives"],
  packageRules: [
    {
      description: "Replace glob with tinyglobby",
      matchDatasources: ["npm"],
      matchPackageNames: ["glob"],
      replacementName: "tinyglobby",
      replacementVersion: "0.2.12",
      prBodyNotes: [
        `## Replacements for \`glob\`

### \`tinyglobby\`

[\`tinyglobby\`](https://github.com/SuperchupuDev/tinyglobby) provides a similar API.

Example:

\`\`\`ts
import { glob } from 'glob' // [!code --]
import { glob } from 'tinyglobby' // [!code ++]

const files = await glob('**/*.ts')
\`\`\`

Most options available to \`glob\` are available in \`tinyglobby\`, read more at the [tinyglobby documentation](https://superchupu.dev/tinyglobby/documentation).

### \`fs.glob\` (native, since Node 22.x)

[\`fs.glob\`](https://nodejs.org/api/fs.html#fspromisesglobpattern-options) is built into modern versions of Node.

Example:

\`\`\`ts
import { glob } from 'glob' // [!code --]
import { glob } from 'node:fs/promises' // [!code ++]

const files = await glob('src/**/*.ts', { // [!code --]
const files = await Array.fromAsync(glob('src/**/*.ts', { // [!code ++]
  cwd,
}) // [!code --]
})) // [!code ++]
\`\`\`

You can also iterate over the results asynchronously:

\`\`\`ts
for await (const result of glob('src/**/*.ts', { cwd })) {
  // result is an individual path
  console.log(result)
}
\`\`\`

> [!NOTE]
> Node's built-in \`glob\` is more minimal and does not support negation patterns or fine-grained options like setting a max depth out of the box.

### \`fdir\`

[\`fdir\`](https://github.com/thecodrr/fdir/) offers similar functionality but through a different API (and \`tinyglobby\` is actually built on top of it).

Example:

\`\`\`ts
import { fdir } from 'fdir' // [!code ++]
import { glob } from 'glob' // [!code --]

const files = new fdir() // [!code ++]
  .withBasePath() // [!code ++]
  .glob('src/**/*.ts') // [!code ++]
  .crawl(cwd) // [!code ++]
  .withPromise() // [!code ++]
const files = await glob('src/**/*.ts', { cwd, maxDepth: 6 }) // [!code --]
\`\`\`

---
*Source: [e18e module replacements](https://e18e.dev/docs/replacements/glob)*`,
      ],
    },
  ],
};

const defaultConfig = {
  $schema: "https://docs.renovatebot.com/renovate-schema.json",
  description: ["e18e presets for Renovate"],
  extends: [
    `github>OrbisK/renovate-config-e18e:abandonment#${version}`,
    `github>OrbisK/renovate-config-e18e:recommendations#${version}`,
    `github>OrbisK/renovate-config-e18e:replacements#${version}`,
  ],
};

writeFileSync(
  new URL("../abandonment.json", import.meta.url),
  JSON.stringify(abandonment, null, 2) + "\n",
);
writeFileSync(
  new URL("../recommendations.json", import.meta.url),
  JSON.stringify(recommendations, null, 2) + "\n",
);
writeFileSync(
  new URL("../replacements.json", import.meta.url),
  JSON.stringify(replacements, null, 2) + "\n",
);
writeFileSync(
  new URL("../default.json", import.meta.url),
  JSON.stringify(defaultConfig, null, 2) + "\n",
);
console.log(`Generated abandonment.json with ${moduleNames.length} packages`);
console.log(`Generated replacements.json with ${replacements.packageRules.length} replacements`);
