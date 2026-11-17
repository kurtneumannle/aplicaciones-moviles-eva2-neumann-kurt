import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { ToastController } from '@ionic/angular/lazy';

import { CAMERA_PLUGIN } from '../services/camera.service';
import { GEOLOCATION_PLUGIN } from '../services/location.service';
import { StorageService } from '../services/storage.service';
import { MemoryStorage } from '../testing/fakes';
import { HomePageModule } from './home.module';
import { HomePage } from './home.page';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;

  const gps = {
    checkPermissions: async () => ({ location: 'granted', coarseLocation: 'granted' }),
    requestPermissions: async () => ({ location: 'granted', coarseLocation: 'granted' }),
    getCurrentPosition: async () => ({ timestamp: 0, coords: { latitude: -33.45, longitude: -70.66, accuracy: 8 } }),
  };
  const camera = {
    checkPermissions: async () => ({ camera: 'granted', photos: 'granted' }),
    requestPermissions: async () => ({ camera: 'granted', photos: 'granted' }),
    getPhoto: async () => ({ dataUrl: 'data:image/jpeg;base64,AAAA' }),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePageModule, RouterModule.forRoot([])],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: StorageService, useValue: new MemoryStorage() },
        { provide: GEOLOCATION_PLUGIN, useValue: gps },
        { provide: CAMERA_PLUGIN, useValue: camera },
        // El aviso (toast) necesita animaciones del navegador real; en la prueba basta con un doble.
        { provide: ToastController, useValue: { create: async () => ({ present: async () => undefined }) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('no permite guardar sin título', () => {
    component.title = '   ';
    expect(component.canSave).toBe(false);
  });

  it('adjunta la foto tomada con la cámara', async () => {
    await component.takePhoto();
    expect(component.photo).toBe('data:image/jpeg;base64,AAAA');
    component.removePhoto();
    expect(component.photo).toBeNull();
  });

  it('al crear una tarea registra la ubicación y la foto', async () => {
    await component.auth.register('kurt', 'clave-segura');
    await component.takePhoto();
    component.title = 'Con GPS y foto';
    await component.save();
    const [task] = component.taskService.tasks();
    expect(task.location).toEqual({ lat: -33.45, lng: -70.66, accuracy: 8 });
    expect(task.photo).toBeTruthy();
    expect(component.title).toBe('');
  });
});
