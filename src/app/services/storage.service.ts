import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

/**
 * Almacenamiento local persistente con Capacitor Preferences. En Android/iOS usa el almacenamiento nativo
 * (SharedPreferences / UserDefaults) y en el navegador usa localStorage, así los datos sobreviven sin internet.
 * Todo el resto de la app guarda y lee solo a través de este servicio.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  async get<T>(key: string, fallback: T): Promise<T> {
    const { value } = await Preferences.get({ key });
    if (value === null) {
      return fallback;
    }
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback; // dato corrupto: se parte de cero en vez de romper la app
    }
  }

  async set(key: string, value: unknown): Promise<void> {
    await Preferences.set({ key, value: JSON.stringify(value) });
  }

  async remove(key: string): Promise<void> {
    await Preferences.remove({ key });
  }
}
