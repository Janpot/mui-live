import { diff } from "just-diff";

export type Patches = ReturnType<typeof diff>;

export const createDiff = diff;
