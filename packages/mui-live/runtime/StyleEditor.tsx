import { Stack, styled } from "@mui/material";
import * as React from "react";
import ToggleButtonSelect from "./components/ToggleButtonSelect";
import EastIcon from "@mui/icons-material/East";
import WestIcon from "@mui/icons-material/West";
import SouthIcon from "@mui/icons-material/South";
import NorthIcon from "@mui/icons-material/North";
import AlignHorizontalLeftIcon from "@mui/icons-material/AlignHorizontalLeft";
import AlignHorizontalCenterIcon from "@mui/icons-material/AlignHorizontalCenter";
import AlignHorizontalRightIcon from "@mui/icons-material/AlignHorizontalRight";
import AlignVerticalBottom from "@mui/icons-material/AlignVerticalBottom";
import AlignVerticalCenterIcon from "@mui/icons-material/AlignVerticalCenter";
import AlignVerticalTop from "@mui/icons-material/AlignVerticalTop";
import AlignVerticalStretchIcon from "@mui/icons-material/Height";

const AlignHorizontalStretchIcon = styled(AlignVerticalStretchIcon)({
  transform: "rotate(90deg)",
});

type FlexDirection = NonNullable<React.CSSProperties["flexDirection"]>;

const FLEX_DIRECTIONS: FlexDirection[] = [
  "row",
  "row-reverse",
  "column",
  "column-reverse",
];

function getFlexDirectionLabel(value: FlexDirection) {
  switch (value) {
    case "row":
      return <EastIcon fontSize="small" />;
    case "column":
      return <SouthIcon fontSize="small" />;
    case "row-reverse":
      return <WestIcon fontSize="small" />;
    case "column-reverse":
      return <NorthIcon fontSize="small" />;
    default:
      throw new Error(`Unknown flex direction: ${value}`);
  }
}

type AlignItems = NonNullable<React.CSSProperties["alignItems"]>;

const ALIGN_ITEMS: AlignItems[] = [
  "flex-start",
  "center",
  "flex-end",
  "stretch",
];

function getColumnAlignItemsLabel(value: AlignItems) {
  switch (value) {
    case "flex-start":
      return <AlignHorizontalLeftIcon />;
    case "center":
      return <AlignHorizontalCenterIcon />;
    case "flex-end":
      return <AlignHorizontalRightIcon />;
    case "stretch":
      return <AlignHorizontalStretchIcon />;
    default:
      throw new Error(`Unknown align items: ${value}`);
  }
}

function getRowAlignItemsLabel(value: AlignItems) {
  switch (value) {
    case "flex-start":
      return <AlignVerticalTop />;
    case "center":
      return <AlignVerticalCenterIcon />;
    case "flex-end":
      return <AlignVerticalBottom />;
    case "stretch":
      return <AlignVerticalStretchIcon />;
    default:
      throw new Error(`Unknown align items: ${value}`);
  }
}

function getAlignItemsLabelGetter(
  flexDirection: FlexDirection
): (value: AlignItems) => React.ReactNode {
  switch (flexDirection) {
    case "row":
    case "row-reverse":
      return getRowAlignItemsLabel;
    case "column":
    case "column-reverse":
      return getColumnAlignItemsLabel;
    default:
      throw new Error(`Unknown flex direction: ${flexDirection}`);
  }
}

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
            options={FLEX_DIRECTIONS}
            getLabel={getFlexDirectionLabel}
            onChange={(event, flexDirection) =>
              handleChange("flexDirection", flexDirection, "row")
            }
            size="small"
          />
          <ToggleButtonSelect
            label="align-items"
            value={value?.alignItems ?? "row"}
            options={ALIGN_ITEMS}
            getLabel={getAlignItemsLabelGetter(value?.flexDirection ?? "row")}
            onChange={(event, alignItems) =>
              handleChange("alignItems", alignItems, "row")
            }
            size="small"
          />
        </>
      ) : null}
    </Stack>
  );
}
