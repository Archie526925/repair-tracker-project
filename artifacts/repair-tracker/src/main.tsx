import { createRoot } from "react-dom/client";
import { setBaseUrl } from "../../../lib/api-client-react/src";
import App from "./App";
import "./index.css";

// 請將下方的網址替換為你在 Render 複製的正式後端網址
setBaseUrl("https://repair-tracker-project.onrender.com");

createRoot(document.getElementById("root")!).render(<App />);