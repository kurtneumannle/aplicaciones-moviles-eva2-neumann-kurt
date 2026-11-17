import { TestBed } from '@angular/core/testing';
import { MemoryStorage } from '../testing/fakes';
import { AuthError, AuthService } from './auth.service';
import { StorageService } from './storage.service';

function setup(storage = new MemoryStorage()) {
  TestBed.configureTestingModule({ providers: [{ provide: StorageService, useValue: storage }] });
  return { auth: TestBed.inject(AuthService), storage };
}

describe('AuthService', () => {
  it('registra a un usuario, abre sesión y no guarda la clave en texto plano', async () => {
    const { auth, storage } = setup();
    await auth.register('Kurt_01', 'clave-segura');
    expect(auth.currentUser()).toBe('kurt_01');
    expect(storage.data.get('users')).not.toContain('clave-segura');
  });

  it('rechaza usuarios o claves inválidos', async () => {
    const { auth } = setup();
    await expect(auth.register('ab', 'clave-segura')).rejects.toBeInstanceOf(AuthError);
    await expect(auth.register('kurt$', 'clave-segura')).rejects.toBeInstanceOf(AuthError);
    await expect(auth.register('kurt', '123')).rejects.toBeInstanceOf(AuthError);
  });

  it('no permite registrar dos veces el mismo usuario', async () => {
    const { auth } = setup();
    await auth.register('kurt', 'clave-segura');
    await expect(auth.register('KURT', 'otra-clave')).rejects.toThrow('ya existe');
  });

  it('ingresa con la clave correcta y rechaza la incorrecta con el mismo mensaje que un usuario inexistente', async () => {
    const { auth } = setup();
    await auth.register('kurt', 'clave-segura');
    await auth.logout();
    await expect(auth.login('kurt', 'mala-clave')).rejects.toThrow('Usuario o clave incorrectos');
    await expect(auth.login('nadie', 'clave-segura')).rejects.toThrow('Usuario o clave incorrectos');
    expect(auth.isLoggedIn).toBe(false);
    await auth.login('kurt', 'clave-segura');
    expect(auth.currentUser()).toBe('kurt');
  });

  it('cierra la sesión', async () => {
    const { auth } = setup();
    await auth.register('kurt', 'clave-segura');
    await auth.logout();
    expect(auth.isLoggedIn).toBe(false);
  });

  it('recupera la sesión guardada al volver a abrir la app', async () => {
    const storage = new MemoryStorage();
    await storage.set('session', 'kurt');
    const { auth } = setup(storage);
    await auth.ready;
    expect(auth.currentUser()).toBe('kurt');
  });

  it('dos usuarios con la misma clave tienen hashes distintos (sal aleatoria)', async () => {
    const { auth, storage } = setup();
    await auth.register('ana', 'misma-clave');
    await auth.register('luis', 'misma-clave');
    const users = JSON.parse(storage.data.get('users') as string) as { hash: string }[];
    expect(users[0].hash).not.toBe(users[1].hash);
  });
});
