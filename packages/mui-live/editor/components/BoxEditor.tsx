import * as React from "react";
import {
  ButtonBase,
  FormControl,
  FormLabel,
  Popover,
  styled,
} from "@mui/material";
import useDimensions from "../utils/useDimensions";
import CssLengthEditor from "./CssLengthEditor";

const SegmentPolygon = styled("polygon")({
  "&:hover": {
    opacity: 0.6,
  },
});

interface SegmentProps {
  value?: string | number | null;
  onChange?: (value: string | number | null) => void;
  points: string;
  fill?: string;
}

function Segment({ points, fill, value, onChange }: SegmentProps) {
  const [anchorEl, setAnchorEl] = React.useState<Element | null>(null);

  const handleClick = (event: React.MouseEvent<Element>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const idPrefix = React.useId();
  const open = Boolean(anchorEl);
  const buttonId = `${idPrefix}:simple-popover-button`;
  const popoverId = open ? `${idPrefix}:simple-popover` : undefined;

  return (
    <>
      <ButtonBase
        component={SegmentPolygon}
        onClick={handleClick}
        points={points}
        fill={fill}
      />
      <Popover
        id={popoverId}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
      >
        <CssLengthEditor value={value ?? null} onChange={onChange} />
      </Popover>
    </>
  );
}

interface BoxSegmentsProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness: number;
  fill?: string;
  property: "margin" | "padding";
  value?: React.CSSProperties | undefined;
  onChange?: (newValue: React.CSSProperties | undefined) => void;
}

function BoxSegments({
  x1,
  y1,
  x2,
  y2,
  thickness,
  fill,
  property,
  value,
  onChange,
}: BoxSegmentsProps) {
  return (
    <g>
      {/* top */}
      <Segment
        points={`${x1},${y1} ${x2},${y1} ${x2 - thickness},${y1 + thickness} ${x1 + thickness},${y1 + thickness}`}
        fill={fill}
        value={value?.[`${property}Top`]}
        onChange={(newLength) => {
          onChange?.({ ...value, [`${property}Top`]: newLength });
        }}
      />

      {/* right */}
      <Segment
        points={`${x2},${y1} ${x2},${y2} ${x2 - thickness},${y2 - thickness} ${x2 - thickness},${y1 + thickness}`}
        fill={fill}
        value={value?.[`${property}Right`]}
        onChange={(newLength) => {
          onChange?.({ ...value, [`${property}Right`]: newLength });
        }}
      />

      {/* bottom */}
      <Segment
        points={`${x2},${y2} ${x1},${y2} ${x1 + thickness},${y2 - thickness} ${x2 - thickness},${y2 - thickness}`}
        fill={fill}
        value={value?.[`${property}Bottom`]}
        onChange={(newLength) => {
          onChange?.({ ...value, [`${property}Bottom`]: newLength });
        }}
      />

      {/* left */}
      <Segment
        points={`${x1},${y2} ${x1},${y1} ${x1 + thickness},${y1 + thickness} ${x1 + thickness},${y2 - thickness}`}
        fill={fill}
        value={value?.[`${property}Left`]}
        onChange={(newLength) => {
          onChange?.({ ...value, [`${property}Left`]: newLength });
        }}
      />
    </g>
  );
}

export interface BoxEditorProps {
  value?: React.CSSProperties | undefined;
  onChange?: (newValue: React.CSSProperties | undefined) => void;
  label?: string;
}

export default function BoxEditor({ label, value, onChange }: BoxEditorProps) {
  const { ref: rootRef, dimensions } = useDimensions();

  const thickness = 15;

  return (
    <FormControl>
      <FormLabel>{label}</FormLabel>
      <div ref={rootRef} style={{ height: 5 * thickness }}>
        {dimensions ? (
          <svg style={{ display: "block", width: "100%", height: "100%" }}>
            <BoxSegments
              x1={0}
              y1={0}
              x2={dimensions.width}
              y2={dimensions.height}
              thickness={thickness}
              fill="#A9855C"
              property="margin"
              value={value}
              onChange={onChange}
            />
            <BoxSegments
              x1={thickness}
              y1={thickness}
              x2={dimensions.width - thickness}
              y2={dimensions.height - thickness}
              thickness={thickness}
              fill="#BBC387"
              property="padding"
              value={value}
              onChange={onChange}
            />
          </svg>
        ) : null}
      </div>
    </FormControl>
  );
}
