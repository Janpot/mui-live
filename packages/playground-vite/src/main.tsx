import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { Editor, registerComponent } from "mui-live/runtime";
import { ColumnsEditor } from "mui-live/runtime/x-data-grid";
import { DataGrid } from "@mui/x-data-grid";
import { Typography } from "@mui/material";
import StyleEditor from "mui-live/runtime/StyleEditor";

registerComponent(DataGrid, {
  properties: {
    columns: {
      Editor: ColumnsEditor,
    },
  },
});

registerComponent(Typography, {
  properties: {
    children: {
      Editor: ({ value, onChange }) => (
        <input
          disabled={typeof value !== "string"}
          value={typeof value === "string" ? value : undefined}
          onChange={(event) => onChange?.(event.target.value)}
        />
      ),
    },
  },
});

registerComponent("div", {
  properties: {
    style: {
      Editor: StyleEditor,
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
