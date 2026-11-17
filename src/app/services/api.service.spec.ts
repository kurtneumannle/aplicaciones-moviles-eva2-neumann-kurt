import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { Task } from '../models/task.model';
import { ApiService } from './api.service';

const task: Task = {
  id: 1, title: 'Comprar pan', description: 'Panadería', completed: false,
  synced: false, origin: 'local', createdAt: '2026-11-16T10:00:00.000Z',
};

describe('ApiService (servicio web)', () => {
  let api: ApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('importa tareas pidiendo solo la cantidad indicada, por HTTPS', async () => {
    const result = firstValueFrom(api.fetchTodos(3));
    const req = http.expectOne(r => r.url.endsWith('/todos'));
    expect(req.request.url.startsWith('https://')).toBe(true);
    expect(req.request.params.get('_limit')).toBe('3');
    req.flush([{ id: 7, title: 'Tarea remota', completed: true, userId: 1 }]);
    expect(await result).toEqual([{ id: 7, title: 'Tarea remota', completed: true }]);
  });

  it('descarta filas con formato inválido y recorta títulos largos', async () => {
    const result = firstValueFrom(api.fetchTodos());
    http.expectOne(r => r.url.endsWith('/todos')).flush([
      { id: 1, title: 'x'.repeat(100), completed: false },
      { id: 'dos', title: 'inválida', completed: false },
      { id: 3, title: 42, completed: false },
      null,
    ]);
    const rows = await result;
    expect(rows.length).toBe(1);
    expect(rows[0].title.length).toBe(60);
  });

  it('envía la tarea con POST y devuelve el id asignado', async () => {
    const result = firstValueFrom(api.pushTask(task));
    const req = http.expectOne(r => r.url.endsWith('/posts'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ title: 'Comprar pan', body: 'Panadería', userId: 1 });
    req.flush({ id: 101 });
    expect(await result).toEqual({ id: 101 });
  });

  it('propaga el error cuando el servidor falla (tras un reintento)', async () => {
    const result = firstValueFrom(api.pushTask(task)).catch((e: unknown) => e);
    http.expectOne(r => r.url.endsWith('/posts')).flush('error', { status: 500, statusText: 'Server Error' });
    http.expectOne(r => r.url.endsWith('/posts')).flush('error', { status: 500, statusText: 'Server Error' });
    expect(await result).toBeTruthy();
  });
});
