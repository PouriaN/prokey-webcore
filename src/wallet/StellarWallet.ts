import {BaseWallet} from "./BaseWallet";
import {Device} from "../device/Device";
import {CoinBaseType} from "../coins/CoinInfo";
import {RippleCoinInfoModel, StellarCoinInfoModel} from "../models/CoinInfoModel";
import * as PathUtil from "../utils/pathUtils";
import {
    AddressModel,
    RippleSignedTx,
    RippleTransaction,
    StellarAddress, StellarAsset, StellarOperationMessage, StellarPaymentOp,
    StellarSignTransactionRequest,
    StellarSignTxMessage
} from "../models/Prokey";
import {StellarBlockchain} from "../blockchain/servers/prokey/src/stellar/Stellar";
import {
    StellarAccountInfo,
    StellarFee,
    StellarTransactionResponse
} from "../blockchain/servers/prokey/src/stellar/StelllarModels";
import {Account} from "stellar-sdk";
var StellarSdk = require('stellar-sdk');

var WAValidator = require('multicoin-address-validator');

export class StellarWallet extends BaseWallet {
    private readonly STELLAR_BASE_RESERVE = 0.5;

    _block_chain: StellarBlockchain;
    _accounts: Array<StellarAccountInfo>;

    constructor(device: Device, coinName: string) {
        super(device, coinName, CoinBaseType.Ripple);
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

    // Get ripple account info from blockchain
    private async GetAccountInfo(accountNumber: number): Promise<StellarAccountInfo | null> {
        let path = this.GetCoinPath(accountNumber);
        let address = await this.GetAddress<StellarAddress>(path.path, false);

        return await this._block_chain.GetAddressInfo({address: address.address});
    }

    public async GetAccountTransactions(account: string, limit?: number, cursor?: string): Promise<StellarTransactionResponse | null> {
        return await this._block_chain.GetAccountTransactions(account, limit, cursor);
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

        let transaction: StellarSignTxMessage = {
            address_n: path.path,
            source_account: path.address,
            fee: +selectedFee,
            sequence_number: this.GetAccount(accountNumber).sequence.toString(),
            network_passphrase: StellarSdk.Networks.PUBLIC,
            num_operations: 1 // just one payment transaction
        };
        let operation: StellarOperationMessage = {
            type: 'StellarPaymentOp',
            source_account: path.address,
            destination_account: toAccount,
            asset: {
                type: 0,
                code: "XLM"
            },
            amount: amount.toString(),
        }

        let account = new Account(this.GetAccount(accountNumber).account_id, this.GetAccount(accountNumber).sequence.toString());

        const stellarTransactionModel = new StellarSdk.TransactionBuilder(account, {fee: selectedFee, networkPassphrase: StellarSdk.Networks.PUBLIC })
            .addOperation(
                // this operation funds the new account with XLM
                StellarSdk.Operation.payment({
                    destination: toAccount,
                    asset: StellarSdk.Asset.native(),
                    amount: amount
                })
            )
            .build();
        return {signTxMessage: transaction, paymentOperation: operation, transactionModel: stellarTransactionModel};
    }

    public async SendTransaction(tx: RippleSignedTx): Promise<any> {
        return await this._block_chain.BroadCastTransaction(tx.serialized_tx);
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

    private GetCoinPath(accountNumber: number): AddressModel {
        let slip44 = (super.GetCoinInfo() as StellarCoinInfoModel).slip44;
        let path = PathUtil.GetListOfBipPath(
            slip44,
            accountNumber,          // each address is considered as an account
            1,        // We only need an address
            false,           // Segwit not defined so we should use 44'
            false,           // No change address defined in ripple
            0);
        return path[0];
    }
}
