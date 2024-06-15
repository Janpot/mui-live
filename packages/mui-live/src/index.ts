import invariant from "invariant";
import * as path from "path";
import * as fs from "fs/promises";
import type { Plugin, ResolvedConfig } from "vite";
import { Minimatch } from "minimatch";
import { parse } from "@babel/parser";
import generatorMod from "@babel/generator";
import { types as t, template, traverse } from "@babel/core";
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

function getTagName(
  nameNode: t.JSXIdentifier | t.JSXMemberExpression | t.JSXNamespacedName
): string {
  if (t.isJSXIdentifier(nameNode)) {
    return nameNode.name;
  } else if (t.isJSXMemberExpression(nameNode)) {
    return `${getTagName(nameNode.object)}.${nameNode.property}`;
  } else if (t.isJSXNamespacedName(nameNode)) {
    return `${nameNode.namespace}:${nameNode.name}`;
  } else {
    throw new Error("Unreachable code");
  }
}

export interface LiveOptions {
  include?: string[];
}

export default function live({ include = ["src"] }: LiveOptions = {}): Plugin {
  let config: ResolvedConfig | undefined;

  const moduleMap = new Map<
    string,
    {
      id: string;
      ast: t.File;
      code: string;
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
        const moduleId = data.moduleId;
        const nodeId = data.nodeId;
        const module = moduleMap.get(moduleId);

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

      const astIn = parse(source, {
        sourceType: "module",

        plugins: ["jsx", "typescript"],
      });

      moduleMap.set(id, {
        id,
        ast: astIn,
        code: source,
      });

      let nextJsxNodeId = 1;

      // Analysis
      const nodesInfo = new Map<string, { tagName: string }>();

      traverse(astIn, {
        JSXElement(elmPath) {
          const nodeId = "node-" + nextJsxNodeId++;
          elmPath.node.extra ??= {};
          elmPath.node.extra.nodeId = nodeId;

          nodesInfo.set(nodeId, {
            tagName: getTagName(elmPath.get("openingElement").get("name").node),
          });
        },
      });

      const astOut = t.cloneNode(astIn);

      const runtimeImport = template(
        `import * as RUNTIME_LOCAL_NAME from "mui-live/runtime";`,
        {
          sourceType: "module",
        }
      );

      const moduleIdVar = template(`var MODULE_ID_NAME = MODULE_ID`, {
        sourceType: "module",
      });

      const registerModuleCall = template(
        `RUNTIME_LOCAL_NAME.registerModule({
          id: MODULE_ID,
          nodes: new Map(NODES)
        })`,
        {
          sourceType: "module",
        }
      );

      let runtimeLocalNameIdentifier: t.Identifier | undefined;
      let moduleIdIdentifier: t.Identifier | undefined;

      // Transformation
      traverse(astOut, {
        Program(path) {
          runtimeLocalNameIdentifier =
            path.scope.generateUidIdentifier("muiLiveRuntime");
          moduleIdIdentifier =
            path.scope.generateUidIdentifier("muiLiveModuleId");

          path.unshiftContainer(
            "body",
            runtimeImport({
              RUNTIME_LOCAL_NAME: runtimeLocalNameIdentifier,
            })
          );

          path.pushContainer(
            "body",
            moduleIdVar({
              MODULE_ID_NAME: moduleIdIdentifier,
              MODULE_ID: t.stringLiteral(id),
            })
          );

          path.pushContainer(
            "body",
            registerModuleCall({
              RUNTIME_LOCAL_NAME: runtimeLocalNameIdentifier,
              MODULE_ID: moduleIdIdentifier,
              NODES: t.newExpression(t.identifier("Map"), [
                t.arrayExpression(
                  Array.from(nodesInfo.entries(), ([nodeId, nodeInfo]) => {
                    return t.arrayExpression([
                      t.stringLiteral(nodeId),
                      t.objectExpression([
                        t.objectProperty(
                          t.identifier("tagName"),
                          t.stringLiteral(nodeInfo.tagName)
                        ),
                      ]),
                    ]);
                  })
                ),
              ]),
            })
          );
        },
        JSXElement(elmPath) {
          invariant(moduleIdIdentifier, "moduleIdIdentifier is not defined");

          const nodeId = elmPath.node.extra?.nodeId;
          invariant(typeof nodeId === "string", "nodeId is not defined");

          elmPath
            .get("openingElement")
            .pushContainer("attributes", [
              t.jsxAttribute(
                t.jsxIdentifier("data-mui-live-node-id"),
                t.stringLiteral(nodeId)
              ),
              t.jsxAttribute(
                t.jsxIdentifier("data-mui-live-module-id"),
                t.jsxExpressionContainer(moduleIdIdentifier)
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
