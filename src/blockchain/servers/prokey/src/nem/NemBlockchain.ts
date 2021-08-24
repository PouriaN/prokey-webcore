import {ProkeyBaseBlockChain} from "../ProkeyBaseBlockChain";
import {RequestAddressInfo} from "../../../../../models/GenericWalletModel";
import {NemAccountInfo, NemAccountTransactionResponse, NemTransactionResponse} from "./NemModels";

export class NemBlockchain extends ProkeyBaseBlockChain {
  _coinName: string;

  constructor(coinName: string = "Nem")
  {
    super("http://127.0.0.1:50001/api/");
    this._coinName = coinName;
  }

  public async BroadCastTransaction(data: string) {
  }

  public async GetAddressInfo(reqAddress: RequestAddressInfo) {
    try {
      return await this.GetFromServer<NemAccountInfo>(`${this._coinName}/account/${reqAddress.address}`);
    } catch (error) {
      return null;
    }
  }

  public async GetAccountTransactions(accountAddress: string, previousPageHash?: string) : Promise<Array<NemTransactionResponse> | null> {
    let queryUrl = `${this._coinName}/account/transaction/?accountAddress=${accountAddress}`;
    if (previousPageHash) {
      queryUrl += `&hash=${previousPageHash}`
    }
    let serverResponse = await this.GetFromServer<NemAccountTransactionResponse>(queryUrl);
    if (serverResponse != null && serverResponse.data != null)
    {
      return serverResponse.data;
    }
    return null;
  }

  public async GetLatestTransactions(trs: Array<number>, count: number, offset: number) {
  }

  public async GetTransactions(hash: string) {
  }
}
