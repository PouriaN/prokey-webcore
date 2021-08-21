import {BaseWallet} from "./BaseWallet";
import {Device} from "../device/Device";
import {CoinBaseType} from "../coins/CoinInfo";
import {StellarCoinInfoModel} from "../models/CoinInfoModel";
import * as PathUtil from "../utils/pathUtils";
import {
    AddressModel,
    StellarAddress, StellarAsset, StellarOperationMessage, StellarPaymentOp,
    StellarSignTransactionRequest,
    StellarSignTxMessage
} from "../models/Prokey";
import {StellarBlockchain} from "../blockchain/servers/prokey/src/stellar/Stellar";
import {
    StellarAccountInfo,
    StellarFee, StellarTransactionOperation, StellarTransactionOperationResponse,
    StellarTransactionResponse
} from "../blockchain/servers/prokey/src/stellar/StelllarModels";
import {Account, Asset, Memo, MemoText, Operation, TransactionBuilder} from "stellar-base";

var WAValidator = require('multicoin-address-validator');

export class StellarWallet extends BaseWallet {
    private readonly STELLAR_BASE_RESERVE = 0.5;
    private readonly _networkPassphrase = "Public Global Stellar Network ; September 2015";

    _block_chain: StellarBlockchain;
    _accounts: Array<StellarAccountInfo>;

    constructor(device: Device, coinName: string) {
        super(device, coinName, CoinBaseType.STELLAR);
        this._block_chain = new StellarBlockchain(this.GetCoinInfo().shortcut);
        this._accounts = new Array<StellarAccountInfo>();
    }

    public IsAddressValid(address: string): boolean {
        return WAValidator.validate(address, "xlm");
    }

    public async StartDiscovery(accountFindCallBack?: (accountInfo: StellarAccountInfo) => void): Promise<Array<StellarAccountInfo>> {
        return new Promise<Array<StellarAccountInfo>>(async (resolve, reject) => {
            let accountNumber = 0;
            do {
                let account = await this.GetAccountInfo(accountNumber);
                if (account == null) {
                    return resolve(this._accounts);
                }
                this._accounts.push(account);
                if (accountFindCallBack) {
                    accountFindCallBack(account);
                }
                accountNumber++;
            } while (true);
        });
    }

    private async GetAccountInfo(accountNumber: number): Promise<StellarAccountInfo | null> {
        let path = this.GetCoinPath(accountNumber);
        let address = await this.GetAddress<StellarAddress>(path.path, false);
        let accountInfo = await this._block_chain.GetAddressInfo({address: address.address})
        return accountInfo;
    }

    public async GetAccountTransactions(account: string, limit?: number, cursor?: string): Promise<StellarTransactionResponse | null> {
        return await this._block_chain.GetAccountTransactions(account, limit, cursor);
    }

    public async GetTransactionOperations(transactionId: string): Promise<StellarTransactionOperationResponse | null> {
        return await this._block_chain.GetTransactionOperations(transactionId);
    }

    public async GetCurrentFee(): Promise<StellarFee> {
        return await this._block_chain.GetCurrentFee();
    }

    public GenerateTransaction(toAccount: string, amount: number, accountNumber: number, selectedFee: string): StellarSignTransactionRequest {
        // TODO: add memo latter
        // Check balance
        let balance = this.GetAccountBalance(accountNumber);

        balance = balance - this.GetAccountReserveBalance(accountNumber) - amount - (+selectedFee);
        if (balance < 0)
            throw new Error(`Insufficient balance you need to hold ${this.GetAccountBalance(accountNumber)} XLM in your account.`);

        let path = this.GetCoinPath(accountNumber);

        const accountObject = this.GetAccount(accountNumber);

        let account = new Account(accountObject.account_id, accountObject.sequence.toString());
        const stellarTransactionModel = new TransactionBuilder(account, {fee: selectedFee, networkPassphrase: this._networkPassphrase })
            .addOperation(
                // this operation funds the new account with XLM
                Operation.payment({
                    destination: toAccount,
                    asset: Asset.native(),
                    amount: amount.toString()
                })
            )
            .setTimeout(180) // wait 3 min for transaction
            .addMemo(Memo.text("test text"))
            .build();

        let transaction: StellarSignTxMessage = {
            address_n: path.path,
            source_account: accountObject.account_id,
            fee: +selectedFee,
            sequence_number: accountObject.sequence.toString(),
            network_passphrase: this._networkPassphrase,
            num_operations: 1, // just one payment transaction
            memo_text: "test text",
            memo_type: 1
        };

        if (stellarTransactionModel.timeBounds) {
            transaction.timebounds_start = +stellarTransactionModel.timeBounds.minTime;
            transaction.timebounds_end = +stellarTransactionModel.timeBounds.maxTime;
        }

        let operation: StellarOperationMessage = {
            type: 'StellarPaymentOp',
            source_account: accountObject.account_id,
            destination_account: toAccount,
            asset: {
                type: 0,
                code: "XLM"
            },
            amount: (amount * 10_000_000).toString(),
        }

        return {signTxMessage: transaction, paymentOperation: operation, transactionModel: stellarTransactionModel};
    }

    public async SendTransaction(tx: string): Promise<any> {
        return await this._block_chain.BroadCastTransaction(tx);
    }

    public GetAccountBalance(accountNumber: number): number {
        let account = this.GetAccount(accountNumber);
        let nativeBalance = account.balances.find(balance => balance.asset_type === "native");
        if (nativeBalance) {
            return +nativeBalance.balance;
        }
        return 0;
    }

    public GetAccountReserveBalance(accountNumber: number) : number {
        let account = this.GetAccount(accountNumber);
        return (2 + account.subentry_count + account.num_sponsoring - account.num_sponsored) * this.STELLAR_BASE_RESERVE;
    }

    private GetAccount(accountNumber: number) {
        if (accountNumber >= this._accounts.length) {
            throw new Error('Account number is wrong');
        }
        return  this._accounts[accountNumber];
    }

  public GetCoinPath(accountNumber: number): AddressModel {
    let slip44 = (super.GetCoinInfo() as StellarCoinInfoModel).slip44;

    return <AddressModel>{
      path: [
        0x8000002C, // 44'
        0x80000000 + slip44, // 148'
        0x80000000 + accountNumber
      ],
      serializedPath: `44'/${slip44}'/${0x8000000 + accountNumber}'`
    }
  }
}
