import { diff } from "just-diff";
import { NodePath, types as t } from "@babel/core";

type Patches = ReturnType<typeof diff>;

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

  if (typeof value === "undefined") {
    return t.identifier("undefined");
  }

  throw new Error("Unsupported value");
}

function findAttributeExpression(
  path: NodePath<t.JSXElement>,
  attrName: string
): NodePath<t.Expression> | null {
  const attrs = path.get("openingElement").get("attributes");

  for (const attr of attrs) {
    if (attr.isJSXAttribute() && attr.get("name").node.name === attrName) {
      const value = attr.get("value");
      if (!value.isJSXExpressionContainer()) {
        return null;
      }
      const expression = value.get("expression");
      if (!expression.isExpression()) {
        return null;
      }

      return expression;
    }
  }

  return null;
}

function findProperty(
  obj: NodePath<t.ObjectExpression>,
  name: string
): NodePath<t.ObjectProperty> | null {
  const properties = obj
    .get("properties")
    .filter((prop) => prop.isObjectProperty());
  for (const prop of properties) {
    const key = prop.get("key");
    if (key.isIdentifier({ name })) {
      return prop;
    }
  }

  return null;
}

function setNested(
  path: NodePath<t.Expression>,
  jsonPath: (string | number)[],
  value: t.Expression
) {
  if (jsonPath.length === 0) {
    path.replaceWith(value);
    return;
  }

  const [segment, ...rest] = jsonPath;

  if (typeof segment === "string") {
    if (!path.isObjectExpression()) {
      throw new Error("Expected object expression");
    }

    const property = findProperty(path, segment);

    if (rest.length <= 0) {
      if (property) {
        property.get("value").replaceWith(value);
      } else {
        path.pushContainer(
          "properties",
          t.objectProperty(t.stringLiteral(segment), value)
        );
      }
    } else {
      if (!property) {
        throw new Error(`Property "${segment}" not found`);
      }

      if (!(property && property.isObjectProperty())) {
        throw new Error(`Expected "${segment}" to be an object property`);
      }

      const propertyValue = property.get("value");

      if (
        !(
          propertyValue.isObjectExpression() ||
          propertyValue.isArrayExpression()
        )
      ) {
        throw new Error("Expected object/array expression");
      }

      setNested(propertyValue, rest, value);
    }
  } else {
    if (!path.isArrayExpression()) {
      throw new Error("Expected array expression");
    }

    if (rest.length <= 0) {
      if (segment >= path.node.elements.length) {
        path.pushContainer("elements", value);
      } else {
        path.get("elements")[segment].replaceWith(value);
      }
    } else {
      const item = path.get("elements")[segment];

      if (!(item.isObjectExpression() || item.isArrayExpression())) {
        throw new Error(`Expected "${segment}" to be object/array expression`);
      }

      setNested(item, rest, value);
    }
  }
}

function removeNested(
  path: NodePath<t.Expression>,
  jsonPath: (string | number)[]
) {
  if (jsonPath.length <= 0) {
    throw new Error("Not supported");
  }

  const [segment, ...rest] = jsonPath;

  if (rest.length <= 0) {
    if (typeof segment === "string") {
      if (!path.isObjectExpression()) {
        throw new Error(`Expected object expression`);
      }

      const property = findProperty(path, segment);

      if (property) {
        property.remove();
      }
    } else {
      if (!path.isArrayExpression()) {
        throw new Error("Expected array expression");
      }

      path.get("elements")[segment].remove();
    }
  } else {
    if (typeof segment === "string") {
      if (!path.isObjectExpression()) {
        throw new Error("Expected object expression");
      }

      const property = findProperty(path, segment);

      if (!(property && property.isObjectProperty())) {
        throw new Error(`Expected "${segment}" to be an object property`);
      }

      const propertyValue = property.get("value");

      if (
        !(
          propertyValue.isObjectExpression() ||
          propertyValue.isArrayExpression()
        )
      ) {
        throw new Error("Expected object/array expression");
      }

      removeNested(propertyValue, rest);
    } else {
      if (!path.isArrayExpression()) {
        throw new Error("Expected array expression");
      }

      const item = path.get("elements")[segment];

      if (!(item.isObjectExpression() || item.isArrayExpression())) {
        throw new Error("Expected object/array expression");
      }

      removeNested(item, rest);
    }
  }
}

function removeAttribute(path: NodePath<t.JSXElement>, attrName: string) {
  const attrs = path.get("openingElement").get("attributes");

  for (const attr of attrs) {
    if (attr.isJSXAttribute() && attr.get("name").node.name === attrName) {
      attr.remove();
      return;
    }
  }
}

export function patchJsxElementAttributes(
  path: NodePath<t.JSXElement>,
  patches: Patches
) {
  for (const patch of patches) {
    if (patch.op === "add" || patch.op === "replace") {
      const [attrName, ...jsonPath] = patch.path as (string | number)[];
      if (typeof attrName !== "string") {
        throw new Error("Expected string for jsx attribute name");
      }

      const attrExpression = findAttributeExpression(path, attrName);

      if (!attrExpression) {
        throw new Error(`Attribute "${attrName}" not found`);
      }

      setNested(attrExpression, jsonPath, buildAstLiteral(patch.value));
    } else if (patch.op === "remove") {
      const [attrName, ...jsonPath] = patch.path as (string | number)[];
      if (typeof attrName !== "string") {
        throw new Error("Expected string for jsx attribute name");
      }

      if (jsonPath.length <= 0) {
        removeAttribute(path, attrName);
      } else {
        const attrExpression = findAttributeExpression(path, attrName);

        if (!attrExpression) {
          throw new Error(`Attribute "${attrName}" not found`);
        }

        removeNested(attrExpression, jsonPath);
      }
    }
  }
}
