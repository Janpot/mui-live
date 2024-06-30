import * as React from "react";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import ToggleButton, { toggleButtonClasses } from "@mui/material/ToggleButton";
import ToggleButtonGroup, {
  ToggleButtonGroupProps,
} from "@mui/material/ToggleButtonGroup";
import { styled } from "@mui/material";

const PropControlToggleButtonGroup = styled(
  ToggleButtonGroup,
  {}
)(({ fullWidth }) => ({
  display: "flex",
  [`& .${toggleButtonClasses.root}`]: fullWidth
    ? {
        flex: 1,
      }
    : {},
}));

export interface ToggleButtonSelectProps<T> extends ToggleButtonGroupProps {
  label?: string;
  options?: T[];
  value?: T;
  onChange?: (event: React.MouseEvent, value: T) => void;
  disabled?: boolean;
  fullWidth?: boolean;
  getValue?: (option: T) => string;
  getLabel?: (option: T) => React.ReactNode;
}

function ToggleButtonSelect<T>({
  options,
  label,
  value,
  onChange,
  disabled,
  fullWidth,
  getValue = (option: T) => String(option),
  getLabel,
  ...rest
}: ToggleButtonSelectProps<T>) {
  return (
    <FormControl>
      <FormLabel>{label}</FormLabel>
      <PropControlToggleButtonGroup
        color="primary"
        value={value}
        exclusive
        onChange={onChange}
        aria-label="Platform"
        disabled={disabled}
        fullWidth={fullWidth}
        {...rest}
      >
        {options?.map((option) => {
          const optionValue = getValue(option);
          const optionLabel = getLabel ? getLabel(option) : optionValue;
          return (
            <ToggleButton key={optionValue} value={optionValue}>
              {optionLabel}
            </ToggleButton>
          );
        })}
      </PropControlToggleButtonGroup>
    </FormControl>
  );
}

export default ToggleButtonSelect;
