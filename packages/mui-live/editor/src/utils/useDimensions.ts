import * as React from "react";

export default function useDimensions(
  ref?:
    | React.RefCallback<HTMLElement | null>
    | React.MutableRefObject<HTMLElement | null>
) {
  const [dimensions, setDimensions] = React.useState<DOMRectReadOnly | null>(
    null
  );
  const observer = React.useRef<ResizeObserver | null>();

  const refCallback = React.useCallback((elm: HTMLElement | null) => {
    if (ref) {
      if (typeof ref === "function") {
        ref(elm);
      } else {
        ref.current = elm;
      }
    }

    if (!observer.current) {
      observer.current = new ResizeObserver(([entry]) => {
        setDimensions(entry.contentRect);
      });
    }

    observer.current.disconnect();
    if (elm) {
      observer.current.observe(elm);
    }
  }, []);

  return {
    ref: refCallback,
    dimensions,
  };
}
