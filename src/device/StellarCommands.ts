import {ICoinCommands} from "./ICoinCommand";
import {RippleCoinInfoModel, StellarCoinInfoModel} from "../models/CoinInfoModel";
import {CoinBaseType, CoinInfo} from "../coins/CoinInfo";
import {Device} from "./Device";
import {
    MessageSignature,
    PublicKey,
    StellarAddress, StellarOperationMessage,
    StellarSignedTx,
    StellarSignTransactionRequest,
    Success
} from "../models/Prokey";
import {GeneralErrors, GeneralResponse} from "../models/GeneralResponse";
import * as PathUtil from "../utils/pathUtils";
import * as ProkeyResponses from "../models/Prokey";
import {MyConsole} from "../utils/console";

export class StellarCommands implements ICoinCommands {
    private readonly _coinInfo: StellarCoinInfoModel;

    constructor(coinName: string) {
        this._coinInfo = CoinInfo.Get<RippleCoinInfoModel>(coinName, CoinBaseType.Ripple);
    }

    public async GetAddress(device: Device, path: Array<number> | string, showOnProkey: boolean = true): Promise<StellarAddress> {
        if (device == null || path == null) {
            return Promise.reject({ success: false, errorCode: GeneralErrors.INVALID_PARAM });
        }
        let address_n: Array<number>;
        try {
            address_n = this.GetAddressArray(path);
        }
        catch (e) {
            return Promise.reject({ success: false, errorCode: GeneralErrors.PATH_NOT_VALID });
        }

        let param = {
            address_n: address_n,
            show_display: showOnProkey,
        }

        return await device.SendMessage<ProkeyResponses.StellarAddress>('StellarGetAddress', param, 'StellarAddress');
    }

    public async GetAddresses(device: Device, paths: Array<Array<number> | string>): Promise<Array<StellarAddress>> {
        let stellarAddresses: Array<StellarAddress> = new Array<StellarAddress>();
        for (const path of paths) {
            stellarAddresses.push(await this.GetAddress(device, path, false));
        }
        return stellarAddresses;
    }

    public GetCoinInfo(): StellarCoinInfoModel {
        return this._coinInfo;
    }

    public async GetPublicKey(device: Device, path: Array<number> | string, showOnProkey: boolean = true): Promise<PublicKey> {
        if (device == null || path == null) {
            return Promise.reject({ success: false, errorCode: GeneralErrors.INVALID_PARAM });
        }
        let address_n: Array<number>;
        try {
            address_n = this.GetAddressArray(path);
        }
        catch (e) {
            return Promise.reject({ success: false, errorCode: GeneralErrors.PATH_NOT_VALID });
        }
        let param = {
            address_n: address_n,
            show_display: showOnProkey,
        }

        return await device.SendMessage<ProkeyResponses.PublicKey>('GetPublicKey', param, 'PublicKey');
    }

    SignMessage(device: Device, path: Array<number>, message: Uint8Array, coinName?: string): Promise<MessageSignature> {
    }

    public async SignTransaction(device: Device, transaction: StellarSignTransactionRequest): Promise<StellarSignedTx> {
        MyConsole.Info("StellarSignTx", transaction);
        if (!device) {
            let e: GeneralResponse = {
                success: false,
                errorCode: GeneralErrors.INVALID_PARAM,
                errorMessage: "StellarCommands::SignTransaction->parameter Device cannot be null",
            }

            throw e;
        }

        if (!transaction) {
            let e: GeneralResponse = {
                success: false,
                errorCode: GeneralErrors.INVALID_PARAM,
                errorMessage: "StellarCommands::SignTransaction->parameter transaction cannot be null",
            }

            throw e;
        }

        // send stellar sign
        // check it
        let operationRequest = await device.SendMessage<ProkeyResponses.StellarTxOpRequest>('StellarSignTx', transaction.signTxMessage, 'StellarTxOpRequest');
        // send operation
        let confirmation = await device.SendMessage<StellarOperationMessage>('StellarPaymentOp', transaction.paymentOperation, 'StellarSignedTx');
    }

    VerifyMessage(device: Device, address: string, message: Uint8Array, signature: Uint8Array, coinName?: string): Promise<Success> {
        return Promise.resolve(undefined);
    }

    public GetAddressArray(path: Array<number> | string) : Array<number>{
        if (typeof path == "string") {
                return  PathUtil.getHDPath(path);
        } else {
            return  path;
        }
    }
}
