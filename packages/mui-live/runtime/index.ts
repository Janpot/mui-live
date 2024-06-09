// import "vite/client";

import { Patches } from "./diff";

export async function saveNodeProperties(
  moduleId: string,
  nodeId: string,
  patches: Patches
) {
  // @ts-expect-error vite errors on `import "vite/client"`
  if (!import.meta.hot) {
    throw new Error("import.meta.hot is not defined");
  }
  // @ts-expect-error vite errors on `import "vite/client"`
  const hot = import.meta.hot;

  console.log("sending");
  hot.send("mui-live:save-properties", { nodeId, moduleId, patches });
}

console.log("@mui/live loaded");
