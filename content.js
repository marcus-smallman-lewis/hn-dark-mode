// Decides whether the dark theme is on, before the page is first drawn.
// Modes: "dark" (default), "system" (follow the OS), "light".
//
// chrome.storage is async, so reading it alone would be too late for the first draw.
// We keep a copy of the mode in HN's localStorage, which can be read instantly,
// and sync it from chrome.storage straight after.
//
// Wrapped in a block so it's safe to run again in the same tab (the background
// script re-attaches to open tabs after an install or update).
{
  const KEY = "hnn-mode";
  const root = document.documentElement;
  const osDark = matchMedia("(prefers-color-scheme: dark)");

  let mode = "dark";
  try {
    mode = localStorage.getItem(KEY) || "dark";
  } catch {}

  const apply = () => {
    const dark = mode === "dark" || (mode === "system" && osDark.matches);
    root.classList.toggle("hnn-off", !dark);
  };

  const setMode = (next) => {
    if (!next || next === mode) return;
    mode = next;
    try {
      localStorage.setItem(KEY, mode);
    } catch {}
    apply();
  };

  apply();
  osDark.addEventListener("change", apply);

  // Two ways to hear about mode changes: a direct message from the toolbar button,
  // and storage changes (covers anything the message misses).
  chrome.runtime.onMessage.addListener((msg) => setMode(msg && msg.mode));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.mode) setMode(changes.mode.newValue);
  });
  chrome.storage.local.get("mode", (data) => setMode(data.mode));
}
