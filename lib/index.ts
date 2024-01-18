import invariant from "invariant";
import * as path from "path";
import * as fs from "fs/promises";
const { createHash } = await import("crypto");
import { Plugin, ResolvedConfig } from "vite";
import { Minimatch } from "minimatch";
import { parse } from "@babel/parser";
import generator from "@babel/generator";
import { types as t, traverse, template } from "@babel/core";

function hasFileExtension(pathname: string): boolean {
  const lastDotIndex = pathname.lastIndexOf(".");
  return lastDotIndex >= -1 && lastDotIndex > pathname.lastIndexOf("/");
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

    config() {
      return {
        resolve: {
          alias: {
            "@mui/live/runtime": path.resolve(__dirname, "../runtime"),
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
      console.log(contentHash);

      const astIn = parse(source, {
        sourceType: "module",
        plugins: ["jsx", "typescript"],
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

      const attribute = template.expression(
        `(() => { RUNTIME_NAME.onNodeRender(MODULE_ID, NODE_ID, ATTRIBUTE_INFO); return {} })()`,
        { sourceType: "module" }
      );

      const attributeInfoEntry = template.expression(
        `{ kind: KIND, name: NAME, value: VALUE }`,
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
          console.log(elmPath.node.extra);
          const nodeId = elmPath.node.extra?.nodeId;
          invariant(typeof nodeId === "string", "nodeId is not defined");

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

          elmPath.get("openingElement").pushContainer("attributes", [
            t.jsxAttribute(
              t.jsxIdentifier("data-mui-live-node-id"),
              t.stringLiteral(nodeId)
            ),
            t.jsxSpreadAttribute(
              attribute({
                RUNTIME_NAME: runtimeIdentifier,
                MODULE_ID: moduleIdIdentifier,
                NODE_ID: t.stringLiteral(nodeId),
                ATTRIBUTE_INFO: t.arrayExpression(
                  attributesInfo.map((attr) =>
                    attributeInfoEntry({
                      NAME: attr.name
                        ? t.stringLiteral(attr.name)
                        : t.nullLiteral(),
                      KIND: t.stringLiteral(attr.kind),
                      VALUE: attr.value,
                    })
                  )
                ),
              })
            ),
          ]);
        },
      });

      const { code } = generator(astOut);

      return {
        code,
        map: null,
      };
    },
  };
}
