import * as React from "react";
import Devtool from "./devtool";

export interface MuiLiveProps {
  children?: React.ReactNode;
}

export function MuiLive({ children }: MuiLiveProps) {
  return (
    <>
      {children}
      <Devtool />
    </>
  );
}

export function onNodeRender(...args) {
  console.log("registering node", ...args);
}

console.log("@mui/live loaded");
