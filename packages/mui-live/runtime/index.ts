export interface NodeInfo {
  tagName: string;
}

export interface ModuleInfo {
  id: string;
  nodes: Map<string, NodeInfo>;
}

export const modules: Map<string, ModuleInfo> = new Map();

export function registerModule(module: ModuleInfo) {
  modules.set(module.id, module);
}
