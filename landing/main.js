const APP_PATH = "/app/";

// Phones get the app itself, full screen; the framed preview only makes sense on larger screens.
// The path check avoids a reload loop if the server ever answers /app/ with this page.
if (matchMedia("(max-width: 500px)").matches && location.pathname !== APP_PATH) {
  location.replace(APP_PATH);
} else {
  document.addEventListener("DOMContentLoaded", () => {
    const url = new URL(APP_PATH, location.origin).href;
    const link = document.getElementById("app-url");
    link.href = url;
    link.textContent = url.replace(/^https?:\/\//, "");
  });
}
