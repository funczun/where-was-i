import { SavedSite, ScrollData } from "./types";

export async function saveSiteInfoToStorage(
  title: string,
  url: string,
  scroll: number,
  height: number
): Promise<void> {
  const lastAccessed = Date.now();
  const progress = Math.min(scroll / height, 1);

  const {
    savedSites = [],
    scrollData = {},
  }: { savedSites?: SavedSite[]; scrollData?: ScrollData } =
    await chrome.storage.sync.get(["savedSites", "scrollData"]);

  const existingIndex = savedSites.findIndex((site) => site.url === url);
  const status = progress >= 0.95 ? "pendingDelete" : "active";

  if (existingIndex !== -1) {
    savedSites[existingIndex].lastAccessed = lastAccessed;
    savedSites[existingIndex].title = title;
    savedSites[existingIndex].status = status;
  } else if (existingIndex == -1) {
    savedSites.push({ title, url, lastAccessed });
  }

  scrollData[url] = { scroll, height };

  await chrome.storage.sync.set({ savedSites, scrollData });
}

export async function getSavedSitesAndScrollData(): Promise<{
  savedSites: SavedSite[];
  scrollData: ScrollData;
}> {
  return await chrome.storage.sync.get(["savedSites", "scrollData"]);
}
