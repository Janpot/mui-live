export type Json =
  | string
  | number
  | boolean
  | null
  | { [property: string]: Json }
  | Json[];

export type AttributeInfo =
  | {
      kind: "static";
      name: string;
      value: Json;
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
