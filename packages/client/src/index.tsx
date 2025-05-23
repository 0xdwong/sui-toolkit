import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "@mysten/dapp-kit/dist/index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import "./i18n/i18n"; // Import i18n configuration

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement,
);
root.render(
  <React.StrictMode>
    <Suspense fallback="Loading...">
      <App />
    </Suspense>
  </React.StrictMode>,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
