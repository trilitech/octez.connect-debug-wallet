import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { AppComponent } from './app.component';
import { ApiService } from './services/api.service';
import { BeaconService } from './services/beacon.service';
import { AccountService } from './services/account.service';
import { BsModalService } from 'ngx-bootstrap/modal';

class MockApiService {
  RPCs: any = {
    mainnet: { selected: 'https://mainnet.api.tez.ie', all: [] },
  };
}

class MockBeaconService {
  log: any[] = [];
  walletClient: any = {
    isConnected: Promise.resolve(false),
    getPeers: async () => [],
    getPermissions: async () => [],
    removePeer: async () => {},
    removePermission: async () => {},
  };
  addPeer = async () => {};
}

class MockAccountService {
  accounts$ = of([]);
  removeAccount = () => {};
}

class MockBsModalService {
  show() {
    return { onHide: of(undefined), hide: () => {}, content: {} } as any;
  }
}

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, FormsModule],
      declarations: [AppComponent],
      providers: [
        { provide: ApiService, useClass: MockApiService },
        { provide: BeaconService, useClass: MockBeaconService },
        { provide: AccountService, useClass: MockAccountService },
        { provide: BsModalService, useClass: MockBsModalService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the intro blurb', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h5')?.textContent).toContain(
      'Octez Connect Debug Wallet'
    );
  });
});
