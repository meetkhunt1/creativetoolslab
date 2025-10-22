// tool.js
import { initApp } from "./modules/app.js";

// keep behavior identical; run once DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
