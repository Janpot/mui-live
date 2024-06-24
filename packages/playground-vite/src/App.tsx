import { DataGrid } from "@mui/x-data-grid";
import { Box, Container, Typography } from "@mui/material";
import * as React from "react";

const ROWS = [
  { id: 123, name: "Joaquin Sorolla" },
  { id: 456, name: "Francisco de Goya" },
  { id: 789, name: "Pablo Picasso" },
];

function App() {
  const ref = React.useRef(null);
  return (
    <Container>
      <div ref={ref}>
        <Typography variant="h2">My app</Typography>
        <Box sx={{ height: 300 }}>
          <DataGrid
            rows={ROWS}
            columns={[{ field: "id", type: "number" }, { field: "name" }]}
          />
        </Box>
      </div>
    </Container>
  );
}

export default App;
