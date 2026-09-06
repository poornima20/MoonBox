/* ==========================================================
   MOONBOX PWA
========================================================== */

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .then((registration) => {
        console.log(
          "MoonBox PWA: service worker registered",
          registration.scope,
        );
      })
      .catch((error) => {
        console.error("MoonBox PWA: service worker registration failed", error);
      });
  });
}
