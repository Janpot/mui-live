import * as React from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Container, Typography } from "@mui/material";

const COLUMNS = [{ field: "name" }];

const ROWS = [
  { id: 123, name: "Joaquin Sorolla" },
  { id: 456, name: "Francisco de Goya" },
  { id: 789, name: "Pablo Picasso" },
];

function App() {
  const [state, setState] = React.useState(0);
  React.useEffect(() => {
    const interval = setInterval(() => {
      setState((state) => state + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  return (
    <Container>
      <Typography variant="h2">My MUI app</Typography>
      <DataGrid rows={ROWS} columns={COLUMNS} />
    </Container>
  );
}

export default App;
