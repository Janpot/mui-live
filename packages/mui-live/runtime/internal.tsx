export type AttributeInfo =
  | {
      kind: "static";
      name: string;
      value: unknown;
    }
  | {
      kind: "dynamic";
      name: string;
    }
  | {
      kind: "spread";
    };

export interface NodeInfo {
  jsxTagName: string;
  attributes: AttributeInfo[];
}

export interface ModuleInfo {
  id: string;
  nodes: Map<string, NodeInfo>;
}

export const modules: Map<string, ModuleInfo> = new Map();

export function registerModule(module: ModuleInfo) {
  modules.set(module.id, module);
}
