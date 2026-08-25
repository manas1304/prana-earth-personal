import { settingsStore, PlatformSettings } from "@/core/database/settings-store";

export const platformContentService = {
  /**
   * Retrieves the current system content metrics display configuration.
   * Covers all sections: Global Impact Totals, Regional Coverage, Ecosystem Data, Marketplace Stats.
   */
  async getMetrics(): Promise<PlatformSettings> {
    return settingsStore.get();
  },

  /**
   * Saves new display metrics. Accepts partial updates — only passed fields are changed.
   */
  async updateMetrics(data: Partial<PlatformSettings>): Promise<PlatformSettings> {
    return settingsStore.save(data);
  },
};
