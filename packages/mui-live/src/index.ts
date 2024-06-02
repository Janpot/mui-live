import invariant from "invariant";
import * as path from "path";
import * as fs from "fs/promises";
const { createHash } = await import("crypto");
import type { Plugin, ResolvedConfig } from "vite";
import { Minimatch } from "minimatch";
import { ParseResult, parse } from "@babel/parser";
import generatorMod from "@babel/generator";
import { types as t, traverse, template } from "@babel/core";
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

const moduleMap = new Map<
  string,
  {
    id: string;
    ast: t.File;
    contentHash: string;
  }
>();

const nodeMap = new Map<
  string,
  {
    module: string;
  }
>();

function buildAstLiteral(value: unknown): t.Expression {
  if (typeof value === "string") {
    return t.stringLiteral(value);
  }

  if (typeof value === "number") {
    return t.numericLiteral(value);
  }

  if (typeof value === "boolean") {
    return t.booleanLiteral(value);
  }

  if (Array.isArray(value)) {
    return t.arrayExpression(value.map(buildAstLiteral));
  }

  if (value === null) {
    return t.nullLiteral();
  }

  if (typeof value === "object") {
    return t.objectExpression(
      Object.entries(value).map(([key, value]) =>
        t.objectProperty(t.stringLiteral(key), buildAstLiteral(value))
      )
    );
  }

  throw new Error("Unsupported value");
}

export interface LiveOptions {
  include?: string[];
}

export default function live({ include = ["src"] }: LiveOptions = {}): Plugin {
  let config: ResolvedConfig | undefined;

  let nextJsxNodeId = 1;

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
                if (data.patches) {
                  patchJsxElementAttributes(elmPath, data.patches);
                } else {
                  const attrs = elmPath.get("openingElement").get("attributes");
                  const props = { ...data.props };

                  // Update existing
                  attrs.forEach((attrPath) => {
                    if (!attrPath.isJSXAttribute()) {
                      return;
                    }
                    const attrName = attrPath.get("name").toString();
                    if (Object.hasOwn(props, attrName)) {
                      const value = props[attrName];
                      attrPath
                        .get("value")
                        .replaceWith(
                          t.jsxExpressionContainer(buildAstLiteral(value))
                        );
                      delete props[attrName];
                    }
                  });

                  // New attributes
                  const newAttrs = Object.entries(props).map(
                    ([name, value]) => {
                      return t.jsxAttribute(
                        t.jsxIdentifier(name),
                        t.jsxExpressionContainer(buildAstLiteral(value))
                      );
                    }
                  );

                  elmPath
                    .get("openingElement")
                    .pushContainer("attributes", newAttrs);
                }
              }
            },
          });

          const generated = generator(newAst, {
            retainLines: true,
          });

          let newCode = generated.code;

          const prettierConfig = await prettier.resolveConfig(module.id);
          newCode = await prettier.format(newCode, {
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

      const contentHash = createHash("md5").update(source).digest("hex");

      const astIn: ParseResult<t.File> = parse(source, {
        sourceType: "module",

        plugins: ["jsx", "typescript"],
      });

      moduleMap.set(id, {
        id,
        ast: astIn,
        contentHash,
      });

      // Analysis
      traverse(astIn, {
        JSXElement(elmPath) {
          const nodeId = "node-" + nextJsxNodeId++;
          elmPath.node.extra ??= {};
          elmPath.node.extra.nodeId = nodeId;
        },
      });

      const astOut = t.cloneNode(astIn);

      let runtimeIdentifier: t.Identifier | undefined;
      let moduleIdIdentifier: t.Identifier | undefined;

      const runtimeImport = template(
        `import * as RUNTIME_NAME from "@mui/live/runtime";
        
        const MODULE_ID_NAME = MODULE_ID
        `,
        { sourceType: "module" }
      );

      // Transformation
      traverse(astOut, {
        Program(path) {
          runtimeIdentifier =
            path.scope.generateUidIdentifier("muiLiveRuntime");
          moduleIdIdentifier =
            path.scope.generateUidIdentifier("muiLiveModuleId");

          const lastImport = path
            .get("body")
            .filter((p) => p.isImportDeclaration())
            .pop();

          if (lastImport) {
            lastImport.insertAfter(
              runtimeImport({
                RUNTIME_NAME: runtimeIdentifier,
                MODULE_ID_NAME: moduleIdIdentifier,
                MODULE_ID: t.stringLiteral(id),
              })
            );
          }
        },
        JSXElement(elmPath) {
          const nodeId = elmPath.node.extra?.nodeId;
          invariant(typeof nodeId === "string", "nodeId is not defined");

          nodeMap.set(nodeId, { module: id });

          const attrsPath = elmPath.get("openingElement").get("attributes");

          const attributesInfo = [];

          for (const attrPath of attrsPath) {
            if (attrPath.isJSXAttribute()) {
              const name = attrPath.get("name").toString();

              const valuePath = attrPath.get("value");
              if (valuePath.isStringLiteral()) {
                attributesInfo.push({
                  kind: "static",
                  name,
                  value: valuePath.node,
                });
              } else if (valuePath.isJSXExpressionContainer()) {
                attributesInfo.push({
                  kind: "maybe-editable",
                  name,
                  value: valuePath.get("expression").node,
                });
              } else {
                attributesInfo.push({
                  kind: "non-editable",
                  name,
                  value: t.nullLiteral(),
                });
              }
            } else {
              attributesInfo.push({
                kind: "spread",
                value: attrPath.node,
              });
            }
          }

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

      const { code } = generator(astOut, {
        retainLines: true,
      });

      return {
        code,
        map: null,
      };
    },
  };
}
