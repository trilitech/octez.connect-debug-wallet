import { NetworkType } from '@tezos-x/octez.connect-types';
import { Component, OnInit } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Observable } from 'rxjs';
import {
  Account,
  AccountService,
  AccountType,
} from 'src/app/services/account.service';
import { ApiService } from 'src/app/services/api.service';
import { BeaconService } from 'src/app/services/beacon.service';

@Component({
  selector: 'app-accounts-overview',
  templateUrl: './accounts-overview.component.html',
  styleUrls: ['./accounts-overview.component.scss'],
  standalone: false,
})
export class AccountsOverviewComponent implements OnInit {
  title?: string;
  closeBtnName?: string;
  list: any[] = [];

  errorMessage?: string;

  address: string = '';

  accounts$: Observable<Account[]>;

  constructor(
    private readonly api: ApiService,
    private readonly beacon: BeaconService,
    private readonly accountService: AccountService,
    public readonly bsModalRef: BsModalRef
  ) {
    this.accounts$ = this.accountService.accounts$;
  }

  ngOnInit(): void {}

  async addBeaconWallet() {
    this.errorMessage = undefined;
    try {
      await this.beacon.dAppClient.clearActiveAccount();

      this.beacon.dAppClient.network = { type: NetworkType.MAINNET };
      const permissions = await this.beacon.dAppClient.requestPermissions({});

      const publicKey =
        permissions.publicKey ??
        (await this.api.getPublicKeyForAddress(permissions.address))?.publicKey;

      if (!publicKey) {
        this.errorMessage =
          'No public key found for this address. Please reveal the address on-chain, then try again.';
        return;
      }

      const peers = await this.beacon.dAppClient.getPeers();

      const peer = peers.find(
        (peer) => (peer as any).senderId === permissions.senderId
      );

      this.accountService.addOrUpdateAccount({
        address: permissions.address,
        publicKey,
        type: AccountType.BEACON,
        description: '',
        tags: [],
        network: NetworkType.MAINNET, // TODO: Remove?
        wallet: { name: peer?.name ?? '' },
      });

      this.bsModalRef.hide();
    } catch (error) {
      console.error('Failed to connect wallet', error);
      this.errorMessage =
        'Failed to connect wallet. Please try again (or check your RPC/network connection).';
    }
  }

  async addWatchOnlyWallet() {
    this.errorMessage = undefined;
    try {
      const publicKeyInfo = await this.api.getPublicKeyForAddress(this.address);

      this.accountService.addOrUpdateAccount({
        address: this.address,
        publicKey: publicKeyInfo.publicKey,
        type: AccountType.WATCH_ONLY,
        description: '',
        tags: [],
        network: publicKeyInfo.network,
        wallet: { name: '' },
      });

      this.bsModalRef.hide();
    } catch (error) {
      console.error('Failed to add watch-only wallet', error);
      this.errorMessage =
        'No public key found for this address. Please reveal the address on-chain, then try again.';
    }
  }

  async addMnemonic() {}
}
