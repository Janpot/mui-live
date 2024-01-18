import * as React from "react";
import { ScopedCssBaseline, Box, GlobalStyles, Portal } from "@mui/material";

interface ResizeHandleProps {
  onResize?: (height: number) => void;
  onCommitResize?: (height: number) => void;
}

function ResizeHandle({ onResize, onCommitResize }: ResizeHandleProps) {
  const prevSize = React.useRef<number | null>(null);
  const [resizing, setResizing] = React.useState(false);

  React.useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (prevSize.current !== null) {
        const delta = window.innerWidth - event.clientX - prevSize.current;
        onResize?.(delta);
        prevSize.current += delta;
      }
    };

    const handleMouseUp = (event: MouseEvent) => {
      if (prevSize.current !== null) {
        const delta = window.innerWidth - event.clientX - prevSize.current;
        onCommitResize?.(delta);
        prevSize.current = null;
      }
      setResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [onResize, onCommitResize]);

  return (
    <Box
      sx={{
        mx: "-4px",
        width: "9px",
        height: "100%",
        cursor: "ew-resize",
        pointerEvents: "auto",
      }}
      onMouseDown={(event) => {
        setResizing(true);
        const newSize = window.innerWidth - event.clientX;
        prevSize.current = newSize;
      }}
    >
      <GlobalStyles
        styles={{
          body: resizing
            ? {
                cursor: "ew-resize",
                userSelect: "none",
                pointerEvents: "none",
              }
            : {},
        }}
      />
    </Box>
  );
}

export interface DevtoolHostProps {
  children?: React.ReactNode;
}

/**
 * Pure presentational component that defines the surface we use to render the devtools in
 */
export default function DevtoolHost({ children }: DevtoolHostProps) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [size, setSize] = React.useState(() => window.innerWidth / 4);

  const handleResize = (delta: number) => {
    setSize((prevSize) => prevSize + delta);
  };

  return (
    <Portal>
      <ScopedCssBaseline>
        <Box
          ref={rootRef}
          className="mui-fixed"
          sx={{
            position: "fixed",
            bottom: 0,
            right: 0,
            top: 0,

            width: size,

            borderLeft: 1,
            borderColor: "divider",
            backgroundColor: "background.paper",
            display: "flex",
            flexDirection: "row",
            zIndex: 1300,
          }}
        >
          <GlobalStyles
            styles={{
              body: {
                marginRight: `${size}px`,
              },
            }}
          />
          <ResizeHandle onResize={handleResize} />
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
            }}
          >
            {children}
          </Box>
        </Box>
      </ScopedCssBaseline>
    </Portal>
  );
}
