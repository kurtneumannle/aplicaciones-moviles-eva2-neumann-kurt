import { Injectable, signal, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { GeoPoint, Task } from '../models/task.model';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { StorageService } from './storage.service';

export interface SyncResult {
  sent: number;
  failed: number;
}

/**
 * Único punto de acceso al estado de las tareas. Las guarda en el dispositivo (una lista por usuario) y las
 * sincroniza con el servicio web. Las páginas solo consumen este servicio.
 */
@Injectable({ providedIn: 'root' })
export class TaskService {
  private storage = inject(StorageService);
  private auth = inject(AuthService);
  private api = inject(ApiService);

  private readonly _tasks = signal<Task[]>([]);
  readonly tasks = this._tasks.asReadonly();

  /** Carga las tareas del usuario con sesión; si no hay sesión, la lista queda vacía. */
  async load(): Promise<void> {
    const user = this.auth.currentUser();
    this._tasks.set(user ? await this.storage.get<Task[]>(this.key(user), []) : []);
  }

  async add(title: string, description: string, photo?: string, location?: GeoPoint): Promise<Task> {
    const list = this._tasks();
    const task: Task = {
      id: list.reduce((max, t) => Math.max(max, t.id), 0) + 1,
      title,
      description,
      completed: false,
      photo,
      location,
      synced: false,
      origin: 'local',
      createdAt: new Date().toISOString(),
    };
    await this.save([...list, task]);
    return task;
  }

  /** Edita título y descripción; la tarea vuelve a quedar pendiente de sincronizar. */
  async update(id: number, title: string, description: string): Promise<void> {
    await this.save(this._tasks().map(t => (t.id === id ? { ...t, title, description, synced: false } : t)));
  }

  async toggle(id: number): Promise<void> {
    await this.save(this._tasks().map(t => (t.id === id ? { ...t, completed: !t.completed, synced: false } : t)));
  }

  async remove(id: number): Promise<void> {
    await this.save(this._tasks().filter(t => t.id !== id));
  }

  /** Envía al servicio web las tareas pendientes. Una falla no detiene al resto. */
  async sync(): Promise<SyncResult> {
    const result: SyncResult = { sent: 0, failed: 0 };
    for (const task of this._tasks().filter(t => !t.synced)) {
      try {
        const { id } = await firstValueFrom(this.api.pushTask(task));
        await this.save(this._tasks().map(t => (t.id === task.id ? { ...t, remoteId: id, synced: true } : t)));
        result.sent++;
      } catch {
        result.failed++;
      }
    }
    return result;
  }

  /** Importa tareas de la API externa, sin duplicar las que ya se importaron. Devuelve cuántas agregó. */
  async importRemote(): Promise<number> {
    const remote = await firstValueFrom(this.api.fetchTodos());
    const known = new Set(this._tasks().filter(t => t.origin === 'remote').map(t => t.remoteId));
    let next = this._tasks().reduce((max, t) => Math.max(max, t.id), 0) + 1;
    const fresh: Task[] = remote
      .filter(r => !known.has(r.id))
      .map(r => ({
        id: next++,
        title: r.title,
        description: 'Importada desde la API externa',
        completed: r.completed,
        remoteId: r.id,
        synced: true,
        origin: 'remote' as const,
        createdAt: new Date().toISOString(),
      }));
    if (fresh.length) {
      await this.save([...this._tasks(), ...fresh]);
    }
    return fresh.length;
  }

  private async save(list: Task[]): Promise<void> {
    this._tasks.set(list);
    const user = this.auth.currentUser();
    if (user) {
      await this.storage.set(this.key(user), list);
    }
  }

  private key(user: string): string {
    return `tasks:${user}`;
  }
}
