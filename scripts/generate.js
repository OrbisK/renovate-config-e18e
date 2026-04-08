import { writeFileSync } from "node:fs";
import { preferredReplacements } from "module-replacements";

const moduleNames = preferredReplacements.moduleReplacements
  .map((r) => r.moduleName)
  .sort();

const config = {
  $schema: "https://docs.renovatebot.com/renovate-schema.json",
  packageRules: [
    {
      description: "Mark e18e replaceable packages as abandoned",
      matchDatasources: ["npm"],
      matchPackageNames: moduleNames,
      abandonmentThreshold: "0 days",
    },
  ],
};

writeFileSync(
  new URL("../default.json", import.meta.url),
  JSON.stringify(config, null, 2) + "\n",
);
console.log(`Generated default.json with ${moduleNames.length} packages`);
