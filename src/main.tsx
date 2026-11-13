import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import PWA from "./components/PWA";
import "./fonts.css";
import "./style.css";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <HashRouter>
    <App />
    <PWA />
  </HashRouter>,
);
