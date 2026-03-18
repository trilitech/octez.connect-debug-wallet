import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { BsModalService } from 'ngx-bootstrap/modal';

import { BeaconService } from './beacon.service';
import { AccountService } from './account.service';
import { ApiService } from './api.service';

class MockAccountService {
  accounts$ = of([]);
}

class MockBsModalService {
  show() {
    return { onHide: of(undefined) } as any;
  }
}

class MockApiService {
  RPCs: any = {
    mainnet: { selected: 'https://mainnet.api.tez.ie', all: [] },
  };
}

describe('BeaconService', () => {
  let service: BeaconService;

  beforeEach(() => {
    spyOn(BeaconService.prototype as any, 'connect').and.stub();
    spyOn(BeaconService.prototype as any, 'logClient').and.stub();

    TestBed.configureTestingModule({
      providers: [
        BeaconService,
        { provide: AccountService, useClass: MockAccountService },
        { provide: BsModalService, useClass: MockBsModalService },
        { provide: ApiService, useClass: MockApiService },
      ],
    });
    service = TestBed.inject(BeaconService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
