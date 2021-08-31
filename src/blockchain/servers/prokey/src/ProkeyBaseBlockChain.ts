import { httpclient } from "typescript-http-client";
import Request = httpclient.Request
import {RequestAddressInfo} from "../../../../models/GenericWalletModel";

export abstract class ProkeyBaseBlockChain {
  private _baseUrl;

  constructor(baseUrl: string =  'https://blocks.prokey.org/') {
    this._baseUrl = baseUrl;
  }

  // These functions must be implemented in child classes
  public abstract GetAddressInfo(reqAddresses: Array<RequestAddressInfo> | RequestAddressInfo);
  public abstract GetTransactions(hash: string);
  public abstract GetLatestTransactions(trs: Array<number>, count : number, offset: number);
  public abstract BroadCastTransaction(data: any);

  /**
   * This is a private helper function to GET data from server
   * @param toServer URL + data
   * @param changeJson a callback for adjust json before casting
   */
  protected async GetFromServer<T>(toServer: string, changeJson?: (json: string) => string) {

    const client = httpclient.newHttpClient();

    const request = new Request(this._baseUrl + toServer, { method: 'GET' });

    let json = await client.execute<string>(request);

    if (changeJson) {
      json = changeJson(json);
    }
    console.log(json);

    if (typeof json == "string") {
      return JSON.parse(json) as T;
    } else {
      return json as T;
    }
  }

  protected async PostToServer<T>(toServer: string, body: any, changeJson?: (json: string) => string): Promise<T> {
    const client = httpclient.newHttpClient();

    const request = new Request(this._baseUrl + toServer, {body: body, method: 'POST'});

    let json = await client.execute<string>(request);

    if (changeJson) {
      json = changeJson(json);
    }
    console.log(json);

    if (typeof json == "string") {
      return JSON.parse(json) as T;
    } else {
      return json as T;
    }
  }
}
