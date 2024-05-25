import * as React from "react";
import { DataGrid } from "../runtime/x-data-grid";
import { Container, Typography } from "@mui/material";

const ROWS = [
  { id: 123, name: "Joaquin Sorolla" },
  { id: 456, name: "Francisco de Goya" },
  { id: 789, name: "Pablo Picasso" },
];

function App() {
  return (
    <Container>
      <Typography variant="h2">My MUI app</Typography>
      <DataGrid rows={ROWS} columns={[{ field: "id" }, { field: "name" }]} />
    </Container>
  );
}

export default App;
