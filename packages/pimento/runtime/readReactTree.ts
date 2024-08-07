import type { FiberNode, FiberRootNode } from "react-devtools-inline";
import { AttributeInfo, MuiLiveNodeAttribute } from "./types";

let nextDomId = 1;

declare module "react-devtools-inline" {
  interface FiberNode {
    memoizedProps: Record<string, unknown>;
  }

  interface Source {}
}

interface FiberWalker {
  enter?: (node: FiberNode) => void;
  exit?: (node: FiberNode) => void;
}

function walkFiberTree(node: FiberNode, walker: FiberWalker = {}) {
  walker.enter?.(node);

  let nextChild = node.child;
  while (nextChild) {
    walkFiberTree(nextChild, walker);
    nextChild = nextChild.sibling;
  }

  walker.exit?.(node);
}

function findFiber(
  node: FiberNode,
  predicate: (node: FiberNode) => boolean
): FiberNode | null {
  if (predicate(node)) {
    return node;
  }
  if (node.child) {
    const found = findFiber(node.child, predicate);
    if (found) {
      return found;
    }
  }
  if (node.sibling) {
    const found = findFiber(node.sibling, predicate);
    if (found) {
      return found;
    }
  }
  return null;
}

function findFiberRoot(): FiberRootNode {
  const devtoolsHook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (!devtoolsHook) {
    throw new Error(
      `Can't read page layout as react devtools are not installed`
    );
  }

  const rendererId = 1;
  const fiberRoot = Array.from(devtoolsHook.getFiberRoots(rendererId))[0];
  return fiberRoot;
}

export interface MuiLiveNode {
  id: string;
  parent: null | MuiLiveNode;
  nodeId: string;
  moduleId: string;
  outerElm: number | null;
  children: MuiLiveNode[];
  jsxTagName: string;
  component: string | null;
  props: Record<string, unknown>;
  attributes: AttributeInfo[];
}

const domIdMap = new WeakMap<Element, number>();

export function readReactTree(): readonly MuiLiveNode[] {
  const fiberRoot = findFiberRoot();

  const elmFiber = fiberRoot.current.child;

  if (!elmFiber) {
    throw new Error("Can't find the root fiber for the given element");
  }

  console.log(elmFiber);

  const root: MuiLiveNode[] = [];

  let currentNode: MuiLiveNode | null = null;

  const seen = new Set<string>();
  const nodeFibers = new Map<MuiLiveNode, FiberNode>();
  walkFiberTree(elmFiber, {
    enter: (fiber) => {
      const props = fiber.memoizedProps;
      const liveNodeAttribute = props?.["data-pimento-node"] as
        | MuiLiveNodeAttribute
        | undefined;

      if (liveNodeAttribute) {
        const { moduleId, nodeId, jsxTagName } = liveNodeAttribute;

        const seenId = `${nodeId}-${moduleId}`;
        if (!seen.has(seenId)) {
          seen.add(seenId);

          const props = Object.assign(
            {},
            ...liveNodeAttribute.attributes.map((attr) => {
              if (attr.kind === "static") {
                return { [attr.name]: attr.value };
              }
            })
          );

          const newNode: any = {
            id: seenId,
            parent: currentNode,
            outerElm: null,
            children: [],
            component: typeof fiber.type === "string" ? fiber.type : null,
            props,
            moduleId,
            nodeId,
            jsxTagName,
          };

          nodeFibers.set(newNode, fiber);

          (currentNode?.children ?? root).push(newNode);

          currentNode = newNode;
        }
      }

      if (
        currentNode &&
        !currentNode.outerElm &&
        fiber.stateNode &&
        fiber.stateNode instanceof Element
      ) {
        let domId = domIdMap.get(fiber.stateNode);

        if (domId === undefined) {
          domId = nextDomId;
          nextDomId += 1;
          domIdMap.set(fiber.stateNode, domId);
        }

        currentNode.outerElm = domId;
      }
    },
    exit: (fiber) => {
      if (currentNode && nodeFibers.get(currentNode) === fiber) {
        currentNode = currentNode?.parent ?? null;
      }
    },
  });

  return root;
}
