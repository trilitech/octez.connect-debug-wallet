import {
  NetworkType,
  BeaconMessageType,
  BeaconErrorType,
  PermissionRequestOutput,
  PermissionScope,
  OperationRequestOutput,
  SignPayloadRequestOutput,
  PartialTezosOperation,
  PartialTezosTransactionOperation,
  BeaconRequestOutputMessage,
  OperationResponseInput,
  SignPayloadResponseInput,
} from '@tezos-x/octez.connect-types';
import { DAppClient } from '@tezos-x/octez.connect-dapp';
import { WalletClient } from '@tezos-x/octez.connect-wallet';
import {
  LocalStorage,
  Serializer,
  networkTypeFromTezosCaip2,
  normalizeTezosCaip2,
} from '@tezos-x/octez.connect-core';
import { Injectable, NgZone } from '@angular/core';
// import * as bs58check from 'bs58check';

import { first } from 'rxjs/operators';

import { RpcClient, OperationContents, OpKind } from '@taquito/rpc';
import { Account, AccountService, AccountType } from './account.service';
import { AccountsSelectionComponent } from '../components/accounts-selection/accounts-selection.component';
import { BsModalService, ModalOptions } from 'ngx-bootstrap/modal';
import { ApiService } from './api.service';

export interface LogAction {
  title: string;
  action: () => void;
}

@Injectable({
  providedIn: 'root',
})
export class BeaconService {
  // Chains the SDK cannot statically map (no entry in
  // TEZOS_NETWORK_GENESIS_IDS) but this wallet has an RPC for.
  private static readonly EXTRA_CAIP2_NETWORKS: Record<string, NetworkType> = {
    'tezos:NetXY2oPPzkxUW1': NetworkType.TEZOSX_PREVIEWNET,
  };

  public walletClient: WalletClient;
  public dAppClient: DAppClient;

  log: [Date, string, any, LogAction[]][] = [];

  constructor(
    private readonly accountService: AccountService,
    private readonly modalService: BsModalService,
    private readonly apiService: ApiService,
    private readonly zone: NgZone
  ) {
    const storage = new LocalStorage('INCOMING');
    this.walletClient = new WalletClient({
      name: 'Octez Connect Debug Wallet',
      storage,
    });

    const storageDApp = new LocalStorage('OUTGOING');
    this.dAppClient = new DAppClient({
      name: 'Octez Connect Debug Wallet',
      storage: storageDApp,
    });
    this.logClient();

    this.connect();
  }

  async logClient() {
    console.log('DAPP: ---');
    console.log('DAPP: name', this.dAppClient.name);
    console.log('DAPP: appUrl', this.dAppClient.appUrl);
    console.log('DAPP: iconUrl', this.dAppClient.iconUrl);
    console.log('DAPP: beaconId', await this.dAppClient.beaconId);
    console.log('DAPP: connectionStatus', this.dAppClient.connectionStatus);
    console.log('DAPP: getAccounts', await this.dAppClient.getAccounts());
    console.log('DAPP: blockExplorer', this.dAppClient.blockExplorer);
    console.log(
      'DAPP: getOwnAppMetadata',
      await this.dAppClient.getOwnAppMetadata()
    );
    console.log('DAPP: getPeers', await this.dAppClient.getPeers());
    console.log('DAPP: getAccounts', await this.dAppClient.getAccounts());
    console.log('DAPP: getColorMode', await this.dAppClient.getColorMode());
    console.log('DAPP: ---');
    console.log('DAPP: init');
  }

  connect() {
    this.walletClient.init().then(async () => {
      console.log('WALLET ---');
      console.log('WALLET name', this.walletClient.name);
      console.log('WALLET appUrl', this.walletClient.appUrl);
      console.log('WALLET iconUrl', this.walletClient.iconUrl);
      console.log('WALLET beaconId', await this.walletClient.beaconId);
      console.log(
        'WALLET connectionStatus',
        this.walletClient.connectionStatus
      );
      console.log('WALLET getAccounts', await this.walletClient.getAccounts());
      console.log(
        'WALLET getAppMetadataList',
        await this.walletClient.getAppMetadataList()
      );
      console.log(
        'WALLET getOwnAppMetadata',
        await this.walletClient.getOwnAppMetadata()
      );
      console.log('WALLET getPeers', await this.walletClient.getPeers());
      console.log(
        'WALLET getPermissions',
        await this.walletClient.getPermissions()
      );
      console.log('WALLET ---');
      console.log('WALLET init');
      this.walletClient
        // The transport can deliver messages outside the Angular zone (e.g.
        // via BroadcastChannel), so re-enter it — otherwise the message log
        // only renders on the next unrelated user interaction.
        .connect(async (message) =>
          this.zone.run(async () => {
            this.log.push([
              new Date(),
              `${message.appMetadata.name}: INCOMING MESSAGE (${message.type}) ${
                message.type === BeaconMessageType.OperationRequest
                  ? `${
                      message.operationDetails.length === 1
                        ? `${
                            (message.operationDetails[0] as any)?.amount
                          } mutez, Entrypoint: ${
                            (message.operationDetails[0] as any)?.parameters
                              ?.entrypoint
                          }`
                        : `${message.operationDetails.length} operations`
                    }`
                  : ''
              }`,
              message,
              [],
            ]);
            console.log('message', message);

            this.accountService.accounts$
              .pipe(first())
              .subscribe((accounts) => {
                if (message.type === BeaconMessageType.PermissionRequest) {
                  if (accounts.length === 0) {
                    console.error('No account found');
                    return;
                  } else if (accounts.length === 1) {
                    this.handlePermissionRequest(accounts[0], message);
                  } else {
                    const initialState: ModalOptions = {
                      initialState: {
                        network: message.network?.type,
                      },
                    };
                    const bsModalRef = this.modalService.show(
                      AccountsSelectionComponent,
                      initialState
                    );

                    bsModalRef.onHide?.pipe(first()).subscribe((result) => {
                      if (result && (result as any).isAccount) {
                        this.handlePermissionRequest(
                          (result as any).account,
                          message
                        );
                      }
                    });
                  }
                } else if (
                  message.type === BeaconMessageType.OperationRequest
                ) {
                  const account = accounts.find(
                    (acc) => acc.address === message.sourceAddress
                  );
                  if (!account) {
                    console.error(
                      'No account found for ' + message.sourceAddress
                    );
                    return;
                  }
                  this.handleOperationRequest(account, message);
                } else if (
                  message.type === BeaconMessageType.SignPayloadRequest
                ) {
                  const account = accounts.find(
                    (acc) => acc.address === message.sourceAddress
                  );
                  if (!account) {
                    console.error(
                      'No account found for ' + message.sourceAddress
                    );
                    return;
                  }
                  this.handleSignPayload(account, message);
                } else {
                  console.error('Message type not supported');
                  console.error('Received: ', message);

                  const response = {
                    type: BeaconMessageType.Error,
                    id: message.id,
                    errorType: BeaconErrorType.ABORTED_ERROR,
                  };
                  this.walletClient.respond(response as any);
                }
              });
          })
        )
        .catch((error) => console.error('connect error', error));
    }); // Establish P2P connection
  }

  public async addPeer(text: string) {
    const serializer = new Serializer();
    return serializer
      .deserialize(text)
      .then((peer) => {
        console.log('Adding peer', peer);
        return this.walletClient.addPeer(peer as any).then(() => {
          console.log('Peer added');
        });
      })
      .catch((e) => {
        console.error('not a valid sync code: ', e, text);
      });
  }

  private handlePermissionRequest(
    account: Account,
    message: PermissionRequestOutput
  ) {
    console.log('Sharing ', account);

    const response: any = {
      type: BeaconMessageType.PermissionResponse,
      network: message.network,
      scopes: [PermissionScope.OPERATION_REQUEST, PermissionScope.SIGN],
      id: message.id,
      publicKey: account.publicKey,
    };

    // v5 multi-network: when the dApp requested specific networks, return an
    // `accounts` fanout keyed by CAIP-2 chain id. A Tezos key pair is valid
    // on every network, so each entry shares this account's key.
    const networks = message.networks;
    if (Array.isArray(networks) && networks.length > 0) {
      response.accounts = {};
      for (const n of networks) {
        response.accounts[normalizeTezosCaip2(n.chainId)] = {
          publicKey: account.publicKey,
          address: account.address,
          name: n.name,
        };
      }
    }

    this.log.push([
      new Date(),
      `${message.appMetadata.name}: PERMISSION RESPONSE (${account.address}${
        Array.isArray(networks) && networks.length > 0
          ? ` on ${networks.map((n) => n.chainId).join(', ')}`
          : ''
      })`,
      response,
      [],
    ]);

    // Send response back to DApp
    this.walletClient.respond(response as any);
  }

  public async handleOperationRequest(
    account: Account,
    message: OperationRequestOutput
  ) {
    const operations: PartialTezosOperation[] = message.operationDetails;

    // v5 multi-network: on a multi-network session the operation targets a
    // specific chain via a CAIP-2 string (`tezos:<NetID>`); on legacy
    // sessions `network` is still a Network object.
    const networkType =
      typeof message.network === 'string'
        ? this.networkTypeFromCaip2(message.network)
        : message.network.type;
    const rpcUrl = networkType
      ? (this.apiService.RPCs as any)[networkType]?.selected
      : undefined;

    if (!rpcUrl) {
      this.log.push([
        new Date(),
        `${message.appMetadata.name}: NO RPC CONFIGURED FOR NETWORK ${JSON.stringify(
          message.network
        )}, skipping dry-run`,
        message.network,
        this.getSimulateActionButtons(account, message),
      ]);
      this.forwardOperation(account, message, operations);
      return;
    }

    try {
      const client = new RpcClient(rpcUrl);

      const { counter } = await client.getContract(account.address);
      console.log('COUNTER FROM API', counter);
      let nextCounter = parseInt(counter || '0', 10) + 1;
      console.log('nextCounter', nextCounter);
      const branch = (await client.getBlockHeader()).hash;
      // RPC requires a signature but does not verify it
      const SIGNATURE_STUB =
        'edsigtkpiSSschcaCt9pUVrpNPf7TTcgvgDEDD6NCEHMy8NNQJCGnMfLZzYoQj74yLjo9wx6MPVV29CvVzgi7qEcEUok3k7AuMg';
      const chainId = await client.getChainId();

      const typedOperations: OperationContents[] = operations.map(
        (op) =>
          ({
            source: account.address,
            counter: String(nextCounter++),
            fee: '10000',
            gas_limit: '1040000',
            storage_limit: '60000',
            ...(op as PartialTezosTransactionOperation),
            kind: OpKind.TRANSACTION,
          }) as any
      );

      // `runOperation` was removed from RpcClient (taquito >= 20); the
      // equivalent dry-run endpoint is `simulateOperation`.
      const res = await client.simulateOperation({
        operation: {
          branch,
          contents: typedOperations,
          signature: SIGNATURE_STUB,
        },
        chain_id: chainId,
      });
      this.log.push([
        new Date(),
        `${message.appMetadata.name}: RUN OPERATION SUCCESS`,
        res,
        this.getSimulateActionButtons(account, message),
      ]);
      console.log('RUN_OPERATION RESULT', res);
    } catch (err: any) {
      // The dry-run failing (e.g. the account not existing on this network
      // yet) must not swallow the request — log it and still forward below.
      this.log.push([
        new Date(),
        `${message.appMetadata.name}: RUN OPERATION ERROR`,
        err,
        this.getSimulateActionButtons(account, message, err),
      ]);
      console.log('RUN_OPERATION ERROR', err);
    } finally {
      this.forwardOperation(account, message, operations);
    }
  }

  private networkTypeFromCaip2(chainId: string): NetworkType | undefined {
    const normalized = normalizeTezosCaip2(chainId);
    return (
      networkTypeFromTezosCaip2(normalized) ??
      BeaconService.EXTRA_CAIP2_NETWORKS[normalized]
    );
  }

  private forwardOperation(
    account: Account,
    message: OperationRequestOutput,
    operations: PartialTezosOperation[]
  ) {
    if (account.type === AccountType.WATCH_ONLY) {
      // TODO: Show alert, let users decide if he wants to abort (send error) or simulate success (send random hash back)
    } else if (account.type === AccountType.BEACON) {
      this.dAppClient
        .requestOperation({
          operationDetails: operations,
          // Multi-network sessions REQUIRE the CAIP-2 target on operations;
          // pass it through so the outgoing wallet routes to the same chain.
          ...(typeof message.network === 'string'
            ? { network: message.network }
            : {}),
        })
        .then((res) => {
          console.log('res', res);

          const response: OperationResponseInput = {
            id: message.id,
            type: BeaconMessageType.OperationResponse,
            transactionHash: res.transactionHash,
          };

          this.log.push([
            new Date(),
            `${message.appMetadata.name}: Relayed message back to dApp`,
            response,
            [],
          ]);
          this.walletClient.respond(response);
        })
        .catch((err) => {
          console.log('BEACON WALLET ERROR', err);

          const response = {
            type: BeaconMessageType.Error,
            id: message.id,
            errorType: BeaconErrorType.ABORTED_ERROR,
          };

          this.log.push([
            new Date(),
            `${message.appMetadata.name}: Relayed error back to dApp`,
            response,
            [],
          ]);
          this.walletClient.respond(response as any);
        });
    } else if (account.type === AccountType.IN_MEMORY) {
      // TODO: Add in memory signing
    } else {
      console.log('ACCOUNT TYPE NOT BEACON');
    }
  }

  private handleSignPayload(
    account: Account,
    message: SignPayloadRequestOutput
  ) {
    if (account.type === AccountType.WATCH_ONLY) {
      // TODO
    } else if (account.type === AccountType.BEACON) {
      this.dAppClient
        .requestSignPayload({
          signingType: message.signingType,
          payload: message.payload,
          sourceAddress: message.sourceAddress,
        })
        .then((res) => {
          console.log('res', res);

          const response: SignPayloadResponseInput = {
            id: message.id,
            type: BeaconMessageType.SignPayloadResponse,
            signature: res.signature,
            signingType: res.signingType,
          };

          this.log.push([
            new Date(),
            `${message.appMetadata.name}: Relayed message back to dApp`,
            response,
            [],
          ]);
          this.walletClient.respond(response);
        })
        .catch((err) => {
          console.log('BEACON WALLET ERROR', err);

          const response = {
            type: BeaconMessageType.Error,
            id: message.id,
            errorType: BeaconErrorType.ABORTED_ERROR,
          };

          this.log.push([
            new Date(),
            `${message.appMetadata.name}: Relayed error back to dApp`,
            response,
            [],
          ]);
          this.walletClient.respond(response as any);
        });
    } else if (account.type === AccountType.IN_MEMORY) {
      // TODO: Add in memory signing
    } else {
      console.log('ACCOUNT TYPE NOT BEACON');
    }
  }

  private getSimulateActionButtons(
    account: Account,
    message: BeaconRequestOutputMessage,
    error?: any
  ) {
    if (account.type === AccountType.WATCH_ONLY) {
      return [
        {
          title: 'Send Back Success',
          action: () => {
            this.walletClient.respond({
              type: BeaconMessageType.OperationResponse,
              id: message.id,
              transactionHash: 'example-hash',
            });
          },
        },
        {
          title: 'Send Back Error',
          action: () => {
            const tryFormatError = () => {
              try {
                return JSON.parse(error.body);
              } catch {
                return error;
              }
            };
            const response = error
              ? {
                  type: BeaconMessageType.Error,
                  id: message.id,
                  errorType: BeaconErrorType.TRANSACTION_INVALID_ERROR,
                  errorData: tryFormatError(),
                }
              : {
                  type: BeaconMessageType.Error,
                  id: message.id,
                  errorType: BeaconErrorType.ABORTED_ERROR,
                };

            this.walletClient.respond(response as any);
          },
        },
      ];
    } else {
      return [];
    }
  }
}
