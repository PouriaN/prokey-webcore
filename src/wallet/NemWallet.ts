import {BaseWallet} from "./BaseWallet";
import {NemBlockchain} from "../blockchain/servers/prokey/src/nem/NemBlockchain";
import {
  NemAccount,
  NemAccountInfo,
  NemTransaction,
  NemTransactionResponse
} from "../blockchain/servers/prokey/src/nem/NemModels";
import {CoinBaseType} from "../coins/CoinInfo";
import {Device} from "../device/Device";
import {NemCoinInfoModel} from "../models/CoinInfoModel";
import * as PathUtil from "../utils/pathUtils";
import {AddressModel, NEMAddress} from "../models/Prokey";

export class NemWallet extends BaseWallet {
  _block_chain : NemBlockchain;
  _accounts: Array<NemAccount>;

  constructor(device: Device, coinName: string) {
    super(device, coinName, CoinBaseType.NEM);
    this._block_chain = new NemBlockchain(this.GetCoinInfo().shortcut);
    this._accounts = [];
  }

  IsAddressValid(address: string): boolean {
    return false;
  }

  public async StartDiscovery(accountFindCallBack?: (accountInfo: NemAccount) => void): Promise<Array<NemAccount>>
  {
    return new Promise<Array<NemAccount>>(async (resolve, reject) => {
      let accountNumber = 0;
      this._accounts = new Array<NemAccount>();
      do
      {
        let accountInfo = await this.GetAccountInfo(accountNumber);
        if (accountInfo == null)
        {
          return resolve(this._accounts);
        }
        this._accounts.push(accountInfo.account);
        if (accountFindCallBack) {
          accountFindCallBack(accountInfo.account);
        }
        accountNumber++;
      } while(true);
    });
  }

  private async GetAccountInfo(accountNumber: number): Promise<NemAccountInfo | null> {
    let address = await this.GetAccountAddress(accountNumber);

    return await this._block_chain.GetAddressInfo({address: address.address});
  }

  public async GetAccountTransactions(account: string): Promise<Array<NemTransaction>> {
    let nemTransactionsResponse = await this._block_chain.GetAccountTransactions(account);
    if (nemTransactionsResponse) {
      let nemTransactions: Array<NemTransaction> = new Array<NemTransaction>();
      for (const nemTransactionResponse of nemTransactionsResponse) {
        nemTransactions.push(nemTransactionResponse.transaction);
      }
      return nemTransactions;
    }
    return [];
  }

  private async GetAccountAddress(accountNumber: number) {
    let path = this.GetCoinPath(accountNumber);

    return await this.GetAddress<NEMAddress>(path.path, false);
  }

  public GetCoinPath(accountNumber: number): AddressModel {
    let slip44 = (super.GetCoinInfo() as NemCoinInfoModel).slip44;
    return <AddressModel>{
      path: [
        0x8000002C, // 44'
        0x80000000 + slip44, // 43'
        0x80000000 + accountNumber
      ],
      serializedPath: `44'/${slip44}'/${0x8000000 + accountNumber}'`
    }
  }
}
