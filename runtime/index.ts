// import "vite/client";

export function onNodeRender(...args) {
  console.log(...args);
}

export async function saveNodeProperties(node: string, props: any) {
  if (!import.meta.hot) {
    throw new Error("import.meta.hot is not defined");
  }
  const hot = import.meta.hot;

  console.log("sending");
  hot.send("mui-live:save-properties", { node, props });
}

console.log("@mui/live loaded");
