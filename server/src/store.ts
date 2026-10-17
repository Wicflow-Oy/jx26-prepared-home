// JSON-file store for STORE_MODE=file (CONTRACTS §5): Homes and CheckRecords only, never image bytes.

import { promises as fs } from "node:fs";
import path from "node:path";
import type { CheckRecord, Home } from "@prepared-home/engine";

export interface StoreData {
  homes: Home[];
  records: CheckRecord[];
}

export class FileStore {
  private data: StoreData = { homes: [], records: [] };
  private writing: Promise<void> = Promise.resolve();

  constructor(readonly file: string) {}

  /** Loads the file if it exists. A corrupt file is kept aside (renamed), never silently overwritten. */
  async load(): Promise<void> {
    let raw: string;
    try {
      raw = await fs.readFile(this.file, "utf8");
    } catch {
      this.data = { homes: [], records: [] };
      return;
    }
    try {
      const parsed = JSON.parse(raw) as Partial<StoreData>;
      this.data = {
        homes: Array.isArray(parsed.homes) ? parsed.homes : [],
        records: Array.isArray(parsed.records) ? parsed.records : [],
      };
    } catch {
      const aside = `${this.file}.corrupt-${Date.now()}`;
      await fs.rename(this.file, aside);
      this.data = { homes: [], records: [] };
    }
  }

  /** Puts the demo homes and their records back to the engine's DEMO state; other homes are untouched. */
  async seedDemo(demo: StoreData): Promise<void> {
    const ids = new Set(demo.homes.map((h) => h.homeId));
    this.data.homes = [
      ...this.data.homes.filter((h) => !ids.has(h.homeId)),
      ...demo.homes.map((h) => ({ ...h, demo: true })),
    ];
    this.data.records = [
      ...this.data.records.filter((r) => !ids.has(r.homeId)),
      ...demo.records.filter((r) => ids.has(r.homeId)),
    ];
    await this.save();
  }

  async resetHome(homeId: string, demo: StoreData): Promise<void> {
    this.data.records = [
      ...this.data.records.filter((r) => r.homeId !== homeId),
      ...demo.records.filter((r) => r.homeId === homeId),
    ];
    await this.save();
  }

  homes(): Home[] {
    return [...this.data.homes];
  }

  getHome(homeId: string): Home | null {
    return this.data.homes.find((h) => h.homeId === homeId) ?? null;
  }

  async addHome(home: Home): Promise<void> {
    this.data.homes.push(home);
    await this.save();
  }

  records(homeId: string): CheckRecord[] {
    return this.data.records.filter((r) => r.homeId === homeId);
  }

  /**
   * Appends to the home's history. The engine's effectiveRecords picks the record that counts
   * (a later retake never undoes a finished result). History is capped per home.
   */
  async putRecord(record: CheckRecord, maxPerHome = 500): Promise<void> {
    this.data.records.push(record);
    const mine = this.data.records.filter((r) => r.homeId === record.homeId);
    if (mine.length > maxPerHome) {
      const drop = new Set(mine.slice(0, mine.length - maxPerHome));
      this.data.records = this.data.records.filter((r) => !drop.has(r));
    }
    await this.save();
  }

  private save(): Promise<void> {
    const snapshot = JSON.stringify(this.data, null, 2);
    this.writing = this.writing
      .catch(() => undefined)
      .then(async () => {
        await fs.mkdir(path.dirname(this.file), { recursive: true });
        const tmp = `${this.file}.${process.pid}.tmp`;
        await fs.writeFile(tmp, `${snapshot}\n`, "utf8");
        await fs.rename(tmp, this.file);
      });
    return this.writing;
  }
}
