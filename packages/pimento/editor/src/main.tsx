import React from "react";
import ReactDOM from "react-dom/client";
import { DataGrid } from "@mui/x-data-grid";
import { CssBaseline, Typography } from "@mui/material";

import { Editor, registerComponent } from "./Editor";

import { ColumnsEditor } from "./x-data-grid";
import StyleEditor from "./StyleEditor";

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
    <CssBaseline />
    <Editor sx={{ width: "100vw", height: "100vh" }}></Editor>
  </React.StrictMode>
);
