import * as React from "react";
import {
  GridColDef,
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
import { saveNodeProperties } from ".";
import invariant from "invariant";

interface ColumnEditorProps {
  value: GridColDef;
  onChange?: (value: GridColDef) => void;
}

function ColumnEditor({ value, onChange }: ColumnEditorProps) {
  const handleTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.({
      ...value,
      type: event.target.value ?? undefined,
    });
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
  const [input, setInput] = React.useState(props);
  React.useEffect(() => {
    setInput(props);
  }, [props]);

  const nodeId: string | undefined = props["data-mui-live-node-id"];

  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(
    null
  );

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setInput(props);
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? "simple-popover" : undefined;

  const columns = input.columns || [];

  const handleSaveClick = () => {
    invariant(nodeId, "nodeId is not defined");
    const { columns } = input;
    saveNodeProperties(nodeId, { columns });
  };

  if (!nodeId) {
    console.log("@mui/live plugin didn't run");
    return <MuiDataGrid ref={ref} {...input} />;
  }

  return (
    <Box sx={{ height: "100%", position: "relative" }}>
      <ErrorBoundary fallbackRender={fallbackRender} resetKeys={[input]}>
        <MuiDataGrid ref={ref} {...input} />
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
            {Array.from(columns, (column) => {
              return (
                <ColumnEditor
                  key={column.field}
                  value={column}
                  onChange={(value) => {
                    setInput({
                      ...input,
                      columns: columns.map((col) =>
                        col.field === column.field ? value : col
                      ),
                    });
                  }}
                />
              );
            })}
          </Box>
        </Popover>
      </Box>
    </Box>
  );
});
