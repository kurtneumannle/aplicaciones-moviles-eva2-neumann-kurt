# todo-app (Unidad 2)

Aplicación móvil de tareas con Ionic 9, Angular 22 y Capacitor 8. Evaluación sumativa de la Unidad 2 de Desarrollo de aplicaciones móviles (IPSS). Amplía la ToDo List de la Unidad 1 con periféricos, almacenamiento local, usuarios y servicios web.

## Qué incluye

- **Cámara:** adjunta una foto a cada tarea (`@capacitor/camera`).
- **GPS:** registra automáticamente la ubicación donde se crea cada tarea (`@capacitor/geolocation`).
- **Permisos:** se piden solo cuando hacen falta, y si el usuario los niega la app lo explica y sigue funcionando (la tarea se guarda sin foto o sin ubicación).
- **Almacenamiento local:** las tareas persisten en el dispositivo, también sin internet (`@capacitor/preferences`).
- **Usuarios:** registro e ingreso locales con varios usuarios; cada uno ve solo sus tareas. Las claves se guardan con hash SHA-256 y sal, nunca en texto plano.
- **Servicio web:** importa tareas desde una API externa y sincroniza las tareas locales (JSONPlaceholder, por HTTPS, con tiempo límite y un reintento).
- **Pruebas automatizadas:** 42 pruebas, incluidas la captura de imagen y la obtención de ubicación.

## Estructura

```
src/app/
  models/      Task, GeoPoint, StoredUser
  services/    StorageService, AuthService, CameraService, LocationService, ApiService, TaskService
  guards/      authGuard (protege /home)
  login/       pantalla de ingreso y registro
  home/        lista de tareas con foto, ubicación y sincronización
  testing/     almacenamiento en memoria para pruebas
```

Los plugins de Capacitor entran por *injection tokens* (`CAMERA_PLUGIN`, `GEOLOCATION_PLUGIN`), así las pruebas los reemplazan por dobles sin tocar el hardware.

## Ejecutar

```bash
npm install
npx ionic serve --port=8100      # http://localhost:8100
npx ng test --watch=false        # 42 pruebas
npx ng lint
```

En el navegador la cámara abre el selector de archivos y el GPS usa la ubicación del navegador. Para probar en un teléfono: `npx ionic build && npx cap add android && npx cap sync`.

## Permisos en Android

Al agregar la plataforma Android, declarar en `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.INTERNET" />
```

En iOS, agregar en `Info.plist` las claves `NSCameraUsageDescription` y `NSLocationWhenInUseUsageDescription` con el motivo del permiso.

## Autor

Kurt Neumann Lewis, Ingeniería en Informática, IPSS.
