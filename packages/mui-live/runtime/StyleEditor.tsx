import { Stack } from "@mui/material";
import * as React from "react";
import ToggleButtonSelect from "./components/ToggleButtonSelect";

export interface StyleEditorProps {
  value: React.CSSProperties | undefined;
  onChange?: (newValue: React.CSSProperties | undefined) => void;
}

export default function StyleEditor({ value, onChange }: StyleEditorProps) {
  const handleChange = function <K extends keyof React.CSSProperties>(
    property: K,
    propertyValue: React.CSSProperties[K],
    defaultPropertyValue: React.CSSProperties[K]
  ) {
    let next: React.CSSProperties | undefined = { ...value };

    if (propertyValue === defaultPropertyValue) {
      delete next[property];
    } else {
      next[property] = propertyValue;
    }

    if (Object.keys(next).length <= 0) {
      next = undefined;
    }

    onChange?.(next);
  };
  return (
    <Stack>
      <ToggleButtonSelect
        label="display"
        value={value?.display ?? "block"}
        options={["block", "inline", "flex"]}
        onChange={(event, display) => handleChange("display", display, "block")}
        size="small"
      />
      {value?.display === "flex" ? (
        <>
          <ToggleButtonSelect
            label="flex-direction"
            value={value?.flexDirection ?? "row"}
            options={["row", "column", "row-reverse", "column-reverse"]}
            onChange={(event, flexDirection) =>
              handleChange("flexDirection", flexDirection, "row")
            }
            size="small"
          />
        </>
      ) : null}
    </Stack>
  );
}
