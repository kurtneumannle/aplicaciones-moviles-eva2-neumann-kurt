import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular/lazy';
import { GeoPoint, Task } from '../models/task.model';
import { AuthService } from '../services/auth.service';
import { CameraService } from '../services/camera.service';
import { LocationService } from '../services/location.service';
import { TaskService } from '../services/task.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage {
  taskService = inject(TaskService);
  auth = inject(AuthService);
  private camera = inject(CameraService);
  private location = inject(LocationService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private router = inject(Router);

  title = '';
  description = '';
  editingId: number | null = null;
  /** Foto tomada para la tarea que se está creando (aún sin guardar). */
  photo: string | null = null;
  busy = false;

  /** Cada vez que se entra a la pantalla se recargan las tareas del usuario con sesión. */
  async ionViewWillEnter(): Promise<void> {
    await this.taskService.load();
  }

  get isEditing(): boolean {
    return this.editingId !== null;
  }

  get canSave(): boolean {
    return this.title.trim().length > 0 && !this.busy;
  }

  get pending(): number {
    return this.taskService.tasks().filter(t => !t.synced).length;
  }

  formatLocation(point: GeoPoint): string {
    return LocationService.format(point);
  }

  /** Abre la cámara y deja la foto lista para adjuntarla a la tarea nueva. */
  async takePhoto(): Promise<void> {
    const result = await this.camera.takePhoto();
    if (result.ok) {
      this.photo = result.dataUrl;
    } else if (result.reason !== 'cancelled') {
      await this.toast(result.message);
    }
  }

  removePhoto(): void {
    this.photo = null;
  }

  async save(): Promise<void> {
    if (!this.canSave) {
      return;
    }
    this.busy = true;
    try {
      const title = this.title.trim();
      const description = this.description.trim();
      if (this.editingId !== null) {
        await this.taskService.update(this.editingId, title, description);
        await this.toast('Tarea actualizada');
      } else {
        // La ubicación se registra donde se crea la tarea; si no hay GPS o permiso, la tarea se guarda igual.
        const where = await this.location.getCurrentLocation();
        await this.taskService.add(title, description, this.photo ?? undefined, where.ok ? where.point : undefined);
        await this.toast(where.ok ? 'Tarea agregada con ubicación' : `Tarea agregada. ${where.message}`);
      }
      this.resetForm();
    } finally {
      this.busy = false;
    }
  }

  edit(task: Task): void {
    this.editingId = task.id;
    this.title = task.title;
    this.description = task.description;
  }

  cancelEdit(): void {
    this.resetForm();
  }

  async toggle(task: Task): Promise<void> {
    await this.taskService.toggle(task.id);
  }

  async confirmDelete(task: Task): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar tarea',
      message: `¿Deseas eliminar "${task.title}"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            await this.taskService.remove(task.id);
            if (this.editingId === task.id) {
              this.resetForm();
            }
            await this.toast('Tarea eliminada');
          },
        },
      ],
    });
    await alert.present();
  }

  /** Envía al servicio web las tareas pendientes. */
  async sync(): Promise<void> {
    this.busy = true;
    try {
      const { sent, failed } = await this.taskService.sync();
      if (sent === 0 && failed === 0) {
        await this.toast('Todo está sincronizado');
      } else if (failed > 0) {
        await this.toast(`Sincronizadas ${sent}; ${failed} fallaron (revisa tu conexión)`);
      } else {
        await this.toast(`${sent} tarea(s) sincronizada(s)`);
      }
    } finally {
      this.busy = false;
    }
  }

  /** Trae tareas de la API externa. */
  async importRemote(): Promise<void> {
    this.busy = true;
    try {
      const added = await this.taskService.importRemote();
      await this.toast(added ? `${added} tarea(s) importada(s)` : 'No hay tareas nuevas para importar');
    } catch {
      await this.toast('No se pudo importar. Revisa tu conexión a internet.');
    } finally {
      this.busy = false;
    }
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  trackById(_: number, task: Task): number {
    return task.id;
  }

  private resetForm(): void {
    this.title = '';
    this.description = '';
    this.editingId = null;
    this.photo = null;
  }

  /** Muestra un aviso sin esperar a que termine su animación, para no dejar la pantalla bloqueada. */
  private toast(message: string): void {
    void this.toastCtrl
      .create({ message, duration: 2400, position: 'bottom' })
      .then(t => t.present());
  }
}
