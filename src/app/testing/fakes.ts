import { Injectable } from '@angular/core';
import { StorageService } from '../services/storage.service';

/** Almacenamiento en memoria para las pruebas: mismo contrato que StorageService, sin tocar el disco. */
@Injectable()
export class MemoryStorage extends StorageService {
  readonly data = new Map<string, string>();

  override async get<T>(key: string, fallback: T): Promise<T> {
    const value = this.data.get(key);
    return value === undefined ? fallback : (JSON.parse(value) as T);
  }

  override async set(key: string, value: unknown): Promise<void> {
    this.data.set(key, JSON.stringify(value));
  }

  override async remove(key: string): Promise<void> {
    this.data.delete(key);
  }
}
