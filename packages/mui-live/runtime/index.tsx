import { readReactTree } from "./readReactTree";
import { saveNodeProperties } from "./api";

window.parent.postMessage({ kind: "ready" }, "*");

window.addEventListener("message", async (event) => {
  switch (event.data.kind) {
    case "activate": {
      window.parent.postMessage({ kind: "ready" }, "*");
      break;
    }
    case "getNodeTree": {
      const nodeTree = readReactTree(document.body);
      event.ports[0].postMessage({ result: nodeTree });
      break;
    }
    case "saveNodeProperties": {
      const { moduleId, nodeId, patches } = event.data;
      saveNodeProperties(moduleId, nodeId, patches);
      break;
    }
  }
});

export function init(moduleId: string) {
  console.log(`Init runtime module: ${moduleId}`);
}
