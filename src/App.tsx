import * as React from "react";
import { DataGrid } from "../runtime/x-data-grid";
import { Box, Container, Typography } from "@mui/material";

const ROWS = [
  { id: 123, name: "Joaquin Sorolla" },
  { id: 456, name: "Francisco de Goya" },
  { id: 789, name: "Pablo Picasso" },
];

function App() {
  return (
    <Container>
      <Typography variant="h2">My app</Typography>
      <Box sx={{ height: 300 }}>
        <DataGrid rows={ROWS} columns={[{ field: "id" }, { field: "name" }]} />
      </Box>
    </Container>
  );
}

export default App;
