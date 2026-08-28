import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ChatService } from './chat.service';

describe('ChatService', () => {
  let service: ChatService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ChatService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ChatService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('solicita la voz al backend y recibe un Blob', () => {
    const audioEsperado = new Blob(['audio'], { type: 'audio/mpeg' });
    let audioRecibido: Blob | undefined;

    service.getVoiceResponse('Hola').subscribe((audio) => {
      audioRecibido = audio;
    });

    const request = httpTesting.expectOne('/api/voice');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ text: 'Hola' });
    expect(request.request.responseType).toBe('blob');

    request.flush(audioEsperado);
    expect(audioRecibido).toBe(audioEsperado);
  });
});
