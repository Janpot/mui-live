import { Box, Stack, styled } from "@mui/material";
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
import BoxEditor from "./components/BoxEditor";
import CssLengthEditor from "./components/CssLengthEditor";

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
      return <EastIcon fontSize="inherit" />;
    case "column":
      return <SouthIcon fontSize="inherit" />;
    case "row-reverse":
      return <WestIcon fontSize="inherit" />;
    case "column-reverse":
      return <NorthIcon fontSize="inherit" />;
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
      return <AlignHorizontalLeftIcon fontSize="inherit" />;
    case "center":
      return <AlignHorizontalCenterIcon fontSize="inherit" />;
    case "flex-end":
      return <AlignHorizontalRightIcon fontSize="inherit" />;
    case "stretch":
      return <AlignHorizontalStretchIcon fontSize="inherit" />;
    default:
      throw new Error(`Unknown align items: ${value}`);
  }
}

function getRowAlignItemsLabel(value: AlignItems) {
  switch (value) {
    case "flex-start":
      return <AlignVerticalTop fontSize="inherit" />;
    case "center":
      return <AlignVerticalCenterIcon fontSize="inherit" />;
    case "flex-end":
      return <AlignVerticalBottom fontSize="inherit" />;
    case "stretch":
      return <AlignVerticalStretchIcon fontSize="inherit" />;
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
    propertyValue: React.CSSProperties[K] | null,
    defaultPropertyValue: React.CSSProperties[K] | null
  ) {
    let next: React.CSSProperties | undefined = { ...value };

    if (propertyValue === null || propertyValue === defaultPropertyValue) {
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
      <BoxEditor label="margin/padding" value={value} onChange={onChange} />
      <Box sx={{ mt: 1 }}>
        <Stack direction="row" spacing={1}>
          <CssLengthEditor
            size="small"
            label="width"
            value={value?.width ?? null}
            onChange={(width) => handleChange("width", width, null)}
          />
          <CssLengthEditor
            size="small"
            label="height"
            value={value?.height ?? null}
            onChange={(height) => handleChange("height", height, null)}
          />
        </Stack>
      </Box>
    </Stack>
  );
}
