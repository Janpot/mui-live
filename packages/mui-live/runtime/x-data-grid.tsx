import * as React from "react";
import {
  GridColDef,
  GridColType,
  DataGrid as MuiDataGrid,
  DataGridProps as MuiDataGridProps,
} from "@mui/x-data-grid";
export * from "@mui/x-data-grid";
import {
  Box,
  Button,
  IconButton,
  MenuItem,
  Popover,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import Editicon from "@mui/icons-material/Edit";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";
import { saveNodeProperties } from "./api";
import invariant from "invariant";
import { diff } from "just-diff";

interface ColumnEditorProps {
  value: GridColDef;
  onChange?: (value: GridColDef) => void;
}

function ColumnEditor({ value, onChange }: ColumnEditorProps) {
  const handleTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newColumn = { ...value };
    if (!event.target.value) {
      delete newColumn.type;
    } else {
      newColumn.type = event.target.value as GridColType;
    }
    onChange?.(newColumn);
  };
  return (
    <Box>
      <Typography>{value.field}</Typography>
      <TextField
        select
        label="Type"
        size="small"
        value={value.type}
        onChange={handleTypeChange}
        fullWidth
      >
        <MenuItem value="">-</MenuItem>
        <MenuItem value="number">Number</MenuItem>
        <MenuItem value="date">Date</MenuItem>
      </TextField>
    </Box>
  );
}

export interface ColumnsEditorProps {
  value: readonly GridColDef[] | null;
  onChange?: (value: GridColDef[]) => void;
}

export function ColumnsEditor({ value, onChange }: ColumnsEditorProps) {
  const handleChange = (newColumn: GridColDef) => {
    const newColumns = (value ?? []).map((column) =>
      column.field === newColumn.field ? newColumn : column
    );
    onChange?.(newColumns);
  };

  return (
    <Box>
      {Array.from(value ?? [], (column) => {
        return (
          <ColumnEditor
            key={column.field}
            value={column}
            onChange={handleChange}
          />
        );
      })}
    </Box>
  );
}

function fallbackRender({ error }: FallbackProps) {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre style={{ color: "red" }}>{error.message}</pre>
    </div>
  );
}

export const DataGrid: React.ComponentType<MuiDataGridProps> = React.forwardRef<
  HTMLDivElement,
  MuiDataGridProps
>(function DataGrid(props, ref) {
  const [startInput, setStartInput] = React.useState(props);
  const [input, setInput] = React.useState(props);

  const moduleId = (props as Record<string, unknown>)[
    "data-mui-live-module-id"
  ];
  const nodeId: unknown = (props as Record<string, unknown>)[
    "data-mui-live-node-id"
  ];

  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(
    null
  );

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setStartInput(props);
    setInput(props);
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? "simple-popover" : undefined;

  const columns = input.columns || [];

  const handleSaveClick = () => {
    invariant(typeof moduleId === "string", "moduleId is not defined");
    invariant(typeof nodeId === "string", "nodeId is not defined");
    const patches = diff(startInput, input);
    saveNodeProperties(moduleId, nodeId, patches);
    setStartInput(input);
  };

  if (typeof nodeId !== "string" || typeof moduleId !== "string") {
    console.log("@mui/live plugin didn't run");
    return <MuiDataGrid ref={ref} {...props} />;
  }

  return (
    <Box sx={{ height: "100%", position: "relative" }}>
      <ErrorBoundary fallbackRender={fallbackRender} resetKeys={[input]}>
        <MuiDataGrid ref={ref} {...(anchorEl ? input : props)} />
      </ErrorBoundary>
      <Box sx={{ position: "absolute", top: 0, right: 0, p: 1 }}>
        <IconButton size="small" onClick={handleClick}>
          <Editicon fontSize="inherit" />
        </IconButton>
        <Popover
          id={id}
          open={open}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "left",
          }}
        >
          <Box sx={{ width: 250, m: 2 }}>
            <Toolbar disableGutters>
              <Button onClick={handleSaveClick} disabled={input === props}>
                Save
              </Button>
            </Toolbar>
            <ColumnsEditor
              value={columns}
              onChange={(newColumns) => {
                setInput({ ...input, columns: newColumns });
              }}
            />
          </Box>
        </Popover>
      </Box>
    </Box>
  );
});
