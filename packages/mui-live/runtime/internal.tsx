export type AttributeInfo =
  | {
      kind: "static";
      name: string;
    }
  | {
      kind: "dynamic";
      name: string;
    }
  | {
      kind: "spread";
    };

export interface MuiLiveNodeAttribute {
  nodeId: string;
  moduleId: string;
  jsxTagName: string;
  attributes: AttributeInfo[];
}
