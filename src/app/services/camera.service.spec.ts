import { TestBed } from '@angular/core/testing';
import { CAMERA_PLUGIN, CameraService } from './camera.service';

/** Cámara falsa: se configura el permiso y la foto (o el error) que debe devolver. */
function fakeCamera(opts: { permission?: string; afterRequest?: string; photo?: unknown; error?: Error } = {}) {
  const calls = { request: 0, getPhoto: 0 };
  const plugin = {
    checkPermissions: async () => ({ camera: opts.permission ?? 'granted' }),
    requestPermissions: async () => {
      calls.request++;
      return { camera: opts.afterRequest ?? 'denied' };
    },
    getPhoto: async () => {
      calls.getPhoto++;
      if (opts.error) {
        throw opts.error;
      }
      return opts.photo ?? { dataUrl: 'data:image/jpeg;base64,AAAA' };
    },
  };
  TestBed.configureTestingModule({ providers: [{ provide: CAMERA_PLUGIN, useValue: plugin }] });
  return { service: TestBed.inject(CameraService), calls };
}

describe('CameraService (periférico: cámara)', () => {
  it('devuelve la foto cuando el permiso está concedido', async () => {
    const { service, calls } = fakeCamera();
    const r = await service.takePhoto();
    expect(r).toEqual({ ok: true, dataUrl: 'data:image/jpeg;base64,AAAA' });
    expect(calls.request).toBe(0); // no vuelve a pedir un permiso que ya tiene
  });

  it('pide el permiso cuando aún no se decidió y sigue si lo conceden', async () => {
    const { service, calls } = fakeCamera({ permission: 'prompt', afterRequest: 'granted' });
    const r = await service.takePhoto();
    expect(calls.request).toBe(1);
    expect(r.ok).toBe(true);
  });

  it('no abre la cámara si el usuario niega el permiso', async () => {
    const { service, calls } = fakeCamera({ permission: 'prompt', afterRequest: 'denied' });
    const r = await service.takePhoto();
    expect(r).toMatchObject({ ok: false, reason: 'denied' });
    expect(calls.getPhoto).toBe(0);
  });

  it('distingue cuando el usuario cancela la captura', async () => {
    const { service } = fakeCamera({ error: new Error('User cancelled photos app') });
    expect(await service.takePhoto()).toMatchObject({ ok: false, reason: 'cancelled' });
  });

  it('informa un error genérico si la cámara falla', async () => {
    const { service } = fakeCamera({ error: new Error('hardware no disponible') });
    expect(await service.takePhoto()).toMatchObject({ ok: false, reason: 'error' });
  });

  it('rechaza una respuesta que no es una imagen', async () => {
    const { service } = fakeCamera({ photo: { dataUrl: 'texto-cualquiera' } });
    expect(await service.takePhoto()).toMatchObject({ ok: false, reason: 'error' });
  });

  it('rechaza una respuesta sin datos', async () => {
    const { service } = fakeCamera({ photo: {} });
    expect(await service.takePhoto()).toMatchObject({ ok: false, reason: 'error' });
  });
});
