import { Box } from "@mui/material";
import * as React from "react";

export interface EditorProps {
  children?: React.ReactNode;
}

export default function Editor({ children }: EditorProps) {
  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "stretch",
      }}
    >
      <Box sx={{ width: 200 }}>Hierarchy</Box>
      <Box sx={{ flex: 1, overflow: "auto" }}>{children}</Box>
      <Box sx={{ width: 200 }}>Component</Box>
    </Box>
  );
}
