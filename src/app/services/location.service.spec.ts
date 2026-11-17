import { TestBed } from '@angular/core/testing';
import { GEOLOCATION_PLUGIN, LocationService } from './location.service';

/** GPS falso: se configura el permiso y la posición (o el error) que debe entregar. */
function fakeGps(opts: { permission?: string; afterRequest?: string; coords?: object; error?: Error } = {}) {
  const calls = { request: 0, position: 0 };
  const plugin = {
    checkPermissions: async () => ({ location: opts.permission ?? 'granted', coarseLocation: 'granted' }),
    requestPermissions: async () => {
      calls.request++;
      return { location: opts.afterRequest ?? 'denied', coarseLocation: 'denied' };
    },
    getCurrentPosition: async () => {
      calls.position++;
      if (opts.error) {
        throw opts.error;
      }
      return { timestamp: 0, coords: opts.coords ?? { latitude: -33.4489, longitude: -70.6693, accuracy: 12 } };
    },
  };
  TestBed.configureTestingModule({ providers: [{ provide: GEOLOCATION_PLUGIN, useValue: plugin }] });
  return { service: TestBed.inject(LocationService), calls };
}

describe('LocationService (periférico: GPS)', () => {
  it('entrega la ubicación con su precisión cuando hay permiso', async () => {
    const { service } = fakeGps();
    expect(await service.getCurrentLocation()).toEqual({
      ok: true,
      point: { lat: -33.4489, lng: -70.6693, accuracy: 12 },
    });
  });

  it('pide el permiso si aún no se decidió', async () => {
    const { service, calls } = fakeGps({ permission: 'prompt', afterRequest: 'granted' });
    const r = await service.getCurrentLocation();
    expect(calls.request).toBe(1);
    expect(r.ok).toBe(true);
  });

  it('no consulta el GPS si el permiso fue denegado', async () => {
    const { service, calls } = fakeGps({ permission: 'denied', afterRequest: 'denied' });
    expect(await service.getCurrentLocation()).toMatchObject({ ok: false, reason: 'denied' });
    expect(calls.position).toBe(0);
  });

  it('descarta coordenadas fuera de rango', async () => {
    const { service } = fakeGps({ coords: { latitude: 95, longitude: -70, accuracy: 5 } });
    expect(await service.getCurrentLocation()).toMatchObject({ ok: false, reason: 'invalid' });
  });

  it('descarta coordenadas que no son números', async () => {
    const { service } = fakeGps({ coords: { latitude: NaN, longitude: -70, accuracy: 5 } });
    expect(await service.getCurrentLocation()).toMatchObject({ ok: false, reason: 'invalid' });
  });

  it('usa precisión nula si el dispositivo no la informa', async () => {
    const { service } = fakeGps({ coords: { latitude: -33.4, longitude: -70.6, accuracy: -1 } });
    const r = await service.getCurrentLocation();
    expect(r).toMatchObject({ ok: true, point: { accuracy: null } });
  });

  it('informa error si el GPS no responde (tiempo agotado o apagado)', async () => {
    const { service } = fakeGps({ error: new Error('Location request timed out') });
    expect(await service.getCurrentLocation()).toMatchObject({ ok: false, reason: 'error' });
  });

  it('valida y formatea coordenadas', () => {
    expect(LocationService.isValid(-33.4, -70.6)).toBe(true);
    expect(LocationService.isValid(0, 181)).toBe(false);
    expect(LocationService.format({ lat: -33.44891, lng: -70.66927, accuracy: null })).toBe('-33.44891, -70.66927');
  });
});
