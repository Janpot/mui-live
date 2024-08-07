import * as React from "react";

export default function useMergedRefs<T>(
  ...refs: (
    | React.RefCallback<T>
    | React.MutableRefObject<T | null>
    | undefined
  )[]
): React.RefCallback<T> {
  return (value) => {
    refs.forEach((ref) => {
      if (typeof ref === "function") {
        ref(value);
      } else if (ref) {
        ref.current = value;
      }
    });
  };
}
