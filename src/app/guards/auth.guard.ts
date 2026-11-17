import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Protege las pantallas privadas: sin sesión, redirige al ingreso. */
export const authGuard: CanActivateFn = async () => {
  // inject() solo funciona antes del primer await: se piden las dos dependencias de entrada
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ready; // esperar a que se lea la sesión guardada
  return auth.isLoggedIn || router.createUrlTree(['/login']);
};
