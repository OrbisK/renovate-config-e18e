# renovate-config-e18e

> [!WARNING]
> This preset is **experimental and work in progress**. It exists to test the current limits of Renovate presets with an [e18e](https://e18e.dev/) focus.

A [Renovate](https://docs.renovatebot.com/) shared config preset for [e18e](https://e18e.dev/) replaceable packages. It marks them as abandoned, adds replacement recommendations to PR bodies, and can automatically replace packages with modern alternatives.

The package list is auto-generated from the [`module-replacements`](https://www.npmjs.com/package/module-replacements) package.

## Usage

Add the preset to your Renovate config (`renovate.json`):

```diff
 {
   "extends": [
     "config:best-practices",
+    "github>OrbisK/renovate-config-e18e"
   ]
 }
```

It is recommended to pin to a specific version tag to avoid unexpected changes when the package list is updated. You can find available versions on the [releases page](https://github.com/OrbisK/renovate-config-e18e/releases).

### Individual presets

The default preset extends all three presets below. You can also use them individually:

| Preset | Description |
|--------|-------------|
| `github>OrbisK/renovate-config-e18e:abandonment` | Marks e18e replaceable packages as abandoned using [`abandonmentThreshold`](https://docs.renovatebot.com/configuration-options/#abandonmentthreshold) and adds an `e18e` label |
| `github>OrbisK/renovate-config-e18e:recommendations` | Adds a warning callout to PR bodies with a link to the [e18e replacement guide](https://e18e.dev/docs/replacements/) |
| `github>OrbisK/renovate-config-e18e:replacements` | Replaces packages with recommended alternatives using [`replacementName`](https://docs.renovatebot.com/configuration-options/#packagerulesreplacementname) and embeds the migration guide in the PR body |

## How it works

The presets are generated from the [`module-replacements`](https://www.npmjs.com/package/module-replacements) package, which provides a curated list of npm packages that have preferred modern alternatives (e.g. `axios` -> native `fetch`, `chalk` -> built-in Node.js styling).

- **Abandonment**: Renovate's [`abandonmentThreshold`](https://docs.renovatebot.com/configuration-options/#abandonmentthreshold) marks these packages as abandoned in Renovate's UI.
- **Recommendations**: Adds a callout to PR bodies linking to the e18e replacement guide for the specific package.
- **Replacements**: Uses Renovate's [`replacementName`](https://docs.renovatebot.com/configuration-options/#packagerulesreplacementname) to open PRs that swap packages (e.g. `glob` -> `tinyglobby`) with an embedded migration guide.

## Regenerating the config

To update the generated presets after a `module-replacements` update:

```sh
pnpm generate
```

## Releasing

Releases are handled with [bumpp](https://github.com/antfu/bumpp) and GitHub Actions:

```sh
pnpm release
```

This will prompt for a version, update `package.json`, create a commit and tag, and push to the remote. A GitHub Actions workflow then automatically creates a GitHub Release with auto-generated release notes.