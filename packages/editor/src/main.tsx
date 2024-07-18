import React from "react";
import ReactDOM from "react-dom/client";
import { Editor, registerComponent } from "mui-live/editor";
import { ColumnsEditor } from "mui-live/editor/x-data-grid";
import { DataGrid } from "@mui/x-data-grid";
import { CssBaseline, Typography } from "@mui/material";
import StyleEditor from "mui-live/editor/StyleEditor";

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
