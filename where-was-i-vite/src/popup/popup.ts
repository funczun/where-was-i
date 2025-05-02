import {
  saveSiteInfoToStorage,
  getSavedSitesAndPageData,
} from "../services/url-storage-service";
import { SavedSite, PageData } from "../services/types";
import { deleteSite } from "../services/delete-service";
import {
  calculateRetention,
  getTextColor,
} from "../services/retention-service";

async function loadSavedSites() {
  const {
    savedSites = [],
    pageData = {},
  }: { savedSites: SavedSite[]; pageData: PageData } =
    await getSavedSitesAndPageData();

  const siteList = document.getElementById("siteList");
  if (!siteList) return;

  siteList.innerHTML = "";

  savedSites.forEach((site) => {
    const scrollInfo = pageData[site.url] || {
      scroll: 0,
      height: 1,
      viewport: window.innerHeight,
    };
    const progress = Math.min(
      scrollInfo.scroll / (scrollInfo.height - scrollInfo.viewport),
      1
    );

    const retentionRate = calculateRetention(site.lastAccessed);
    const textColor = getTextColor(retentionRate * 100);

    const entry = document.createElement("div");
    entry.className = "site-item";

    const isPendingDelete = site.status === "pendingDelete";

    const titleContainer = document.createElement("div");
    titleContainer.className = "title-container";

    const link = document.createElement("a");
    link.href = site.url;
    link.className = "site-link";
    link.innerText = site.title;
    link.target = "_blank";
    link.title = site.title;
    link.style.color = textColor;

    const deleteBtn = document.createElement("button");
    deleteBtn.innerText = "✕";
    deleteBtn.className = "delete-button";
    deleteBtn.onclick = async () => {
      await deleteSite(site.url);
      await updateUI();
    };

    const progressBar = document.createElement("div");
    progressBar.className = "progress-bar";

    const filled = document.createElement("div");
    filled.className = "progress-filled";
    filled.style.width = `${progress * 100}%`;

    titleContainer.appendChild(link);
    titleContainer.appendChild(deleteBtn);
    entry.appendChild(titleContainer);
    progressBar.appendChild(filled);
    entry.appendChild(progressBar);

    if (isPendingDelete) {
      entry.style.filter = "grayscale(100%)";
    }

    siteList.appendChild(entry);
  });
}

async function updateUI() {
  await loadSavedSites();

  const usageText = await getStorageUsageText();
  const usageDiv = document.getElementById("storage-usage");
  if (usageDiv) {
    usageDiv.textContent = usageText;
  }
}

async function saveCurrentSite() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id || !tab.url || !tab.url.startsWith("http")) return;

  const [{ result }] = await chrome.scripting.executeScript<
    [],
    {
      title: string;
      url: string;
      scroll: number;
      height: number;
      viewport: number;
    }
  >({
    target: { tabId: tab.id },
    func: () => {
      return {
        title: document.title,
        url: window.location.href,
        scroll: window.scrollY,
        height: document.documentElement.scrollHeight,
        viewport: window.innerHeight,
      };
    },
  });

  if (!result) return; // undefined

  const { title, url, scroll, height, viewport } = result;
  await saveSiteInfoToStorage(title, url, scroll, height, viewport);
  await updateUI();
}

function getStorageUsageText(): Promise<string> {
  return new Promise((resolve) => {
    const MAX_BYTES = 102400;
    chrome.storage.sync.getBytesInUse(null, (usedBytes) => {
      const usedKB = (usedBytes / 1024).toFixed(2);
      const remainingKB = ((MAX_BYTES - usedBytes) / 1024).toFixed(2);
      resolve(`사용 중: ${usedKB}KB / 남은 용량: ${remainingKB}KB`);
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const saveButton = document.getElementById("saveButton");
  if (saveButton) {
    saveButton.addEventListener("click", saveCurrentSite);
  }

  await updateUI();
});
