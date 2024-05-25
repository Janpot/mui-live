import * as React from "react";
import {
  DataGrid as MuiDataGrid,
  DataGridProps as MuiDataGridProps,
} from "@mui/x-data-grid";
export * from "@mui/x-data-grid";
import { Box, IconButton, Popover, Typography } from "@mui/material";
import Editicon from "@mui/icons-material/Edit";

export const DataGrid: React.ComponentType<MuiDataGridProps> = React.forwardRef<
  HTMLDivElement,
  MuiDataGridProps
>(function DataGrid(props, ref) {
  console.log("joow", props["data-mui-live-node-id"]);
  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(
    null
  );

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? "simple-popover" : undefined;

  return (
    <Box sx={{ position: "relative" }}>
      <MuiDataGrid ref={ref} {...props} />
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
          <Typography sx={{ p: 2 }}>The content of the Popover.</Typography>
        </Popover>
      </Box>
    </Box>
  );
});
