import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import Editor from "mui-live/runtime/Editor";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Editor>
      <App />
    </Editor>
  </React.StrictMode>
);
