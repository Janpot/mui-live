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

// https://github.com/vitejs/vite/issues/9813
declare global {
  interface Worker {}
  interface WebSocket {}
}

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

type AttributeInfo =
  | {
      kind: "static";
      name: string;
      valueAst: t.Expression;
    }
  | {
      kind: "dynamic";
      name: string;
    }
  | {
      kind: "spread";
    };

interface NodeInfo {
  jsxTagName: string;
  attributesInfo: AttributeInfo[];
}

function getJsxTagName(
  nameNode: t.JSXIdentifier | t.JSXMemberExpression | t.JSXNamespacedName
): string {
  if (t.isJSXIdentifier(nameNode)) {
    return nameNode.name;
  } else if (t.isJSXMemberExpression(nameNode)) {
    return `${getJsxTagName(nameNode.object)}.${nameNode.property.name}`;
  } else if (t.isJSXNamespacedName(nameNode)) {
    return `${nameNode.namespace}:${nameNode.name.name}`;
  } else {
    throw new Error("Unreachable code");
  }
}

function getStaticExpression(
  expression: t.Node | null | undefined
): t.Expression | null {
  if (t.isJSXExpressionContainer(expression)) {
    return getStaticExpression(expression.expression);
  }
  if (t.isStringLiteral(expression)) {
    return expression;
  }
  if (t.isNumericLiteral(expression)) {
    return expression;
  }
  if (t.isBooleanLiteral(expression)) {
    return expression;
  }
  if (t.isNullLiteral(expression)) {
    return expression;
  }
  if (t.isUnaryExpression(expression)) {
    return !!getStaticExpression(expression.argument) &&
      (expression.operator === "+" || expression.operator === "-")
      ? expression
      : null;
  }
  if (t.isObjectExpression(expression)) {
    const allPropsStatic = expression.properties.every((property) => {
      if (t.isObjectProperty(property)) {
        return !!getStaticExpression(property.value);
      }
      return false;
    });
    return allPropsStatic ? expression : null;
  }
  if (t.isArrayExpression(expression)) {
    const allItemsStatic = expression.elements.every(
      (item) => !!getStaticExpression(item)
    );
    return allItemsStatic ? expression : null;
  }
  return null;
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

  const DEVTOOLS_SRC_ID = "/mui-live/reactDevtools";

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

    transformIndexHtml(html) {
      html = html.replace(
        "<head>",
        `<head><script>
          if (window !== window.top) {
            var script = document.createElement('script');
            script.src = ${JSON.stringify(DEVTOOLS_SRC_ID)};
            document.write(script.outerHTML);
          }
        </script>`
      );
      return html;
    },

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

    async resolveId(source, importer, options) {
      if (source === DEVTOOLS_SRC_ID) {
        return this.resolve("mui-live/reactDevtools", importer, options);
      }
      return null;
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
      const nodesInfo = new Map<string, NodeInfo>();

      traverse(astIn, {
        JSXElement(elmPath) {
          const nodeId = "node-" + nextJsxNodeId++;
          elmPath.node.extra ??= {};
          elmPath.node.extra.nodeId = nodeId;

          const attributes = elmPath.get("openingElement").get("attributes");
          const attributesInfo: AttributeInfo[] = attributes.map((attrPath) => {
            if (attrPath.isJSXAttribute()) {
              const nameNode = attrPath.get("name").node;
              const name: string = t.isJSXIdentifier(nameNode)
                ? nameNode.name
                : nameNode.name.name;
              const value = getStaticExpression(attrPath.get("value").node);

              if (value) {
                return { name, kind: "static", valueAst: t.cloneNode(value) };
              } else {
                return { name, kind: "dynamic" };
              }
            } else if (attrPath.isJSXSpreadAttribute()) {
              return { kind: "spread" };
            } else {
              throw new Error("Unreachable code");
            }
          });

          nodesInfo.set(nodeId, {
            attributesInfo,
            jsxTagName: getJsxTagName(
              elmPath.get("openingElement").get("name").node
            ),
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

      const runtimeInitCall = template(`RUNTIME_LOCAL_NAME.init(MODULE_ID);`, {
        sourceType: "module",
      });

      let runtimeLocalNameIdentifier: t.Identifier | undefined;
      let moduleIdIdentifier: t.Identifier | undefined;

      // Transformation
      traverse(astOut, {
        Program(path) {
          runtimeLocalNameIdentifier =
            path.scope.generateUidIdentifier("muiLiveRuntime");
          moduleIdIdentifier =
            path.scope.generateUidIdentifier("muiLiveModuleId");

          path.scope.push({
            id: moduleIdIdentifier,
            init: t.stringLiteral(id),
          });

          path.unshiftContainer(
            "body",
            runtimeImport({
              RUNTIME_LOCAL_NAME: runtimeLocalNameIdentifier,
            })
          );

          path.pushContainer(
            "body",
            runtimeInitCall({
              RUNTIME_LOCAL_NAME: runtimeLocalNameIdentifier,
              MODULE_ID: moduleIdIdentifier,
            })
          );
        },
        JSXElement(elmPath) {
          invariant(moduleIdIdentifier, "moduleIdIdentifier is not defined");

          const nodeId = elmPath.node.extra?.nodeId;
          invariant(typeof nodeId === "string", "nodeId is not defined");

          const programScope = elmPath.scope.getProgramParent();

          const nodeInfoIdentifier = programScope.generateUidIdentifier(nodeId);

          const nodeInfo = nodesInfo.get(nodeId);
          invariant(nodeInfo, `No info found for node "${nodeId}"`);

          programScope.push({
            id: nodeInfoIdentifier,
            init: t.objectExpression([
              t.objectProperty(t.identifier("nodeId"), t.stringLiteral(nodeId)),
              t.objectProperty(t.identifier("moduleId"), moduleIdIdentifier),
              t.objectProperty(
                t.identifier("jsxTagName"),
                t.stringLiteral(nodeInfo.jsxTagName)
              ),
              t.objectProperty(
                t.identifier("attributes"),
                t.arrayExpression(
                  nodeInfo.attributesInfo.map((attrInfo) => {
                    return t.objectExpression([
                      t.objectProperty(
                        t.identifier("kind"),
                        t.stringLiteral(attrInfo.kind)
                      ),
                      ...(attrInfo.kind === "static"
                        ? [
                            t.objectProperty(
                              t.identifier("value"),
                              attrInfo.valueAst
                            ),
                          ]
                        : []),
                      ...(attrInfo.kind === "static" ||
                      attrInfo.kind === "dynamic"
                        ? [
                            t.objectProperty(
                              t.identifier("name"),
                              t.stringLiteral(attrInfo.name)
                            ),
                          ]
                        : []),
                    ]);
                  })
                )
              ),
            ]),
          });

          elmPath
            .get("openingElement")
            .pushContainer("attributes", [
              t.jsxAttribute(
                t.jsxIdentifier("data-live-node"),
                t.jsxExpressionContainer(nodeInfoIdentifier)
              ),
            ]);
        },
      });

      const { code: codeOut } = generator(astOut, {
        retainLines: true,
      });

      console.log(codeOut);

      return {
        code: codeOut,
        map: null,
      };
    },
  };
}
