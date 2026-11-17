import { Injectable, InjectionToken, inject } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import { GeoPoint } from '../models/task.model';

/** Plugin de geolocalización inyectable: en las pruebas se reemplaza por uno falso. */
export const GEOLOCATION_PLUGIN = new InjectionToken<typeof Geolocation>('GEOLOCATION_PLUGIN', {
  factory: () => Geolocation,
});

export type LocationResult =
  | { ok: true; point: GeoPoint }
  | { ok: false; reason: 'denied' | 'invalid' | 'error'; message: string };

/**
 * Lectura de la ubicación GPS (Capacitor Geolocation). Pide el permiso cuando hace falta y valida el dato
 * recibido antes de usarlo: coordenadas fuera de rango o no numéricas se descartan.
 */
@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly geolocation = inject(GEOLOCATION_PLUGIN);

  async getCurrentLocation(): Promise<LocationResult> {
    try {
      let permissions = await this.geolocation.checkPermissions();
      if (permissions.location !== 'granted') {
        permissions = await this.geolocation.requestPermissions({ permissions: ['location'] });
      }
      if (permissions.location !== 'granted') {
        return { ok: false, reason: 'denied', message: 'Sin permiso de ubicación. Puedes activarlo en los ajustes del teléfono.' };
      }
      const position = await this.geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
      const { latitude, longitude, accuracy } = position.coords;
      if (!LocationService.isValid(latitude, longitude)) {
        return { ok: false, reason: 'invalid', message: 'El GPS entregó una ubicación inválida.' };
      }
      return {
        ok: true,
        point: { lat: latitude, lng: longitude, accuracy: Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : null },
      };
    } catch {
      return { ok: false, reason: 'error', message: 'No se pudo obtener la ubicación (revisa que el GPS esté activo).' };
    }
  }

  /** Coordenadas válidas: números finitos dentro de los rangos geográficos. */
  static isValid(lat: number, lng: number): boolean {
    return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  }

  static format(point: GeoPoint): string {
    return `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
  }
}
