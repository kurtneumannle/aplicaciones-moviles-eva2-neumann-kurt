import { Injectable, signal, inject } from '@angular/core';
import { StoredUser } from '../models/user.model';
import { StorageService } from './storage.service';

const USERS_KEY = 'users';
const SESSION_KEY = 'session';

/** Error de autenticación con un mensaje apto para mostrar al usuario. */
export class AuthError extends Error {}

/**
 * Autenticación básica local con varios usuarios por dispositivo. Cada usuario ve solo sus tareas.
 * Las claves se guardan como hash SHA-256 con una sal aleatoria por usuario (nunca en texto plano).
 * Es una protección razonable para datos locales; con un servidor propio habría que autenticar contra él
 * y guardar un token en vez de las credenciales.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private storage = inject(StorageService);

  private readonly _user = signal<string | null>(null);
  readonly currentUser = this._user.asReadonly();
  /** Se resuelve cuando ya se leyó la sesión guardada; los guards la esperan antes de decidir. */
  readonly ready: Promise<void>;

  constructor() {
    this.ready = this.restoreSession();
  }

  get isLoggedIn(): boolean {
    return this._user() !== null;
  }

  async register(username: string, password: string): Promise<void> {
    const name = this.normalize(username);
    if (!/^[a-z0-9_]{3,20}$/.test(name)) {
      throw new AuthError('El usuario debe tener entre 3 y 20 caracteres: letras, números o guion bajo.');
    }
    if (password.length < 6) {
      throw new AuthError('La clave debe tener al menos 6 caracteres.');
    }
    const users = await this.storage.get<StoredUser[]>(USERS_KEY, []);
    if (users.some(u => u.username === name)) {
      throw new AuthError('Ese usuario ya existe.');
    }
    const salt = this.randomSalt();
    users.push({ username: name, salt, hash: await this.hash(salt, password) });
    await this.storage.set(USERS_KEY, users);
    await this.openSession(name);
  }

  async login(username: string, password: string): Promise<void> {
    const name = this.normalize(username);
    const users = await this.storage.get<StoredUser[]>(USERS_KEY, []);
    const user = users.find(u => u.username === name);
    // Mismo mensaje para "no existe" y "clave mala": no revela qué usuarios están registrados.
    if (!user || user.hash !== (await this.hash(user.salt, password))) {
      throw new AuthError('Usuario o clave incorrectos.');
    }
    await this.openSession(name);
  }

  async logout(): Promise<void> {
    this._user.set(null);
    await this.storage.remove(SESSION_KEY);
  }

  private async restoreSession(): Promise<void> {
    const saved = await this.storage.get<string | null>(SESSION_KEY, null);
    if (saved) {
      this._user.set(saved);
    }
  }

  private async openSession(name: string): Promise<void> {
    this._user.set(name);
    await this.storage.set(SESSION_KEY, name);
  }

  private normalize(username: string): string {
    return username.trim().toLowerCase();
  }

  private randomSalt(): string {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }

  private async hash(salt: string, password: string): Promise<string> {
    const data = new TextEncoder().encode(salt + password);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  }
}
