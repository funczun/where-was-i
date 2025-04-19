import { saveScrollPosition } from "../services/storage-service.js";
import { restoreScrollPosition } from "../services/restore-service.js";

let scrollTimeout;

window.addEventListener("scroll", () => {
  if (scrollTimeout) clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => {
    saveScrollPosition();
  }, 3000);
});

window.addEventListener("load", () => {
  restoreScrollPosition();
});
