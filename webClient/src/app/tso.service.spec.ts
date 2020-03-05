import { TestBed, inject } from '@angular/core/testing';

import { TsoService } from './tso.service';

describe('TsoService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TsoService]
    });
  });

  it('should be created', inject([TsoService], (service: TsoService) => {
    expect(service).toBeTruthy();
  }));
});
