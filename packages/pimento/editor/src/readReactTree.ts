import type { FiberNode, FiberRootNode } from "react-devtools-inline";
import { AttributeInfo, MuiLiveNodeAttribute } from "./internal";

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
  fiber: FiberNode;
  nodeId: string;
  moduleId: string;
  outerElm: Element | null;
  children: MuiLiveNode[];
  jsxTagName: string;
  component: string | React.ComponentType | null;
  props: Record<string, unknown>;
  attributes: AttributeInfo[];
}

export function readReactTree(elm: HTMLElement): readonly MuiLiveNode[] {
  const fiberRoot = findFiberRoot();

  const elmFiber = findFiber(
    fiberRoot.current,
    (fiber) => fiber.stateNode === elm
  );

  if (!elmFiber) {
    throw new Error("Can't find the root fiber for the given element");
  }

  const root: MuiLiveNode[] = [];

  let currentNode: MuiLiveNode | null = null;

  const seen = new Set<string>();
  walkFiberTree(elmFiber, {
    enter: (fiber) => {
      const props = fiber.memoizedProps;
      const liveNodeAttribute = props?.["data-pimento-node"] as
        | MuiLiveNodeAttribute
        | undefined;

      if (liveNodeAttribute) {
        const { moduleId, nodeId } = liveNodeAttribute;

        const seenId = `${nodeId}-${moduleId}`;
        if (!seen.has(seenId)) {
          seen.add(seenId);

          const newNode = {
            id: seenId,
            parent: currentNode,
            fiber,
            outerElm: null,
            children: [],
            component: fiber.type,
            props,
            ...liveNodeAttribute,
          };

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
        currentNode.outerElm = fiber.stateNode;
      }
    },
    exit: (fiber) => {
      if (currentNode?.fiber === fiber) {
        currentNode = currentNode?.parent ?? null;
      }
    },
  });

  return root;
}
