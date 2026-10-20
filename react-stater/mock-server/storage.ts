import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Robust Asynchronous Mutex for serializing read-modify-write operations per domain.
 */
class AsyncLock {
  private queue: Array<() => void> = [];
  private locked = false;

  async acquire(): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      return;
    }
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      next?.();
    } else {
      this.locked = false;
    }
  }
}

export class JsonStorageEngine {
  private seedsDir: string;
  private runtimeDir: string;
  private locks: Map<string, AsyncLock> = new Map();

  constructor(customRuntimeDir?: string, customSeedsDir?: string) {
    this.seedsDir = customSeedsDir || process.env.MOCK_SEEDS_DIR || path.resolve(__dirname, '../mock-data/seeds');
    this.runtimeDir = customRuntimeDir || process.env.MOCK_RUNTIME_DIR || path.resolve(__dirname, '../mock-data/runtime');
  }

  private getLock(domain: string): AsyncLock {
    const key = domain.toLowerCase();
    if (!this.locks.has(key)) {
      this.locks.set(key, new AsyncLock());
    }
    return this.locks.get(key)!;
  }

  /**
   * Serializes an asynchronous operation on a specific domain file.
   */
  private async withFileLock<T>(domain: string, operation: () => Promise<T>): Promise<T> {
    const lock = this.getLock(domain);
    await lock.acquire();
    try {
      return await operation();
    } finally {
      lock.release();
    }
  }

  public getRuntimeFilePath(domain: string): string {
    const cleanDomain = domain.replace(/\.json$/, '');
    return path.join(this.runtimeDir, `${cleanDomain}.json`);
  }

  public getSeedFilePath(domain: string): string {
    const cleanDomain = domain.replace(/\.json$/, '');
    return path.join(this.seedsDir, `${cleanDomain}.json`);
  }

  /**
   * Initializes runtime data from seed fixtures on first run.
   * If a runtime file already exists, it is preserved across server restarts.
   */
  public async initialize(): Promise<{ initialized: string[]; preserved: string[] }> {
    if (!fs.existsSync(this.runtimeDir)) {
      await fs.promises.mkdir(this.runtimeDir, { recursive: true });
    }

    const initialized: string[] = [];
    const preserved: string[] = [];

    if (!fs.existsSync(this.seedsDir)) {
      console.warn(`[MockStorage] Seeds directory not found: ${this.seedsDir}`);
      return { initialized, preserved };
    }

    const seedFiles = await fs.promises.readdir(this.seedsDir);
    for (const file of seedFiles) {
      if (!file.endsWith('.json')) continue;

      const runtimePath = path.join(this.runtimeDir, file);
      const seedPath = path.join(this.seedsDir, file);

      if (!fs.existsSync(runtimePath)) {
        await fs.promises.copyFile(seedPath, runtimePath);
        initialized.push(file);
      } else {
        preserved.push(file);
      }
    }

    return { initialized, preserved };
  }

  /**
   * Explicitly resets all runtime data back to seed fixtures.
   * Must only be triggered by an authorized developer action.
   */
  public async resetToSeeds(): Promise<string[]> {
    if (!fs.existsSync(this.seedsDir)) {
      throw new Error(`Cannot reset: Seeds directory does not exist at ${this.seedsDir}`);
    }

    if (!fs.existsSync(this.runtimeDir)) {
      await fs.promises.mkdir(this.runtimeDir, { recursive: true });
    }

    const seedFiles = await fs.promises.readdir(this.seedsDir);
    const restored: string[] = [];

    for (const file of seedFiles) {
      if (!file.endsWith('.json')) continue;

      const domain = file.replace('.json', '');
      await this.withFileLock(domain, async () => {
        const seedPath = path.join(this.seedsDir, file);
        const runtimePath = path.join(this.runtimeDir, file);
        await fs.promises.copyFile(seedPath, runtimePath);
        restored.push(file);
      });
    }

    return restored;
  }

  /**
   * Internal un-locked read helper. Assumes caller holds domain lock if part of write.
   */
  private async readInternal<T>(domain: string): Promise<T[]> {
    const filePath = this.getRuntimeFilePath(domain);

    if (!fs.existsSync(filePath)) {
      const seedPath = this.getSeedFilePath(domain);
      if (fs.existsSync(seedPath)) {
        await fs.promises.copyFile(seedPath, filePath);
      } else {
        return [] as T[];
      }
    }

    const content = await fs.promises.readFile(filePath, 'utf8');
    try {
      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed)) {
        throw new Error(`Invalid format in ${filePath}: expected array, got ${typeof parsed}`);
      }
      return parsed as T[];
    } catch (err: unknown) {
      if (err instanceof SyntaxError) {
        const corruptBackup = `${filePath}.corrupt.${Date.now()}`;
        await fs.promises.copyFile(filePath, corruptBackup);
        console.error(`[MockStorage] CORRUPT JSON in ${filePath}. Backed up to ${corruptBackup}`);
        throw new Error(
          `Corrupted JSON detected in domain '${domain}'. Backup created at ${corruptBackup}. Error: ${err.message}`,
          { cause: err }
        );
      }
      throw err;
    }
  }

  /**
   * Performs an atomic write using a temporary file and atomic rename.
   */
  private async atomicWrite<T>(domain: string, data: T[]): Promise<void> {
    const filePath = this.getRuntimeFilePath(domain);
    const tmpPath = `${filePath}.tmp.${Date.now()}`;

    const jsonString = JSON.stringify(data, null, 2);
    await fs.promises.writeFile(tmpPath, jsonString, 'utf8');

    // Verify written file is non-empty before renaming
    const stats = await fs.promises.stat(tmpPath);
    if (stats.size === 0) {
      await fs.promises.unlink(tmpPath).catch(() => {});
      throw new Error(`Atomic write failed: written temp file for '${domain}' was empty`);
    }

    await fs.promises.rename(tmpPath, filePath);
  }

  /**
   * Reads and parses a JSON domain file from the runtime directory.
   */
  public async read<T>(domain: string): Promise<T[]> {
    return this.withFileLock(domain, async () => {
      return this.readInternal<T>(domain);
    });
  }

  /**
   * Retrieves all records for a domain.
   */
  public async getAll<T>(domain: string): Promise<T[]> {
    return this.read<T>(domain);
  }

  /**
   * Retrieves a single record by ID.
   */
  public async getById<T extends { id: string }>(domain: string, id: string): Promise<T | null> {
    return this.withFileLock(domain, async () => {
      const items = await this.readInternal<T>(domain);
      return items.find((item) => item.id === id) || null;
    });
  }

  /**
   * Creates a new record with concurrent lock and atomic write.
   */
  public async create<T extends { id: string }>(domain: string, item: T): Promise<T> {
    return this.withFileLock(domain, async () => {
      const items = await this.readInternal<T>(domain);
      const exists = items.some((existing) => existing.id === item.id);
      if (exists) {
        throw new Error(`Record with id '${item.id}' already exists in domain '${domain}'`);
      }
      items.push(item);
      await this.atomicWrite<T>(domain, items);
      return item;
    });
  }

  /**
   * Updates an existing record with serialized lock and atomic write.
   */
  public async update<T extends { id: string }>(
    domain: string,
    id: string,
    updater: (item: T) => T
  ): Promise<T | null> {
    return this.withFileLock(domain, async () => {
      const items = await this.readInternal<T>(domain);
      const index = items.findIndex((item) => item.id === id);
      if (index === -1) {
        return null;
      }
      const updated = updater(items[index]);
      // Ensure ID cannot be accidentally modified
      updated.id = id;
      items[index] = updated;
      await this.atomicWrite<T>(domain, items);
      return updated;
    });
  }

  /**
   * Updates multiple records atomically in a batch with serialized lock.
   */
  public async updateBatch<T extends { id: string }>(
    domain: string,
    updater: (items: T[]) => T[]
  ): Promise<T[]> {
    return this.withFileLock(domain, async () => {
      const items = await this.readInternal<T>(domain);
      const updatedItems = updater(items);
      await this.atomicWrite<T>(domain, updatedItems);
      return updatedItems;
    });
  }

  /**
   * Overwrites all records for a domain atomically with serialized lock.
   */
  public async writeAll<T>(domain: string, data: T[]): Promise<void> {
    return this.withFileLock(domain, async () => {
      await this.atomicWrite<T>(domain, data);
    });
  }

  /**
   * Deletes a record with serialized lock and atomic write.
   */
  public async delete<T extends { id: string }>(domain: string, id: string): Promise<boolean> {
    return this.withFileLock(domain, async () => {
      const items = await this.readInternal<T>(domain);
      const index = items.findIndex((item) => item.id === id);
      if (index === -1) {
        return false;
      }
      items.splice(index, 1);
      await this.atomicWrite<T>(domain, items);
      return true;
    });
  }
}

export const storage = new JsonStorageEngine();
