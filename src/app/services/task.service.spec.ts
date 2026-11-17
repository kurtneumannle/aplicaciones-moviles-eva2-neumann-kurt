import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { Task } from '../models/task.model';
import { MemoryStorage } from '../testing/fakes';
import { ApiService, RemoteTodo } from './api.service';
import { AuthService } from './auth.service';
import { StorageService } from './storage.service';
import { TaskService } from './task.service';

/** API falsa: configurable para que el envío o la importación funcionen o fallen. */
class FakeApi {
  fail = false;
  remote: RemoteTodo[] = [];
  nextRemoteId = 100;
  pushTask(_: Task): Observable<{ id: number }> {
    return this.fail ? throwError(() => new Error('sin red')) : of({ id: this.nextRemoteId++ });
  }
  fetchTodos(): Observable<RemoteTodo[]> {
    return this.fail ? throwError(() => new Error('sin red')) : of(this.remote);
  }
}

async function setup() {
  const storage = new MemoryStorage();
  const api = new FakeApi();
  TestBed.configureTestingModule({
    providers: [
      { provide: StorageService, useValue: storage },
      { provide: ApiService, useValue: api },
    ],
  });
  const auth = TestBed.inject(AuthService);
  await auth.register('kurt', 'clave-segura');
  const service = TestBed.inject(TaskService);
  await service.load();
  return { service, storage, api, auth };
}

describe('TaskService', () => {
  it('agrega tareas con ids incrementales, foto y ubicación', async () => {
    const { service } = await setup();
    await service.add('Comprar pan', 'Panadería', 'data:image/jpeg;base64,AA', { lat: -33.4, lng: -70.6, accuracy: 10 });
    await service.add('Estudiar', '');
    const [a, b] = service.tasks();
    expect([a.id, b.id]).toEqual([1, 2]);
    expect(a.photo).toBe('data:image/jpeg;base64,AA');
    expect(a.location?.lat).toBe(-33.4);
    expect(b.synced).toBe(false);
  });

  it('edita solo la tarea indicada y la deja pendiente de sincronizar', async () => {
    const { service } = await setup();
    await service.add('A', 'a');
    await service.add('B', 'b');
    await service.sync();
    await service.update(2, 'B2', 'b2');
    expect(service.tasks()[0].title).toBe('A');
    expect(service.tasks()[0].synced).toBe(true);
    expect(service.tasks()[1]).toMatchObject({ title: 'B2', description: 'b2', synced: false });
  });

  it('elimina una tarea por id y marca como completada', async () => {
    const { service } = await setup();
    await service.add('A', '');
    await service.add('B', '');
    await service.toggle(2);
    await service.remove(1);
    expect(service.tasks().length).toBe(1);
    expect(service.tasks()[0]).toMatchObject({ title: 'B', completed: true });
  });

  it('guarda las tareas en el almacenamiento local y las recupera al recargar', async () => {
    const { service } = await setup();
    await service.add('Persistente', 'sobrevive');
    await service.load(); // simula cerrar y volver a abrir la app
    expect(service.tasks().map(t => t.title)).toEqual(['Persistente']);
  });

  it('separa las tareas de cada usuario', async () => {
    const { service, auth } = await setup();
    await service.add('De Kurt', '');
    await auth.logout();
    await auth.register('ana', 'clave-ana');
    await service.load();
    expect(service.tasks()).toEqual([]);
    await auth.logout();
    await auth.login('kurt', 'clave-segura');
    await service.load();
    expect(service.tasks().map(t => t.title)).toEqual(['De Kurt']);
  });

  it('sincroniza las tareas pendientes y guarda el id remoto', async () => {
    const { service } = await setup();
    await service.add('A', '');
    await service.add('B', '');
    const result = await service.sync();
    expect(result).toEqual({ sent: 2, failed: 0 });
    expect(service.tasks().every(t => t.synced && t.remoteId !== undefined)).toBe(true);
    expect(await service.sync()).toEqual({ sent: 0, failed: 0 }); // nada pendiente
  });

  it('si el servicio web falla, cuenta el error y deja las tareas pendientes', async () => {
    const { service, api } = await setup();
    await service.add('A', '');
    api.fail = true;
    expect(await service.sync()).toEqual({ sent: 0, failed: 1 });
    expect(service.tasks()[0].synced).toBe(false);
  });

  it('importa tareas de la API sin duplicarlas', async () => {
    const { service, api } = await setup();
    api.remote = [
      { id: 1, title: 'Remota 1', completed: false },
      { id: 2, title: 'Remota 2', completed: true },
    ];
    expect(await service.importRemote()).toBe(2);
    expect(await service.importRemote()).toBe(0);
    expect(service.tasks()[0]).toMatchObject({ origin: 'remote', remoteId: 1, synced: true });
    expect(service.tasks()[1].completed).toBe(true);
  });

  it('propaga el error de la importación si no hay conexión', async () => {
    const { service, api } = await setup();
    api.fail = true;
    await expect(service.importRemote()).rejects.toThrow('sin red');
  });
});
