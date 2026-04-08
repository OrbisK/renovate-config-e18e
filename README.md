# renovate-config-e18e

A [Renovate](https://docs.renovatebot.com/) shared config preset that marks [e18e](https://e18e.dev/) replaceable packages as abandoned. This surfaces ecosystem-recommended replacements directly in your Renovate dependency dashboard and PRs.

The package list is auto-generated from the [`module-replacements`](https://www.npmjs.com/package/module-replacements) package.

## Usage

Add the preset to your Renovate config (`renovate.json`):

```diff
 {
   "extends": [
     "config:best-practices",
+    "github>OrbisK/renovate-config-e18e#0.0.2"
   ]
 }
```

It is recommended to pin to a specific version tag to avoid unexpected changes when the package list is updated. You can find available versions on the [releases page](https://github.com/OrbisK/renovate-config-e18e/releases).

This will flag all e18e replaceable packages with an `abandonmentThreshold` of `0 days`, marking them as abandoned in Renovate's UI.

#0.0.2 How it works

The `default.json` preset is generated from the [`module-replacements`](https://www.npmjs.com/package/module-replacements) package, which provides a curated list of npm packages that have preferred modern alternatives (e.g. `axios` -> native `fetch`, `chalk` -> built-in Node.js styling).

Renovate's [`abandonmentThreshold`](https://docs.renovatebot.com/configuration-options/#abandonmentthreshold) option marks these packages as abandoned, which helps teams identify dependencies that should be replaced with modern alternatives.

## Regenerating the config

To update `default.json` after a `module-replacements` update:

```sh
pnpm generate
```

## Releasing

Releases are handled with [bumpp](https://github.com/antfu/bumpp) and GitHub Actions:

```sh
pnpm release
```

This will prompt for a version, update `package.json`, create a commit and tag, and push to the remote. A GitHub Actions workflow then automatically creates a GitHub Release with auto-generated release notes.