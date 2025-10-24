import { promises as fs } from 'fs';
import path from 'path';

const DEFAULT_LOCK_TIMEOUT = 5000;
const DEFAULT_LOCK_RETRY_DELAY = 50;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default class JsonFileStore {
  constructor(filePath, { defaultValue = null, lockTimeout = DEFAULT_LOCK_TIMEOUT, retryDelay = DEFAULT_LOCK_RETRY_DELAY } = {}) {
    this.filePath = filePath;
    this.lockPath = `${filePath}.lock`;
    this.defaultValue = defaultValue;
    this.lockTimeout = lockTimeout;
    this.retryDelay = retryDelay;
  }

  async read() {
    return this.#withLock(async () => this.#clone(await this.#readFile()));
  }

  async update(mutator) {
    return this.#withLock(async () => {
      const current = await this.#readFile();
      const workingCopy = this.#clone(current);
      const result = await mutator(workingCopy);
      const nextValue = result === undefined ? workingCopy : result;
      await this.#writeFile(nextValue);
      return this.#clone(nextValue);
    });
  }

  async #withLock(fn) {
    const handle = await this.#acquireLock();
    try {
      return await fn();
    } finally {
      await this.#releaseLock(handle);
    }
  }

  async #acquireLock() {
    const startedAt = Date.now();
    while (true) {
      try {
        return await fs.open(this.lockPath, 'wx');
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
        if (Date.now() - startedAt >= this.lockTimeout) {
          throw new Error(`Timeout acquiring lock for ${path.basename(this.filePath)}`);
        }
        await sleep(this.retryDelay);
      }
    }
  }

  async #releaseLock(handle) {
    if (handle) {
      await handle.close().catch(() => {});
    }
    await fs.unlink(this.lockPath).catch((error) => {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    });
  }

  async #readFile() {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      if (!raw.trim()) {
        return this.#clone(this.defaultValue);
      }
      return JSON.parse(raw);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return this.#clone(this.defaultValue);
      }
      throw error;
    }
  }

  async #writeFile(value) {
    const serialized = `${JSON.stringify(value ?? this.defaultValue, null, 2)}\n`;
    await fs.writeFile(this.filePath, serialized, 'utf8');
  }

  #clone(value) {
    return value === null || value === undefined ? value : JSON.parse(JSON.stringify(value));
  }
}
