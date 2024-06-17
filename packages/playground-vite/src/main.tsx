import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { Editor, registerComponent } from "mui-live/runtime";
import { DataGrid } from "mui-live/runtime/x-data-grid";

registerComponent(DataGrid, {
  properties: {
    columns: {
      Editor: () => "columns editor",
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Editor>
      <App />
    </Editor>
  </React.StrictMode>
);
