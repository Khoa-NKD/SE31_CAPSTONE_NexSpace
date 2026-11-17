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
   * Serializes an asynchronous operation on a specific domain file or workflow.
   */
  public async withLock<T>(domain: string, operation: () => Promise<T>): Promise<T> {
    const lock = this.getLock(domain);
    await lock.acquire();
    try {
      return await operation();
    } finally {
      lock.release();
    }
  }

  private async withFileLock<T>(domain: string, operation: () => Promise<T>): Promise<T> {
    return this.withLock(domain, operation);
  }

  public getUploadsDir(): string {
    const dir = path.join(this.runtimeDir, 'uploads');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
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
        if (file === 'workspaces.json') {
          await this.diagnoseWorkspacesSchema(runtimePath);
        }
        preserved.push(file);
      }
    }

    return { initialized, preserved };
  }

  /**
   * Diagnostic inspection of workspaces.json schema without writing or modifying files.
   * Reports presence of legacy schema records requiring explicit migration.
   */
  public async diagnoseWorkspacesSchema(runtimePath?: string): Promise<{
    needsMigration: boolean;
    totalRecords: number;
    legacyRecordsCount: number;
    diagnostics: string[];
  }> {
    const targetPath = runtimePath || this.getRuntimeFilePath('workspaces');
    const diagnostics: string[] = [];

    if (!fs.existsSync(targetPath)) {
      return { needsMigration: false, totalRecords: 0, legacyRecordsCount: 0, diagnostics: ['Runtime workspaces file does not exist.'] };
    }

    try {
      const raw = await fs.promises.readFile(targetPath, 'utf8');
      const records = JSON.parse(raw);
      if (!Array.isArray(records)) {
        diagnostics.push('Runtime workspaces.json is not an array.');
        return { needsMigration: false, totalRecords: 0, legacyRecordsCount: 0, diagnostics };
      }

      let legacyCount = 0;
      for (const r of records) {
        if (!r.reviewStatus || !r.operatingStatus || !r.moderationStatus || !r.organizerId) {
          legacyCount++;
        }
      }

      if (legacyCount > 0) {
        diagnostics.push(
          `Detected ${legacyCount} of ${records.length} Workspace record(s) with legacy schema. Automatic migration disabled to protect working data.`
        );
        console.warn(
          `[MockStorage] Diagnostic: Detected ${legacyCount} Workspace record(s) with legacy schema in ${path.basename(targetPath)}. Automatic migration is disabled. Run "npm run mock:migrate:workspaces -- --dry-run" to preview or "npm run mock:migrate:workspaces" to execute explicit migration.`
        );
      }

      return {
        needsMigration: legacyCount > 0,
        totalRecords: records.length,
        legacyRecordsCount: legacyCount,
        diagnostics
      };
    } catch (err: unknown) {
      diagnostics.push(`Failed to parse runtime workspaces: ${err instanceof Error ? err.message : String(err)}`);
      return { needsMigration: false, totalRecords: 0, legacyRecordsCount: 0, diagnostics };
    }
  }

  /**
   * Explicit, developer-authorized migration for workspaces runtime data.
   * Supports dry-run preview and creates timestamped non-overwriting backup.
   */
  public async migrateWorkspacesExplicitly(options?: {
    dryRun?: boolean;
    customRuntimePath?: string;
    customSeedPath?: string;
  }): Promise<{
    migrated: boolean;
    dryRun: boolean;
    totalRecords: number;
    migratedCount: number;
    backupPath?: string;
    diagnostics: string[];
  }> {
    const dryRun = options?.dryRun ?? false;
    const runtimePath = options?.customRuntimePath || this.getRuntimeFilePath('workspaces');
    const seedPath = options?.customSeedPath || this.getSeedFilePath('workspaces');
    const diagnostics: string[] = [];

    if (!fs.existsSync(runtimePath)) {
      throw new Error(`Migration aborted: runtime file does not exist at ${runtimePath}`);
    }

    const rawRuntime = await fs.promises.readFile(runtimePath, 'utf8');
    const runtimeRecords = JSON.parse(rawRuntime);
    if (!Array.isArray(runtimeRecords)) {
      throw new Error(`Migration aborted: runtime data in ${runtimePath} is not an array`);
    }

    const legacyRecords = runtimeRecords.filter(
      (r) => !r.reviewStatus || !r.operatingStatus || !r.moderationStatus || !r.organizerId
    );

    if (legacyRecords.length === 0) {
      diagnostics.push('All records already adhere to canonical schema. No migration required (idempotent).');
      return {
        migrated: false,
        dryRun,
        totalRecords: runtimeRecords.length,
        migratedCount: 0,
        diagnostics
      };
    }

    // Build seed lookup map
    let seedMap = new Map<string, any>();
    if (fs.existsSync(seedPath)) {
      try {
        const rawSeed = await fs.promises.readFile(seedPath, 'utf8');
        const seedRecords: any[] = JSON.parse(rawSeed);
        for (const s of seedRecords) {
          if (s.id) seedMap.set(s.id.toLowerCase(), s);
          if (s.workspaceCode) seedMap.set(s.workspaceCode.toLowerCase(), s);
          if (Array.isArray(s.legacyAliases)) {
            for (const a of s.legacyAliases) seedMap.set(a.toLowerCase(), s);
          }
        }
      } catch {
        diagnostics.push('Seed file could not be parsed; proceeding with fallback defaults.');
      }
    }

    const migratedRecords = runtimeRecords.map((r: any) => {
      const seed = seedMap.get(r.id?.toLowerCase()) || {};
      const reviewStatus = r.reviewStatus || (r.status === 'pending' ? 'Pending' : r.status === 'active' ? 'Approved' : 'Draft');
      const moderationStatus = r.moderationStatus || (r.status === 'suspended' ? 'Suspended' : 'Normal');
      const operatingStatus = r.operatingStatus || (r.status === 'suspended' ? 'Active' : r.status === 'active' ? 'Active' : 'Inactive');

      return {
        ...seed,
        ...r,
        organizerId: r.organizerId || seed.organizerId || 'USR-9432',
        reviewStatus,
        operatingStatus,
        moderationStatus,
        isListingVisible: r.isListingVisible ?? (reviewStatus === 'Approved' && operatingStatus === 'Active' && moderationStatus === 'Normal'),
        legacyAliases: r.legacyAliases || seed.legacyAliases || [],
        version: r.version || 1
      };
    });

    // Validate post-migration records
    for (const rec of migratedRecords) {
      if (!rec.id || typeof rec.id !== 'string') {
        throw new Error('Migration failed post-validation: record missing valid id');
      }
      if (!rec.organizerId) {
        throw new Error(`Migration failed post-validation: record ${rec.id} missing organizerId`);
      }
    }

    if (dryRun) {
      diagnostics.push(`[DryRun] Would migrate ${legacyRecords.length} of ${runtimeRecords.length} records in ${path.basename(runtimePath)}.`);
      return {
        migrated: false,
        dryRun: true,
        totalRecords: runtimeRecords.length,
        migratedCount: legacyRecords.length,
        diagnostics
      };
    }

    // Explicit migration: create timestamped non-overwriting backup
    const timestamp = Date.now();
    const backupPath = `${runtimePath}.bak.${timestamp}`;
    await fs.promises.copyFile(runtimePath, backupPath);
    diagnostics.push(`Created timestamped backup at ${path.basename(backupPath)}`);

    // Write migrated file atomically
    const domain = 'workspaces';
    await this.withFileLock(domain, async () => {
      const tmpPath = `${runtimePath}.tmp.${Date.now()}`;
      await fs.promises.writeFile(tmpPath, JSON.stringify(migratedRecords, null, 2) + '\n', 'utf8');
      await fs.promises.rename(tmpPath, runtimePath);
    });

    diagnostics.push(`Successfully migrated ${legacyRecords.length} record(s) to canonical schema.`);
    return {
      migrated: true,
      dryRun: false,
      totalRecords: runtimeRecords.length,
      migratedCount: legacyRecords.length,
      backupPath,
      diagnostics
    };
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
   * Retrieves original canonical seed records directly without modifying runtime state.
   */
  public async getSeeds<T>(domain: string): Promise<T[]> {
    const seedPath = this.getSeedFilePath(domain);
    if (!fs.existsSync(seedPath)) {
      return [];
    }
    const content = await fs.promises.readFile(seedPath, 'utf8');
    try {
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
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
