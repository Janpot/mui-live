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

function toMemberExpression(
  jsxMemberExpression: t.JSXMemberExpression
): t.MemberExpression {
  if (t.isJSXIdentifier(jsxMemberExpression.object)) {
    return t.memberExpression(
      t.identifier(jsxMemberExpression.object.name),
      t.identifier(jsxMemberExpression.property.name)
    );
  }
  return t.memberExpression(
    toMemberExpression(jsxMemberExpression.object),
    t.identifier(jsxMemberExpression.property.name)
  );
}

function getJsxTagName(
  nameNode: t.JSXIdentifier | t.JSXMemberExpression | t.JSXNamespacedName
): string {
  if (t.isJSXIdentifier(nameNode)) {
    return nameNode.name;
  } else if (t.isJSXMemberExpression(nameNode)) {
    return `${getJsxTagName(nameNode.object)}.${nameNode.property}`;
  } else if (t.isJSXNamespacedName(nameNode)) {
    return `${nameNode.namespace}:${nameNode.name}`;
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
  if (t.isTemplateLiteral(expression)) {
    const allPartsStatic = expression.quasis.every(
      (part) => !!getStaticExpression(part)
    );
    return allPartsStatic ? expression : null;
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
        `import * as RUNTIME_LOCAL_NAME from "mui-live/runtime/internal";`,
        {
          sourceType: "module",
        }
      );

      const moduleIdVar = template(`const MODULE_ID_NAME = MODULE_ID`, {
        sourceType: "module",
      });

      const registerModuleCall = template(
        `RUNTIME_LOCAL_NAME.registerModule({
          id: MODULE_ID,
          nodes: new Map(NODES)
        })`,
        { sourceType: "module" }
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
                                ...(attrInfo.kind === "static" ||
                                attrInfo.kind === "dynamic"
                                  ? [
                                      t.objectProperty(
                                        t.identifier("name"),
                                        t.stringLiteral(attrInfo.name)
                                      ),
                                    ]
                                  : []),
                                ...(attrInfo.kind === "static"
                                  ? [
                                      t.objectProperty(
                                        t.identifier("value"),
                                        attrInfo.valueAst
                                      ),
                                    ]
                                  : []),
                              ]);
                            })
                          )
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

          const programScope = elmPath.scope.getProgramParent();

          const nodeInfoIdentifier = programScope.generateUidIdentifier(nodeId);

          programScope.push({
            id: nodeInfoIdentifier,
            init: t.objectExpression([
              t.objectProperty(t.identifier("nodeId"), t.stringLiteral(nodeId)),
              t.objectProperty(t.identifier("moduleId"), moduleIdIdentifier),
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
