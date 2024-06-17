import * as React from "react";

export interface NodeInfo {
  jsxTagName: string;
  component: string | React.ComponentType | null;
}

export interface ModuleInfo {
  id: string;
  nodes: Map<string, NodeInfo>;
}

export const modules: Map<string, ModuleInfo> = new Map();

export function registerModule(module: ModuleInfo) {
  modules.set(module.id, module);
}
