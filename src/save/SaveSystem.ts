import { MapSchemaJSON } from './MapFormat';

const LOCAL_STORAGE_KEY = 'octopath_map_data';

export class SaveSystem {
  /**
   * Saves map schema to browser LocalStorage.
   */
  public static saveToLocalStorage(mapData: MapSchemaJSON): boolean {
    try {
      const jsonStr = JSON.stringify(mapData, null, 2);
      localStorage.setItem(LOCAL_STORAGE_KEY, jsonStr);
      return true;
    } catch (err) {
      console.error('Failed to save map to LocalStorage:', err);
      return false;
    }
  }

  /**
   * Loads map schema from browser LocalStorage if present.
   */
  public static loadFromLocalStorage(): MapSchemaJSON | null {
    try {
      const jsonStr = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (jsonStr) {
        const parsed = JSON.parse(jsonStr) as MapSchemaJSON;
        // Verify schema version 3 (containing portals, enriched kingdom, and props)
        if (((parsed as any).version || 1) < 3) {
          localStorage.removeItem(LOCAL_STORAGE_KEY);
          return null;
        }
        return parsed;
      }
    } catch (err) {
      console.error('Failed to load map from LocalStorage:', err);
    }
    return null;
  }

  /**
   * Exports map data as a downloadable .json file.
   */
  public static exportMapAsFile(mapData: MapSchemaJSON, filename = 'octopath_map.json'): void {
    const jsonStr = JSON.stringify(mapData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Fetches default demo_map.json from /maps/demo_map.json or public directory.
   */
  public static async fetchDemoMap(): Promise<MapSchemaJSON | null> {
    try {
      const response = await fetch('/maps/demo_map.json');
      if (response.ok) {
        const data = await response.json();
        return data as MapSchemaJSON;
      }
    } catch (err) {
      console.warn('Could not fetch /maps/demo_map.json:', err);
    }
    return null;
  }

  /**
   * Clears saved map data from LocalStorage.
   */
  public static clearLocalStorage(): void {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }
}
