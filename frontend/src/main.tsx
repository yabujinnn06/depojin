import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./lib/auth";
import { ToastSaglayici } from "./lib/toast";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ToastSaglayici>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastSaglayici>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
