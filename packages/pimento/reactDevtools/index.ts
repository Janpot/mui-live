import { initialize } from "react-devtools-inline/backend";
initialize(window);

// https://blog.isquaredsoftware.com/presentations/2023-10-react-devtools-replay/?slideIndex=27&stepIndex=0

const originalOnCommitFiberRoot =
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot;

const originalOnCommitFiberUnmount =
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberUnmount;

function onCommitFiberRoot(rendererID, root, priorityLevel) {
  console.log("commit fiber root");
  originalOnCommitFiberRoot(rendererID, root, priorityLevel);
}

function onCommitFiberUnmount(rendererID, fiber) {
  console.log("commit fiber unmount");
  originalOnCommitFiberUnmount(rendererID, fiber);
}

window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot = onCommitFiberRoot;
window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberUnmount =
  onCommitFiberUnmount;
