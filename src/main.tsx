import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { MuiLive } from "@mui/live/runtime";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MuiLive>
      <App />
    </MuiLive>
  </React.StrictMode>
);
