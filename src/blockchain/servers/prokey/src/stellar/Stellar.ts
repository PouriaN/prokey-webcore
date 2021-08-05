import {ProkeyBaseBlockChain} from "../ProkeyBaseBlockChain";
import {RequestAddressInfo} from "../../../../../models/GenericWalletModel";
import {StellarAccountInfo, StellarFee, StellarTransactionResponse} from "./StelllarModels";

export class StellarBlockchain extends ProkeyBaseBlockChain {
    _coinName: string;

    // Constructor
    constructor(coinName: string = "Xlm")
    {
        super();
        this._coinName = coinName;
    }

    public async BroadCastTransaction(data: string): Promise<any> {
        return await this.PostToServer<any>(`${this._coinName}/transaction/submit`, {"SignedTransactionBlob": data});
    }

    public async GetAddressInfo(reqAddress: RequestAddressInfo) : Promise<StellarAccountInfo | null> {
        try {
            return await this.GetFromServer<StellarAccountInfo>(`${this._coinName}/account/${reqAddress.address}`);
        } catch (error) {
            return null;
        }
    }

    public async GetAccountTransactions(accountAddress: string, limit: number = 10, cursor?: string): Promise<StellarTransactionResponse | null>
    {
        let queryUrl = `address/transactions/${this._coinName}/${accountAddress}?limit=${limit}`;
        if (cursor) {
            queryUrl += `cursor=${cursor}`
        }
        let serverResponse = await this.GetFromServer<any>(queryUrl);
        if (serverResponse != null && serverResponse.result.transactions != null)
        {
            return serverResponse.result;
        }
        return null;
    }

    public async GetCurrentFee(): Promise<StellarFee> {
        return await this.GetFromServer<StellarFee>(`${this._coinName}/fee`);
    }

    GetLatestTransactions(trs: Array<number>, count: number, offset: number) {
    }

    GetTransactions(hash: string) {
    }
}