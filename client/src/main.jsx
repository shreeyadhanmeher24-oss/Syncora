
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

import { inspectQueue } from "./db/debugQueue";
import "./services/syncService";

window.inspectSyncoraQueue = inspectQueue;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => {
        console.log("Syncora offline support registered!");
      })
      .catch((error) => {
        console.error(
          "Service worker registration failed:",
          error
        );
      });
  });
}
