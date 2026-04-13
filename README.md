# renovate-config-e18e

> [!WARNING]
> This preset is **experimental and work in progress**. It exists to test the current limits of Renovate presets with
> an [e18e](https://e18e.dev/) focus.

A [Renovate](https://docs.renovatebot.com/) shared config preset for [e18e](https://e18e.dev/) replaceable packages. It adds replacement recommendations to PR bodies and can automatically replace packages with modern alternatives.

The package list is auto-generated from the [`module-replacements`](https://www.npmjs.com/package/module-replacements)
package.

## Usage

Add the preset to your Renovate config (`renovate.json`):

```diff
 {
   "extends": [
+    "github>OrbisK/renovate-config-e18e"
   ]
 }
```

The default preset already includes [`config:best-practices`](https://docs.renovatebot.com/presets-config/#configbest-practices) and [Merge Confidence](https://docs.renovatebot.com/merge-confidence/) columns — no need to add them separately.

It is recommended to pin to a specific version tag to avoid unexpected changes when the package list is updated. You can
find available versions on the [releases page](https://github.com/OrbisK/renovate-config-e18e/releases).

```diff
 {
   "extends": [
-    "github>OrbisK/renovate-config-e18e"
+    "github>OrbisK/renovate-config-e18e#0.0.20"
   ]
 }
```

## Individual presets

The default preset extends `best-practices`, which combines [`config:best-practices`](https://docs.renovatebot.com/presets-config/#configbest-practices), `recommendations`, `replacements`, and `mergeConfidence:all-badges`. You can also use the `best-practices` sub-preset directly or pick individual presets:

| Preset | Description |
|---|---|
| `github>OrbisK/renovate-config-e18e:best-practices` | Combines [`config:best-practices`](https://docs.renovatebot.com/presets-config/#configbest-practices), `recommendations`, `replacements`, and `mergeConfidence:all-badges` |
| `github>OrbisK/renovate-config-e18e:abandonment` | Marks e18e replaceable packages as abandoned using [`abandonmentThreshold`](https://docs.renovatebot.com/configuration-options/#abandonmentthreshold) and adds an `e18e` label |
| `github>OrbisK/renovate-config-e18e:recommendations` | Adds replacement recommendations to PR bodies (see [below](#recommendations-preset)) |
| `github>OrbisK/renovate-config-e18e:replacements` | Replaces packages with recommended alternatives using [`replacementName`](https://docs.renovatebot.com/configuration-options/#packagerulesreplacementname), opens a [**draft PR**](https://docs.renovatebot.com/configuration-options/#draftpr) with an embedded migration guide |
| `github>OrbisK/renovate-config-e18e:columns:community-notes` | Adds a "Community Notes" column to the default [`prBodyColumns`](https://docs.renovatebot.com/configuration-options/#prbodycolumns) for patch, minor and major updates |
| `github>OrbisK/renovate-config-e18e:mergeConfidence:all-badges-append(column)` | All Merge Confidence columns with e18e Community Notes plus a custom appended column |
| `github>OrbisK/renovate-config-e18e:mergeConfidence:age-confidence` | Like `columns:community-notes` with columns matching [`mergeConfidence:age-confidence-badges`](https://docs.renovatebot.com/presets-mergeConfidence/#mergeconfidenceage-confidence-badges) |
| `github>OrbisK/renovate-config-e18e:mergeConfidence:all-badges` | Like `columns:community-notes` with columns matching [`mergeConfidence:all-badges`](https://docs.renovatebot.com/presets-mergeConfidence/#mergeconfidenceall-badges) |

### Using individual presets

To use only specific presets, reference them directly instead of the default:

```json
{
  "extends": [
    "github>OrbisK/renovate-config-e18e:abandonment",
    "github>OrbisK/renovate-config-e18e:replacements"
  ]
}
```

### Recommendations preset

The recommendations preset provides two ways to surface e18e replacement info in PRs:

1. **"Community Notes" column** — a shields.io badge in the PR body table linking to the e18e replacement docs. The default preset already includes `mergeConfidence:all-badges` which configures this column automatically. If you use the `recommendations` preset individually, you can enable the column with a `columns` or `mergeConfidence` preset, or add `"Community Notes"` to your own [`prBodyColumns`](https://docs.renovatebot.com/configuration-options/#prbodycolumns) manually.

2. **Warning callout** — a `[!WARNING]` note added to the PR body with a link to the e18e replacement guide. This is the fallback behavior when the "Community Notes" column is not in `prBodyColumns`.

Both are automatically skipped for PRs with `updateType: "replacement"`, since the `replacements` preset already
provides a detailed migration guide.

> [!NOTE]
> Renovate's [`prBodyColumns`](https://docs.renovatebot.com/configuration-options/#prbodycolumns) does **not** merge — it overrides. If you set `prBodyColumns` yourself or use presets that set it (e.g. [Merge Confidence](https://docs.renovatebot.com/merge-confidence/)), you need to include `"Community Notes"` in your column list manually.

### Columns presets

The `mergeConfidence:all-badges-append` preset accepts one argument to append a custom column to the all Merge Confidence columns layout (Package, Change, Age, Adoption, Passing, Confidence, Community Notes). This is useful because Renovate's [`prBodyColumns`](https://docs.renovatebot.com/configuration-options/#prbodycolumns) does not merge — it overrides, so adding a single column normally requires duplicating the entire list.

```json
{
  "extends": [
    "github>OrbisK/renovate-config-e18e:mergeConfidence:all-badges-append(Pending)"
  ]
}
```

## How it works

The presets are generated from the [`module-replacements`](https://www.npmjs.com/package/module-replacements) package,
which provides a curated list of npm packages that have preferred modern alternatives (e.g. `axios` -> native `fetch`,
`chalk` -> built-in Node.js styling).

- **Abandonment**: Renovate's [`abandonmentThreshold`](https://docs.renovatebot.com/configuration-options/#abandonmentthreshold) marks these packages as abandoned in Renovate's UI.
- **Recommendations**: Defines a [`prBodyDefinitions`](https://docs.renovatebot.com/configuration-options/#prbodydefinitions) entry for a "Community Notes" column, and falls back to a [`prBodyNotes`](https://docs.renovatebot.com/configuration-options/#prbodynotes) warning callout when the column is not in [`prBodyColumns`](https://docs.renovatebot.com/configuration-options/#prbodycolumns).
- **Columns**: Provides [`prBodyColumns`](https://docs.renovatebot.com/configuration-options/#prbodycolumns) presets that include the "Community Notes" column. Since `prBodyColumns` does not merge, these presets define the full column list.
- **Replacements**: Uses Renovate's [`replacementName`](https://docs.renovatebot.com/configuration-options/#packagerulesreplacementname) to open [**draft PRs**](https://docs.renovatebot.com/configuration-options/#draftpr) that swap packages (e.g. `glob` -> `tinyglobby`) with an embedded migration guide. PRs are drafts because they require manual changes to imports and usage beyond the dependency swap.

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

This will prompt for a version, update `package.json`, create a commit and tag, and push to the remote. A GitHub Actions
workflow then automatically creates a GitHub Release with auto-generated release notes.

## Roadmap

- [ ] Test grouped PRs
- [ ] Publish replacements docs as separate package (replace ./docs)
- [ ] Check if automerge is disabled for replacements
- [ ] Migrate to e18e org
- [ ] e18e badges (size increase from vX to vY, ...)

## Renovate wishlist

Features we'd like to see in Renovate to improve this preset:

- [ ] Engine match support for dependency replacements, recommend replacements based on the project's Node.js version
- [ ] Allow replacements to remove a dependency without specifying a replacement package (remove when available natively)
- [ ] Mergeable `prBodyColumns` or an option to append a column to the defaults
- [ ] `renovate-config-validator` should support subpresets
