import { Box } from "@mui/material";
import invariant from "invariant";
import * as React from "react";
import { RichTreeView } from "@mui/x-tree-view/RichTreeView";
import { modules, NodeInfo } from ".";

export interface EditorProps {
  children?: React.ReactNode;
}

interface HierarchyItem {
  nodeInfo: NodeInfo;
  moduleId: string;
  nodeId: string;
  children: HierarchyItem[];
}

const getItemId = (item: HierarchyItem) => `${item.moduleId}:${item.nodeId}`;

const getItemLabel = (item: HierarchyItem) => item.nodeInfo.jsxTagName;

export default function Editor({ children }: EditorProps) {
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const [nodeTree, setNodeTree] = React.useState<HierarchyItem[]>([]);
  const [selectedItem, setSelectedItem] = React.useState<string | null>(null);

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
          selectedItems={selectedItem}
          onSelectedItemsChange={(_event, item) => setSelectedItem(item)}
        />
      </Box>
      <Box ref={canvasRef} sx={{ flex: 1, overflow: "auto" }}>
        {children}
      </Box>
      <Box sx={{ width: 200 }}>Component {selectedItem}</Box>
    </Box>
  );
}
