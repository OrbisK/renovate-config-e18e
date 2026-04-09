import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import matter from "gray-matter";
import { preferredReplacements } from "module-replacements";

const moduleNames = preferredReplacements.moduleReplacements
  .map((r) => r.moduleName)
  .sort();

const modulesByDocPath = new Map();
for (const r of preferredReplacements.moduleReplacements) {
  if (!modulesByDocPath.has(r.docPath)) {
    modulesByDocPath.set(r.docPath, []);
  }
  modulesByDocPath.get(r.docPath).push(r.moduleName);
}
const sortedDocPaths = [...modulesByDocPath.keys()].sort();
for (const docPath of sortedDocPaths) {
  modulesByDocPath.get(docPath).sort();
}

const docsDir = new URL("../docs", import.meta.url);
const docData = new Map();
for (const file of readdirSync(docsDir).filter(f => f.endsWith(".md") && f !== "README.md")) {
  const docPath = file.replace(".md", "");
  const { data, content } = matter(readFileSync(new URL(file, docsDir + "/"), "utf-8"));
  if (!data.replacements?.length) continue;
  docData.set(docPath, { replacements: data.replacements, content });
}

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
  packageRules: sortedDocPaths.map((docPath) => ({
    description: "Add e18e replacement recommendations to PR body",
    matchDatasources: ["npm"],
    matchPackageNames: modulesByDocPath.get(docPath),
    matchUpdateTypes: ["!replacement"],
    prBodyColumns: [
      "Package",
      "Change",
      "Age",
      "Confidence",
      "Community Notes",
    ],
    prBodyDefinitions: {
      "Community Notes": `[![replacement docs](https://img.shields.io/badge/e18e-replacement%20available-blue)](https://e18e.dev/docs/replacements/${docPath})`,
    },
    prBodyNotes: [
      `{{#unless (includes prBodyColumns "Community Notes")}}> [!WARNING]\n> **This package has a recommended replacement.** Check the [e18e replacement guide for \`{{{depName}}}\`](https://e18e.dev/docs/replacements/${docPath}) to find modern, lighter alternatives.{{/unless}}`,
    ],
  })),
};

const replacements = {
  $schema: "https://docs.renovatebot.com/renovate-schema.json",
  description: ["Replace e18e replaceable packages with recommended alternatives"],
  packageRules: sortedDocPaths
    .filter((docPath) => docData.has(docPath))
    .map((docPath) => {
      const { replacements: reps, content } = docData.get(docPath);
      const migrateBody = content.replace(/^(#{1,5}) /gm, "$1# ");
      return {
        description: `Replace with ${reps[0]}`,
        matchDatasources: ["npm"],
        matchPackageNames: modulesByDocPath.get(docPath),
        replacementName: reps[0],
        prBodyNotes: [
          `> [!WARNING]\n> **The [e18e](https://e18e.dev) community recommends replacing \`{{{depName}}}\` with a modern alternative.**\n> See the full migration guide below.\n\n<details><summary>Migration guide from e18e</summary>\n\n${migrateBody}\n---\n*Source: [e18e module replacements](https://e18e.dev/docs/replacements/${docPath})*\n\n</details>`,
        ],
      };
    }),
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
console.log(`Generated recommendations.json with ${recommendations.packageRules.length} rules for ${moduleNames.length} packages`);
console.log(`Generated replacements.json with ${replacements.packageRules.length} replacements`);
