// import "vite/client";
import { diff } from "just-diff";

type Patches = ReturnType<typeof diff>;

export async function saveNodeProperties(node: string, patches: Patches) {
  if (!import.meta.hot) {
    throw new Error("import.meta.hot is not defined");
  }
  const hot = import.meta.hot;

  console.log("sending");
  hot.send("mui-live:save-properties", { node, patches });
}

console.log("@mui/live loaded");
