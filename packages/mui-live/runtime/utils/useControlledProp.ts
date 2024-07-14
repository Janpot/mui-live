import * as React from "react";

export default function useControlledProp<
  T,
  F extends (arg: T, ...rest: any[]) => void,
>(
  name: string,
  valueProp: T | undefined,
  onChangeProp: F | undefined,
  defaultValueProp: T | undefined
): [T | undefined, F];
export default function useControlledProp<T, F extends (...arg: any[]) => void>(
  name: string,
  valueProp: T | undefined,
  onChangeProp: F | undefined,
  defaultValueProp: T | undefined,
  valueGetter: (...args: Parameters<F>) => T
): [T | undefined, F];
export default function useControlledProp<T, F extends (...arg: any[]) => void>(
  name: string,
  valueProp: T | undefined,
  onChangeProp: F | undefined,
  defaultValueProp: T | undefined,
  valueGetter?: (...args: Parameters<F>) => T
): [T | undefined, F] {
  const isControlled = valueProp !== undefined;
  const [uncontrolledValue, setUncontrolledValue] =
    React.useState(defaultValueProp);
  const value = isControlled ? valueProp : uncontrolledValue;
  const onChange = React.useCallback(
    (...args: Parameters<F>) => {
      if (isControlled) {
        onChangeProp?.(...args);
      } else {
        setUncontrolledValue(valueGetter ? valueGetter(...args) : args[0]);
      }
    },
    [isControlled, onChangeProp, setUncontrolledValue]
  );

  const initialIsControlled = React.useRef(isControlled);
  const hasWarned = React.useRef(false);

  React.useEffect(() => {
    if (initialIsControlled.current !== isControlled && !hasWarned.current) {
      hasWarned.current = true;
      console.error(
        `The "${name}" prop changes from ${isControlled ? "uncontrolled" : "controlled"} to ${isControlled ? "controlled" : "uncontrolled"}.`
      );
    }
  }, [isControlled]);

  return [value, onChange as F];
}
