import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthError, AuthService } from '../services/auth.service';

/** Pantalla de ingreso y registro de usuarios. */
@Component({
  selector: 'app-login',
  templateUrl: 'login.page.html',
  styleUrls: ['login.page.scss'],
  standalone: false,
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);

  mode: 'login' | 'register' = 'login';
  username = '';
  password = '';
  error = '';
  busy = false;

  get canSubmit(): boolean {
    return this.username.trim().length > 0 && this.password.length > 0 && !this.busy;
  }

  setMode(mode: 'login' | 'register'): void {
    this.mode = mode;
    this.error = '';
  }

  async submit(): Promise<void> {
    if (!this.canSubmit) {
      return;
    }
    this.busy = true;
    this.error = '';
    try {
      if (this.mode === 'login') {
        await this.auth.login(this.username, this.password);
      } else {
        await this.auth.register(this.username, this.password);
      }
      this.password = '';
      await this.router.navigateByUrl('/home', { replaceUrl: true });
    } catch (e) {
      this.error = e instanceof AuthError ? e.message : 'No se pudo completar la operación.';
    } finally {
      this.busy = false;
    }
  }
}
