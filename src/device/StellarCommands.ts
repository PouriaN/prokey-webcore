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
import {StrKey, Transaction} from "stellar-base";
import {StellarAccountInfo} from "../blockchain/servers/prokey/src/stellar/StelllarModels";
import * as Utility from "../utils/utils";
import { util } from "protobufjs";
import { ByteArrayToHexString } from "../utils/utils"

export class StellarCommands implements ICoinCommands {
    private readonly _coinInfo: StellarCoinInfoModel;

    constructor(coinName: string) {
        this._coinInfo = CoinInfo.Get<RippleCoinInfoModel>(coinName, CoinBaseType.STELLAR);
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

    public async SignMessage(device: Device, path: Array<number>, message: Uint8Array, coinName?: string): Promise<MessageSignature> {
        let scriptType = PathUtil.GetScriptType(path);

        let res = await device.SendMessage<ProkeyResponses.MessageSignature>('SignMessage', {
            address_n: path,
            message: message,
            coin_name: coinName || 'Stellar',
            script_type: scriptType,
        }, 'MessageSignature');

        if (res.signature) {
            res.signature = Utility.ByteArrayToHexString(res.signature);
        }

        return res;
    }

    public async SignTransaction(device: Device, transactionForSign: StellarSignTransactionRequest): Promise<string> {
        MyConsole.Info("StellarSignTx", transactionForSign);
        if (!device) {
            let e: GeneralResponse = {
                success: false,
                errorCode: GeneralErrors.INVALID_PARAM,
                errorMessage: "StellarCommands::SignTransaction->parameter Device cannot be null",
            }

            throw e;
        }

        if (!transactionForSign) {
            let e: GeneralResponse = {
                success: false,
                errorCode: GeneralErrors.INVALID_PARAM,
                errorMessage: "StellarCommands::SignTransaction->parameter transaction cannot be null",
            }

            throw e;
        }

        let operationRequest = await device.SendMessage<ProkeyResponses.StellarTxOpRequest>('StellarSignTx', transactionForSign.signTxMessage, 'StellarTxOpRequest');

        return await this.prepareTransactionForBroadcast(device, transactionForSign);
    }

    public async VerifyMessage(device: Device, address: string, message: Uint8Array, signature: Uint8Array, coinName?: string): Promise<Success> {
        return await device.SendMessage<ProkeyResponses.Success>('VerifyMessage', {
            address: address,
            signature: signature,
            message: message,
            coin_name: coinName || 'Stellar',
        }, 'Success');
    }

    public GetAddressArray(path: Array<number> | string) : Array<number> {
        if (typeof path == "string") {
                return  PathUtil.getHDPath(path);
        } else {
            return  path;
        }
    }

    private async prepareTransactionForBroadcast(device: Device, transactionForSign: StellarSignTransactionRequest) {
        let signResponse = await device.SendMessage<StellarSignedTx>('StellarPaymentOp', transactionForSign.paymentOperation, 'StellarSignedTx');
        let transactionModel = transactionForSign.transactionModel;
        let stringSignature = ByteArrayToHexString(signResponse.signature);
        let decodedPublicKey = StrKey.encodeEd25519PublicKey(signResponse.public_key as Buffer);
        transactionModel.addSignature(
            decodedPublicKey,
            Buffer.from(stringSignature, 'hex').toString('base64')
        );
      return transactionModel.toEnvelope().toXDR().toString("base64");
    }
}
