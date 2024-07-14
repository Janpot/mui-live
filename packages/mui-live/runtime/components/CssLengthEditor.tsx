import * as React from "react";
import { styled, TextField, TextFieldProps } from "@mui/material";
import useControlledProp from "../utils/useControlledProp";

const StyledTextField = styled(TextField)({
  "& .MuiFormLabel-root": {
    fontSize: "0.75rem",
    lineHeight: 1,
    "&.MuiInputLabel-shrink": {
      transform: "translate(14px, -5px) scale(0.75)",
    },
  },
  "& .MuiInputBase-input": {
    fontSize: "0.75rem",
    lineHeight: 1,
    padding: 5,
  },
});

export interface CssLengthEditorProps
  extends Omit<TextFieldProps, "value" | "onChange"> {
  value?: string | number | null;
  defaultValue?: string | number | null;
  onChange?: (value: string | number | null) => void;
}

function parseCssValue(value: string): string | number | null {
  if (!value) {
    return null;
  }
  const numberValue = Number(value);
  if (!Number.isNaN(numberValue)) {
    return numberValue;
  }
  return value;
}

export default function CssLengthEditor({
  value: valueProp,
  onChange: onChangeProp,
  defaultValue: defaultValueProp,
  ...props
}: CssLengthEditorProps) {
  const [value, onChange] = useControlledProp(
    "value",
    valueProp,
    onChangeProp,
    defaultValueProp
  );

  return (
    <StyledTextField
      variant="outlined"
      value={value ?? ""}
      onChange={(event) => {
        onChange(parseCssValue(event.target.value));
      }}
      {...props}
    />
  );
}
