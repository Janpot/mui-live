import "vite/types/customEvent";

declare module "vite/types/customEvent" {
  interface CustomEventMap {
    "mui-live:save-properties": { node: string; props: any };
  }
}
