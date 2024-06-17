import { Box } from "@mui/material";
import invariant from "invariant";
import * as React from "react";
import { RichTreeView } from "@mui/x-tree-view/RichTreeView";
import { modules, NodeInfo } from "./internal";

function hash(str: string): string {
  let hash = 0;
  let i = 0;
  while (i < str.length) {
    hash = ((hash << 5) - hash + str.charCodeAt(i++)) << 0;
  }
  return String(hash + 2147483647 + 1);
}

export interface PropertyInfo<P, K extends keyof P> {
  Editor: React.ComponentType<{
    value: P[K];
    onChange?: (value: P[K]) => void;
  }>;
}

export interface ComponentInfo<P = object> {
  properties: {
    [K in keyof P]?: PropertyInfo<P, K>;
  };
}

export const components: Map<string | React.ComponentType, ComponentInfo> =
  new Map();

export function registerComponent<P>(
  component: string | React.ComponentType<P>,
  componentInfo: ComponentInfo<P>
) {
  components.set(component as React.ComponentType, componentInfo);
}

export interface EditorProps {
  children?: React.ReactNode;
}

interface HierarchyItem {
  nodeInfo: NodeInfo;
  moduleId: string;
  nodeId: string;
  children: HierarchyItem[];
}

const getItemId = (item: HierarchyItem) =>
  hash(`${item.moduleId}:${item.nodeId}`);

const getItemLabel = (item: HierarchyItem) => item.nodeInfo.jsxTagName;

export function Editor({ children }: EditorProps) {
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const [nodeTree, setNodeTree] = React.useState<HierarchyItem[]>([]);
  const [selectedItemId, setSelectedItemId] = React.useState<string | null>(
    null
  );

  React.useEffect(() => {
    invariant(
      canvasRef.current,
      "canvasRef should be assigned to a div element"
    );

    const findNodes = (elms: NodeListOf<ChildNode>): HierarchyItem[] => {
      const nodes: HierarchyItem[] = [];

      for (const elm of elms) {
        if (elm instanceof HTMLElement) {
          const moduleId = elm.getAttribute("data-mui-live-module-id");
          const nodeId = elm.getAttribute("data-mui-live-node-id");

          if (moduleId && nodeId) {
            const nodeInfo = modules.get(moduleId)?.nodes.get(nodeId);
            invariant(
              nodeInfo,
              "nodeInfo is not defined for %s in %s",
              nodeId,
              moduleId
            );

            nodes.push({
              nodeInfo,
              moduleId,
              nodeId,
              children: findNodes(elm.childNodes),
            });
          } else {
            nodes.push(...findNodes(elm.childNodes));
          }
        }
      }

      return nodes;
    };

    const observer = new MutationObserver(() => {
      invariant(
        canvasRef.current,
        "canvasRef should be assigned to a div element"
      );
      setNodeTree(findNodes(canvasRef.current.childNodes));
    });

    observer.observe(canvasRef.current, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  const selectedItem = React.useMemo(() => {
    if (!selectedItemId) {
      return null;
    }

    const findItem = (items: HierarchyItem[]): HierarchyItem | null => {
      for (const item of items) {
        if (getItemId(item) === selectedItemId) {
          return item;
        }

        const found = findItem(item.children);
        if (found) {
          return found;
        }
      }

      return null;
    };

    return findItem(nodeTree);
  }, [nodeTree, selectedItemId]);

  console.log(selectedItem);

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "stretch",
      }}
    >
      <Box sx={{ width: 200 }}>
        <RichTreeView
          items={nodeTree}
          getItemId={getItemId}
          getItemLabel={getItemLabel}
          selectedItems={selectedItemId}
          onSelectedItemsChange={(_event, item) => setSelectedItemId(item)}
        />
      </Box>
      <Box ref={canvasRef} sx={{ flex: 1, overflow: "auto" }}>
        {children}
      </Box>
      <Box sx={{ width: 200 }}>
        Component {selectedItem?.nodeInfo.jsxTagName}
      </Box>
    </Box>
  );
}
