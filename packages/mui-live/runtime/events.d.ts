import "vite/types/customEvent";
import { Patches } from "./diff";

declare module "vite/types/customEvent" {
  interface CustomEventMap {
    "mui-live:save-properties": { node: string; patches: Patches };
  }
}
