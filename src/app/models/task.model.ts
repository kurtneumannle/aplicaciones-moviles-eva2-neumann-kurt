/** Punto geográfico donde se creó una tarea. */
export interface GeoPoint {
  lat: number;
  lng: number;
  /** Precisión del GPS en metros; null si el dispositivo no la informa. */
  accuracy: number | null;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  /** Foto adjunta como data URL (cámara del dispositivo). */
  photo?: string;
  /** Ubicación donde se creó la tarea (GPS). */
  location?: GeoPoint;
  /** Id que devolvió el servicio web al sincronizar o importar. */
  remoteId?: number;
  /** true si el servicio web ya tiene la última versión de la tarea. */
  synced: boolean;
  origin: 'local' | 'remote';
  createdAt: string;
}
