import { DataGrid } from "@mui/x-data-grid";
import { Box, Container, Typography } from "@mui/material";

const ROWS = [
  { id: 123, name: "Joaquin Sorolla" },
  { id: 456, name: "Francisco de Goya" },
  { id: 789, name: "Pablo Picasso" },
];

function App() {
  return (
    <Container>
      <div style={{ display: "flex" }}>
        <Typography variant="h3">Test</Typography>
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
