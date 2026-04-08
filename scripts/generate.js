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
      abandonmentThreshold: "0 days",
    },
  ],
};

const defaultConfig = {
  $schema: "https://docs.renovatebot.com/renovate-schema.json",
  description: ["e18e presets for Renovate"],
  extends: [
    `github>OrbisK/renovate-config-e18e:abandonment#${version}`,
  ],
};

writeFileSync(
  new URL("../abandonment.json", import.meta.url),
  JSON.stringify(abandonment, null, 2) + "\n",
);
writeFileSync(
  new URL("../default.json", import.meta.url),
  JSON.stringify(defaultConfig, null, 2) + "\n",
);
console.log(`Generated abandonment.json with ${moduleNames.length} packages`);
