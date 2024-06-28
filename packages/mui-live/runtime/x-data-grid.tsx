import * as React from "react";
import { GridColDef, GridColType } from "@mui/x-data-grid";
export * from "@mui/x-data-grid";
import { Box, MenuItem, TextField, Typography } from "@mui/material";

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
        value={value.type ?? ""}
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
