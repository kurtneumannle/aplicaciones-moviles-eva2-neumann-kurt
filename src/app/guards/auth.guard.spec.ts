import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { MemoryStorage } from '../testing/fakes';
import { AuthService } from '../services/auth.service';
import { StorageService } from '../services/storage.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: StorageService, useValue: new MemoryStorage() }],
    });
  });

  const run = () =>
    TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));

  it('redirige a /login cuando no hay sesión', async () => {
    const result = (await run()) as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/login');
  });

  it('deja pasar cuando hay sesión', async () => {
    await TestBed.inject(AuthService).register('kurt', 'clave-segura');
    expect(await run()).toBe(true);
  });
});
