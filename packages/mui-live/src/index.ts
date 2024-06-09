import invariant from "invariant";
import * as path from "path";
import * as fs from "fs/promises";
import type { Plugin, ResolvedConfig } from "vite";
import { Minimatch } from "minimatch";
import { parse } from "@babel/parser";
import generatorMod from "@babel/generator";
import { types as t, traverse } from "@babel/core";
import * as prettier from "prettier";
import { patchJsxElementAttributes } from "./patchJsxPath.js";

const generator = generatorMod.default;

function hasFileExtension(pathname: string): boolean {
  const filename = pathname.slice(pathname.lastIndexOf("/") + 1);
  return filename.lastIndexOf(".") >= 1;
}
function createMatcher(pattern: string) {
  const isDirectoryMatch =
    !hasFileExtension(pattern) &&
    !pattern.endsWith("*") &&
    !pattern.endsWith("?");

  if (isDirectoryMatch) {
    pattern += (pattern.endsWith("/") ? "" : "/") + "**/*";
  }

  return new Minimatch(pattern, {
    dot: true,
    noext: true,
    nobrace: true,
    nocase: true,
  });
}

export interface LiveOptions {
  include?: string[];
}

export default function live({ include = ["src"] }: LiveOptions = {}): Plugin {
  let config: ResolvedConfig | undefined;

  let nextJsxNodeId = 1;

  const moduleMap = new Map<
    string,
    {
      id: string;
      ast: t.File;
      code: string;
    }
  >();

  const nodeMap = new Map<
    string,
    {
      module: string;
    }
  >();

  const extensions = [
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".mjs",
    ".cjs",
    ".mts",
    ".cts",
  ];

  return {
    name: "mui-live",

    configureServer(server) {
      server.hot.on("mui-live:save-properties", async (data, client) => {
        const nodeId = data.node;
        const node = nodeMap.get(nodeId);
        const module = node ? moduleMap.get(node?.module) : null;

        if (module) {
          const newAst = t.cloneNode(module.ast);
          traverse(newAst, {
            JSXElement(elmPath) {
              if (elmPath.node.extra?.nodeId === nodeId) {
                patchJsxElementAttributes(elmPath, data.patches);
              }
            },
          });

          const generated = generator(newAst, {
            retainLines: true,
          });

          const prettierConfig = await prettier.resolveConfig(module.id);

          const newCode = await prettier.format(generated.code, {
            parser: "babel",
            filepath: module.id,
            ...prettierConfig,
          });

          module.ast = newAst;
          module.code = newCode;

          await fs.writeFile(module.id, newCode);
        }

        // reply only to the client (if needed)
        client.send("my:ack", { msg: "Hi! I got your message!" });
      });
    },

    config() {
      return {
        resolve: {
          alias: {
            // "@mui/live/runtime": path.resolve(__dirname, "../runtime"),
          },
        },
      };
    },

    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },

    async load(id) {
      if (!extensions.some((ext) => id.endsWith(ext))) {
        return null;
      }

      invariant(config, "config is not resolved");
      const root = config.root;

      const includeMatchers = include.map((includePattern) =>
        createMatcher(path.resolve(root, includePattern))
      );

      const isIncluded = includeMatchers.some((matcher) => {
        return matcher.match(id);
      });

      if (!isIncluded) {
        return null;
      }

      const source = await fs.readFile(id, "utf-8");

      const existingModule = moduleMap.get(id);

      let astIn: t.File;

      if (existingModule && existingModule.code === source) {
        astIn = existingModule.ast;
      } else {
        astIn = parse(source, {
          sourceType: "module",

          plugins: ["jsx", "typescript"],
        });

        moduleMap.set(id, {
          id,
          ast: astIn,
          code: source,
        });

        // Analysis
        traverse(astIn, {
          JSXElement(elmPath) {
            const nodeId = "node-" + nextJsxNodeId++;
            elmPath.node.extra ??= {};
            elmPath.node.extra.nodeId = nodeId;
          },
        });
      }

      const astOut = t.cloneNode(astIn);

      // Transformation
      traverse(astOut, {
        JSXElement(elmPath) {
          const nodeId = elmPath.node.extra?.nodeId;
          invariant(typeof nodeId === "string", "nodeId is not defined");

          nodeMap.set(nodeId, { module: id });

          elmPath
            .get("openingElement")
            .pushContainer("attributes", [
              t.jsxAttribute(
                t.jsxIdentifier("data-mui-live-node-id"),
                t.stringLiteral(nodeId)
              ),
            ]);
        },
      });

      const { code: codeOut } = generator(astOut, {
        retainLines: true,
      });

      return {
        code: codeOut,
        map: null,
      };
    },
  };
}
