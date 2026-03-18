import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';

import { AccountsOverviewComponent } from './accounts-overview.component';
import { ApiService } from 'src/app/services/api.service';
import { BeaconService } from 'src/app/services/beacon.service';
import { AccountService } from 'src/app/services/account.service';
import { BsModalRef } from 'ngx-bootstrap/modal';

class MockApiService {
  getPublicKeyForAddress = async () => ({ network: 'mainnet', publicKey: 'pk' });
}

class MockBeaconService {
  dAppClient: any = {
    clearActiveAccount: async () => {},
    requestPermissions: async () => ({
      address: 'tz1-test',
      publicKey: 'pk',
      senderId: 'sender',
    }),
    getPeers: async () => [{ senderId: 'sender', name: 'wallet' }],
    network: undefined,
  };
}

class MockAccountService {
  accounts$ = of([]);
  addOrUpdateAccount = () => {};
}

class MockBsModalRef {
  hide = () => {};
}

describe('AccountsOverviewComponent', () => {
  let component: AccountsOverviewComponent;
  let fixture: ComponentFixture<AccountsOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule],
      declarations: [AccountsOverviewComponent],
      providers: [
        { provide: ApiService, useClass: MockApiService },
        { provide: BeaconService, useClass: MockBeaconService },
        { provide: AccountService, useClass: MockAccountService },
        { provide: BsModalRef, useClass: MockBsModalRef },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AccountsOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
