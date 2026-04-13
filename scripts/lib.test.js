import { describe, expect, it, vi } from "vitest";
import { readdirSync, readFileSync } from "node:fs";

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, readdirSync: vi.fn(actual.readdirSync), readFileSync: vi.fn(actual.readFileSync) };
});

import {
  adjustHeadingLevels,
  buildAbandonmentConfig,
  buildDefaultConfig,
  buildRecommendationsConfig,
  buildReplacementNameMap,
  buildReplacementsConfig,
  groupModulesByUrlId,
  stripFrontmatter,
  fetchLatestVersion,
  fetchAllVersions,
  loadDocContent,
} from "./lib.js";

describe("stripFrontmatter", () => {
  it("removes yaml frontmatter", () => {
    expect(stripFrontmatter("---\nfoo: bar\n---\nHello world"))
      .toMatchInlineSnapshot(`"Hello world"`);
  });

  it("returns content unchanged when no frontmatter", () => {
    expect(stripFrontmatter("No frontmatter here"))
      .toMatchInlineSnapshot(`"No frontmatter here"`);
  });

  it("does not strip when frontmatter has no content between delimiters", () => {
    expect(stripFrontmatter("---\n---\nContent after"))
      .toMatchInlineSnapshot(`
        "---
        ---
        Content after"
      `);
  });

  it("handles multi-line frontmatter", () => {
    expect(
      stripFrontmatter("---\ntitle: Test\ndescription: A test\ntags:\n  - a\n  - b\n---\n# Heading"),
    ).toMatchInlineSnapshot(`"# Heading"`);
  });
});

describe("adjustHeadingLevels", () => {
  it("increments heading levels by one", () => {
    expect(adjustHeadingLevels("# Title\n## Sub\n### Deep"))
      .toMatchInlineSnapshot(`
        "## Title
        ### Sub
        #### Deep"
      `);
  });

  it("leaves non-heading content unchanged", () => {
    expect(adjustHeadingLevels("No headings here"))
      .toMatchInlineSnapshot(`"No headings here"`);
  });

  it("increments h5 to h6", () => {
    expect(adjustHeadingLevels("##### Level 5\nText"))
      .toMatchInlineSnapshot(`
        "###### Level 5
        Text"
      `);
  });

  it("does not touch h6 headings (only matches h1-h5)", () => {
    expect(adjustHeadingLevels("###### Already h6"))
      .toMatchInlineSnapshot(`"###### Already h6"`);
  });
});

describe("groupModulesByUrlId", () => {
  const mappings = {
    chalk: {
      moduleName: "chalk",
      replacements: ["picocolors"],
      url: { type: "e18e", id: "chalk" },
    },
    colors: {
      moduleName: "colors",
      replacements: ["picocolors"],
      url: { type: "e18e", id: "chalk" },
    },
    moment: {
      moduleName: "moment",
      replacements: ["temporal"],
      url: { type: "e18e", id: "moment" },
    },
    "no-url": {
      moduleName: "no-url",
      replacements: ["x"],
    },
  };

  it("groups modules by urlId and sorts them", () => {
    const { modulesByUrlId, sortedUrlIds } = groupModulesByUrlId(mappings);
    expect(sortedUrlIds).toMatchInlineSnapshot(`
      [
        "chalk",
        "moment",
      ]
    `);
    expect([...modulesByUrlId.get("chalk")])
      .toMatchInlineSnapshot(`
        [
          "chalk",
          "colors",
        ]
      `);
  });

  it("skips entries without url", () => {
    const { modulesByUrlId } = groupModulesByUrlId(mappings);
    expect(modulesByUrlId.has("no-url")).toBe(false);
  });

  it("populates urlById", () => {
    const { urlById } = groupModulesByUrlId(mappings);
    expect(urlById.get("chalk")).toMatchInlineSnapshot(`
      {
        "id": "chalk",
        "type": "e18e",
      }
    `);
  });
});

describe("buildReplacementNameMap", () => {
  it("maps urlId to documented replacement module name", () => {
    const mappings = {
      bluebird: {
        moduleName: "bluebird",
        replacements: ["native-promise", "nativebird-rep"],
        url: { type: "e18e", id: "bluebird-q" },
      },
      q: {
        moduleName: "q",
        replacements: ["native-promise"],
        url: { type: "e18e", id: "bluebird-q" },
      },
    };
    const replacementDefs = {
      "native-promise": { type: "native" },
      "nativebird-rep": { type: "documented", replacementModule: "nativebird" },
    };
    const result = buildReplacementNameMap(mappings, replacementDefs);
    expect([...result.entries()]).toMatchInlineSnapshot(`
      [
        [
          "bluebird-q",
          "nativebird",
        ],
      ]
    `);
  });

  it("skips urlIds with no documented replacement", () => {
    const mappings = {
      pkg: {
        moduleName: "pkg",
        replacements: ["native-only"],
        url: { type: "e18e", id: "pkg" },
      },
    };
    const replacementDefs = {
      "native-only": { type: "native" },
    };
    const result = buildReplacementNameMap(mappings, replacementDefs);
    expect(result.size).toBe(0);
  });
});

describe("buildAbandonmentConfig", () => {
  it("generates correct config shape", () => {
    const config = buildAbandonmentConfig(["chalk", "lodash", "moment"]);
    expect(config).toMatchInlineSnapshot(`
      {
        "$schema": "https://docs.renovatebot.com/renovate-schema.json",
        "description": [
          "Mark e18e replaceable packages as abandoned",
        ],
        "packageRules": [
          {
            "abandonmentThreshold": "1 second",
            "addLabels": [
              "e18e",
            ],
            "description": "Mark e18e replaceable packages as abandoned",
            "matchDatasources": [
              "npm",
            ],
            "matchPackageNames": [
              "chalk",
              "lodash",
              "moment",
            ],
          },
        ],
      }
    `);
  });
});

describe("buildDefaultConfig", () => {
  it("interpolates version into extends", () => {
    const config = buildDefaultConfig("1.2.3");
    expect(config).toMatchInlineSnapshot(`
      {
        "$schema": "https://docs.renovatebot.com/renovate-schema.json",
        "description": [
          "e18e presets for Renovate",
        ],
        "extends": [
          "github>OrbisK/renovate-config-e18e:recommendations#1.2.3",
          "github>OrbisK/renovate-config-e18e:replacements#1.2.3",
        ],
      }
    `);
  });
});

describe("buildRecommendationsConfig", () => {
  it("generates package rules with badge and warning", () => {
    const modulesByUrlId = new Map([["chalk", ["chalk", "colors"]]]);
    const urlById = new Map([["chalk", { type: "e18e", id: "chalk" }]]);
    const config = buildRecommendationsConfig(
      ["chalk"],
      modulesByUrlId,
      urlById,
    );
    expect(config.packageRules).toHaveLength(1);
    const rule = config.packageRules[0];
    expect(rule.matchPackageNames).toMatchInlineSnapshot(`
      [
        "chalk",
        "colors",
      ]
    `);
    expect(rule.matchUpdateTypes).toMatchInlineSnapshot(`
      [
        "!replacement",
      ]
    `);
    expect(rule.prBodyDefinitions["Community Notes"]).toContain(
      "img.shields.io/badge/e18e",
    );
    expect(rule.prBodyNotes[0]).toContain("{{#unless");
    expect(rule.prBodyNotes[0]).toContain("{{{depName}}}");
  });
});

describe("buildReplacementsConfig", () => {
  const modulesByUrlId = new Map([
    ["chalk", ["chalk", "colors"]],
    ["no-version", ["old-pkg"]],
  ]);
  const urlById = new Map([
    ["chalk", { type: "e18e", id: "chalk" }],
    ["no-version", { type: "e18e", id: "no-version" }],
  ]);
  const urlIdToReplacementName = new Map([
    ["chalk", "picocolors"],
    ["no-version", "missing-pkg"],
  ]);
  const latestVersions = new Map([["picocolors", "1.0.0"]]);
  const docContent = new Map([
    ["chalk", "# Chalk replacement\n## Use picocolors\nDone."],
  ]);

  it("generates replacement rules with migration guide", () => {
    const config = buildReplacementsConfig(
      ["chalk", "no-version"],
      urlIdToReplacementName,
      latestVersions,
      modulesByUrlId,
      urlById,
      docContent,
    );
    expect(config.packageRules).toHaveLength(1);
    const rule = config.packageRules[0];
    expect(rule.replacementName).toBe("picocolors");
    expect(rule.replacementVersion).toBe("1.0.0");
    expect(rule.draftPR).toBe(true);
    expect(rule.matchPackageNames).toMatchInlineSnapshot(`
      [
        "chalk",
        "colors",
      ]
    `);
  });

  it("adjusts heading levels in migration body", () => {
    const config = buildReplacementsConfig(
      ["chalk"],
      urlIdToReplacementName,
      latestVersions,
      modulesByUrlId,
      urlById,
      docContent,
    );
    const body = config.packageRules[0].prBodyNotes[0];
    expect(body).toContain("## Chalk replacement");
    expect(body).toContain("### Use picocolors");
  });

  it("filters out urlIds without a latest version", () => {
    const config = buildReplacementsConfig(
      ["chalk", "no-version"],
      urlIdToReplacementName,
      latestVersions,
      modulesByUrlId,
      urlById,
      docContent,
    );
    expect(config.packageRules).toHaveLength(1);
    expect(config.packageRules[0].replacementName).toBe("picocolors");
  });

  it("falls back to empty string when doc content is missing", () => {
    const config = buildReplacementsConfig(
      ["chalk"],
      urlIdToReplacementName,
      latestVersions,
      modulesByUrlId,
      urlById,
      new Map(),
    );
    const body = config.packageRules[0].prBodyNotes[0];
    expect(body).toContain("<details>");
    expect(body).toContain("Migration guide from e18e");
  });
});

describe("loadDocContent", () => {
  it("loads and strips frontmatter from doc files", () => {
    vi.mocked(readdirSync).mockReturnValue(["README.md", "chalk.md", "glob.md"]);
    vi.mocked(readFileSync).mockImplementation((path) => {
      const p = String(path);
      if (p.includes("chalk"))
        return "---\ndesc: test\n---\n# Chalk guide";
      if (p.includes("glob")) return "No frontmatter content";
      return "";
    });

    const result = loadDocContent(new URL("file:///fake/docs"));
    expect(result.has("README")).toBe(false);
    expect(result.get("chalk")).toMatchInlineSnapshot(`"# Chalk guide"`);
    expect(result.get("glob")).toMatchInlineSnapshot(
      `"No frontmatter content"`,
    );

    vi.mocked(readdirSync).mockRestore();
    vi.mocked(readFileSync).mockRestore();
  });
});

describe("fetchLatestVersion", () => {
  it("returns version on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ version: "2.0.0" }),
      }),
    );
    const result = await fetchLatestVersion("test-pkg");
    expect(result).toBe("2.0.0");
    vi.unstubAllGlobals();
  });

  it("returns null on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 }),
    );
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await fetchLatestVersion("missing-pkg");
    expect(result).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("missing-pkg"),
    );
    warn.mockRestore();
    vi.unstubAllGlobals();
  });
});

describe("fetchAllVersions", () => {
  it("collects resolved versions into a Map", async () => {
    const mockFetch = vi.fn().mockImplementation((name) => {
      if (name === "a") return Promise.resolve("1.0.0");
      if (name === "b") return Promise.resolve("2.0.0");
      return Promise.resolve(null);
    });
    const result = await fetchAllVersions(["a", "b", "c"], mockFetch);
    expect([...result.entries()].sort()).toMatchInlineSnapshot(`
      [
        [
          "a",
          "1.0.0",
        ],
        [
          "b",
          "2.0.0",
        ],
      ]
    `);
  });

  it("skips packages that return null", async () => {
    const mockFetch = vi.fn().mockResolvedValue(null);
    const result = await fetchAllVersions(["a"], mockFetch);
    expect(result.size).toBe(0);
  });
});
