import { Injectable, InjectionToken, inject } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

/** Plugin de cámara inyectable: en las pruebas se reemplaza por uno falso sin tocar el hardware. */
export const CAMERA_PLUGIN = new InjectionToken<typeof Camera>('CAMERA_PLUGIN', { factory: () => Camera });

export type PhotoResult =
  | { ok: true; dataUrl: string }
  | { ok: false; reason: 'denied' | 'cancelled' | 'error'; message: string };

/**
 * Captura de fotos con la cámara del dispositivo (Capacitor Camera). Pide el permiso solo cuando hace falta,
 * y siempre devuelve un resultado explícito (nunca lanza), para que la pantalla pueda explicar qué pasó.
 */
@Injectable({ providedIn: 'root' })
export class CameraService {
  private readonly camera = inject(CAMERA_PLUGIN);

  async takePhoto(): Promise<PhotoResult> {
    try {
      let permissions = await this.camera.checkPermissions();
      if (permissions.camera !== 'granted') {
        permissions = await this.camera.requestPermissions({ permissions: ['camera'] });
      }
      if (permissions.camera !== 'granted') {
        return { ok: false, reason: 'denied', message: 'Sin permiso de cámara. Puedes activarlo en los ajustes del teléfono.' };
      }
      const photo = await this.camera.getPhoto({
        quality: 60, // equilibrio entre nitidez y tamaño: la foto se guarda en el dispositivo
        width: 800,
        correctOrientation: true,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });
      if (!photo.dataUrl || !photo.dataUrl.startsWith('data:image/')) {
        return { ok: false, reason: 'error', message: 'La cámara no devolvió una imagen válida.' };
      }
      return { ok: true, dataUrl: photo.dataUrl };
    } catch (e) {
      const text = e instanceof Error ? e.message : String(e);
      if (/cancel/i.test(text)) {
        return { ok: false, reason: 'cancelled', message: 'Captura cancelada.' };
      }
      return { ok: false, reason: 'error', message: 'No se pudo usar la cámara.' };
    }
  }
}
