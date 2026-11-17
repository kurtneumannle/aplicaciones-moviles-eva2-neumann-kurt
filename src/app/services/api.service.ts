import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, retry, timeout } from 'rxjs';
import { environment } from '../../environments/environment';
import { Task } from '../models/task.model';

/** Tarea tal como la entrega el servicio web. */
export interface RemoteTodo {
  id: number;
  title: string;
  completed: boolean;
}

/**
 * Comunicación con el servicio web (API REST). Usa HTTPS, límite de tiempo y un reintento ante fallas de red,
 * y valida la forma de lo que recibe antes de pasarlo al resto de la app.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  private readonly base = environment.apiUrl;

  /** Importa tareas de la API externa. */
  fetchTodos(limit = 5): Observable<RemoteTodo[]> {
    return this.http.get<unknown[]>(`${this.base}/todos`, { params: { _limit: limit } }).pipe(
      timeout(8000),
      retry(1),
      map(rows =>
        rows.filter(ApiService.isRemoteTodo).map(r => ({ id: r.id, title: r.title.slice(0, 60), completed: r.completed }))
      )
    );
  }

  /** Envía una tarea al servicio web; devuelve el id que le asignó. */
  pushTask(task: Task): Observable<{ id: number }> {
    return this.http
      .post<{ id: number }>(`${this.base}/posts`, {
        title: task.title,
        body: task.description,
        userId: 1,
      })
      .pipe(timeout(8000), retry(1));
  }

  private static isRemoteTodo(row: unknown): row is RemoteTodo {
    const r = row as RemoteTodo;
    return !!r && typeof r.id === 'number' && typeof r.title === 'string' && typeof r.completed === 'boolean';
  }
}
