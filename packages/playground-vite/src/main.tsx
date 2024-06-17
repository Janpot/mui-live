import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { Editor, registerComponent } from "mui-live/runtime";
import { ColumnsEditor } from "mui-live/runtime/x-data-grid";
import { DataGrid } from "@mui/x-data-grid";

registerComponent(DataGrid, {
  properties: {
    columns: {
      Editor: ColumnsEditor,
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
