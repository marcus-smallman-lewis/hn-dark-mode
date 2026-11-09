// Clicking the toolbar icon cycles Dark -> System -> Light.
// The toolbar icon changes to show the current mode, and open HN tabs update instantly.

const MODES = ["dark", "system", "light"];
const LABELS = { dark: "Dark", system: "System", light: "Light" };
const HN = "https://news.ycombinator.com/*";

async function getMode() {
  const { mode } = await chrome.storage.local.get("mode");
  return MODES.includes(mode) ? mode : "dark";
}

async function showMode(mode) {
  const next = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
  await chrome.action.setIcon({
    path: {
      16: `icons/${mode}16.png`,
      32: `icons/${mode}32.png`,
      48: `icons/${mode}48.png`,
    },
  });
  await chrome.action.setTitle({
    title: `Dark Mode for HN: ${LABELS[mode]} (click for ${LABELS[next]})`,
  });
}

// Tell every open HN tab the new mode directly. This works even if a tab's
// storage listener has gone quiet, which makes the switch feel instant.
async function broadcast(mode) {
  const tabs = await chrome.tabs.query({ url: HN });
  for (const tab of tabs) {
    chrome.tabs.sendMessage(tab.id, { mode }).catch(() => {});
  }
}

// When the extension is installed, updated or reloaded, HN tabs that were already
// open lose contact with it until they're refreshed. Re-attach to them so the
// toolbar button works straight away.
async function reattachOpenTabs() {
  const tabs = await chrome.tabs.query({ url: HN });
  for (const tab of tabs) {
    const target = { tabId: tab.id };
    chrome.scripting.insertCSS({ target, files: ["dark.css"] }).catch(() => {});
    chrome.scripting.executeScript({ target, files: ["content.js"] }).catch(() => {});
  }
}

chrome.action.onClicked.addListener(async () => {
  const mode = await getMode();
  const next = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
  await chrome.storage.local.set({ mode: next });
  await showMode(next);
  await broadcast(next);
});

chrome.runtime.onInstalled.addListener(async () => {
  await showMode(await getMode());
  await reattachOpenTabs();
});
chrome.runtime.onStartup.addListener(async () => showMode(await getMode()));
