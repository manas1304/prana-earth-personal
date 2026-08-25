import fs from "fs";
import path from "path";

export interface PlatformSettings {
  // Global Impact Totals
  totalCarbonSaved: string;
  ethicalProductsVerified: string;
  totalVerifiedProjects: string;

  // Regional Coverage (Pan-India)
  statesMonitored: string;
  utsCovered: string;
  activeMonitoringNodes: string;

  // Ecosystem Data
  rainforests: string;
  wetlands: string;
  islands: string;
  biodiversityIndex: number;

  // Marketplace Stats
  totalActiveListings: string;
  totalSavesGlobal: string;
  dprInquiriesMonth: string;
}

const SETTINGS_FILE_PATH = path.join(
  process.cwd(),
  "src/core/database/settings.json"
);

const DEFAULT_SETTINGS: PlatformSettings = {
  totalCarbonSaved: "124580",
  ethicalProductsVerified: "88.4",
  totalVerifiedProjects: "412",
  statesMonitored: "28",
  utsCovered: "8",
  activeMonitoringNodes: "1450",
  rainforests: "12",
  wetlands: "24",
  islands: "8",
  biodiversityIndex: 8.4,
  totalActiveListings: "1842",
  totalSavesGlobal: "25600",
  dprInquiriesMonth: "142",
};

export const settingsStore = {
  get(): PlatformSettings {
    try {
      if (!fs.existsSync(SETTINGS_FILE_PATH)) {
        const dir = path.dirname(SETTINGS_FILE_PATH);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(
          SETTINGS_FILE_PATH,
          JSON.stringify(DEFAULT_SETTINGS, null, 2),
          "utf-8"
        );
        return DEFAULT_SETTINGS;
      }

      const content = fs.readFileSync(SETTINGS_FILE_PATH, "utf-8");
      // Merge with default values in case keys are missing
      return {
        ...DEFAULT_SETTINGS,
        ...JSON.parse(content),
      };
    } catch (error) {
      console.error("Failed to read settings from store:", error);
      return DEFAULT_SETTINGS;
    }
  },

  save(data: Partial<PlatformSettings>): PlatformSettings {
    try {
      const current = this.get();
      const updated = {
        ...current,
        ...data,
      };

      const dir = path.dirname(SETTINGS_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(
        SETTINGS_FILE_PATH,
        JSON.stringify(updated, null, 2),
        "utf-8"
      );
      return updated;
    } catch (error) {
      console.error("Failed to save settings to store:", error);
      throw new Error("Unable to save settings configuration.");
    }
  },
};
