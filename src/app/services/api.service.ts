import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { NetworkType } from '@tezos-x/octez.connect-types';
import { StorageService } from './storage.service';

// Bump this when the default node list changes so stale nodes cached in
// localStorage (e.g. dead RPCs like mainnet.api.tez.ie) are discarded.
const STORAGE_KEY = 'nodes_v2';

const defaultNodes: Record<string, { selected: string; all: string[] }> = {
  [NetworkType.MAINNET]: {
    selected: 'https://tezos-mainnet.octez.io',
    all: [
      'https://tezos-mainnet.octez.io',
      'https://mainnet.smartpy.io',
      'https://rpc.tzbeta.net',
      'https://rpc.tzkt.io/mainnet',
    ],
  },
  [NetworkType.SHADOWNET]: {
    selected: 'https://tezos-shadownet.octez.io',
    all: [
      'https://tezos-shadownet.octez.io',
      'https://shadownet.smartpy.io',
      'https://rpc.shadownet.teztnets.com',
      'https://rpc.tzkt.io/shadownet',
    ],
  },
};

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  public RPCs: Record<string, { selected: string; all: string[] }> = defaultNodes;

  constructor(
    public readonly http: HttpClient,
    private readonly storage: StorageService
  ) {
    try {
      const parsedNodes = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '');
      this.RPCs = parsedNodes;
    } catch {}
  }

  public async getPublicKeyForAddress(
    address: string
  ): Promise<{ network: NetworkType; publicKey: string }> {
    // Try to get the public key from any network
    const RPCs: { network: NetworkType; url: string }[] = Object.entries(
      this.RPCs
    )
      .filter((element) => !!element[1].selected)
      .map((element) => ({
        network: element[0] as NetworkType,
        url: element[1].selected,
      }));

    // First try to get the public key from the selected RPC
    RPCs.unshift({
      network: NetworkType.MAINNET,
      url: this.RPCs.mainnet.selected,
    });

    for (const rpc of RPCs) {
      const result = await this.getPublicKeyForAddressFromRPC(rpc.url, address);

      if (result) {
        return { network: rpc.network, publicKey: result };
      }
    }

    throw new Error('No entry found');
  }

  private async getPublicKeyForAddressFromRPC(
    rpc: string,
    address: string
  ): Promise<string | null> {
    const url = `${rpc}/chains/main/blocks/head/context/contracts/${address}/manager_key`;
    const response = await firstValueFrom(this.http.get<string | null>(url));
    return response ?? null;
  }

  public async selectRpc(network: NetworkType, rpc: string) {
    (this.RPCs as any)[network].selected = rpc;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.RPCs));
  }

  public async addCustomRpc(network: NetworkType, rpc: string) {
    (this.RPCs as any)[network].all.push(rpc);

    this.selectRpc(network, rpc);
  }
}
