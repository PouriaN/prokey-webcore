import {ProkeyBaseBlockChain} from "../ProkeyBaseBlockChain";
import {RequestAddressInfo} from "../../../../../models/GenericWalletModel";
import {
    StellarAccountInfo,
    StellarFee,
    StellarTransactionOperation, StellarTransactionOperationResponse,
    StellarTransactionResponse
} from "./StelllarModels";

export class StellarBlockchain extends ProkeyBaseBlockChain {
    _coinName: string;

    // Constructor
    constructor(coinName: string = "Xlm")
    {
        super("http://127.0.0.1:50001/api/");
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

    public async GetAccountTransactions(accountAddress: string, limit: number = 10, cursor?: string): Promise<StellarTransactionResponse | null> {
        let queryUrl = `${this._coinName}/transaction/account/${accountAddress}?limit=${limit}`;
        if (cursor) {
            queryUrl += `cursor=${cursor}`
        }
        let serverResponse = await this.GetFromServer<any>(queryUrl);
        if (serverResponse != null && serverResponse.transactions != null)
        {
            return serverResponse;
        }
        return null;
    }

    public async GetTransactionOperations(transactionId: string): Promise<StellarTransactionOperationResponse | null> {
        let queryUrl = `${this._coinName}/transaction/${transactionId}/operations`;
        let serverResponse = await this.GetFromServer<any>(queryUrl);
        if (serverResponse != null && serverResponse.operations != null)
        {
            return serverResponse;
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
