import "vite/types/customEvent";
import { Patches } from "./diff";

declare module "vite/types/customEvent" {
  interface CustomEventMap {
    "mui-live:save-properties": {
      nodeId: string;
      moduleId: string;
      patches: Patches;
    };
  }
}
