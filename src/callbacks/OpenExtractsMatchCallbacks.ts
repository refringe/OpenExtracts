import { inject, injectable } from 'tsyringe';
import { MatchController } from '@spt-aki/controllers/MatchController';
import { INullResponseData } from '@spt-aki/models/eft/httpResponse/INullResponseData';
import { IEndOfflineRaidRequestData } from '@spt-aki/models/eft/match/IEndOfflineRaidRequestData';
import { DatabaseServer } from '@spt-aki/servers/DatabaseServer';
import { HttpResponseUtil } from '@spt-aki/utils/HttpResponseUtil';
import { JsonUtil } from '@spt-aki/utils/JsonUtil';
import { MatchCallbacks } from '@spt-aki/callbacks/MatchCallbacks';

@injectable()
export class OpenExtractsMatchCallbacks extends MatchCallbacks {
    constructor(
        @inject('HttpResponseUtil') protected httpResponse: HttpResponseUtil,
        @inject('JsonUtil') protected jsonUtil: JsonUtil,
        @inject('MatchController') protected matchController: MatchController,
        @inject('DatabaseServer') protected databaseServer: DatabaseServer
    ) {
        // Pass the parent class the callback dependencies it needs.
        super(httpResponse, jsonUtil, matchController, databaseServer);
    }

    /** Handle client/match/offline/end */
    public override endOfflineRaid(
        url: string,
        info: IEndOfflineRaidRequestData,
        sessionID: string
    ): INullResponseData {
        // Call the original method and get the result.
        const parentResult = super.endOfflineRaid(url, info, sessionID);

        // Return the original method's result.
        return parentResult;
    }
}
