import * as React from "react";
import Devtool from "./devtool";
import { Box } from "@mui/material";

export interface MuiLiveProps {
  children?: React.ReactNode;
}

export function MuiLive({ children }: MuiLiveProps) {
  return (
    <Box
      sx={{
        "[data-mui-live-node-id]": {
          outline: "1px solid red",
        },
      }}
    >
      {children}
      <Devtool />
    </Box>
  );
}

export function onNodeRender(...args) {
  // console.log("registering node", ...args);
}

console.log("@mui/live loaded");
