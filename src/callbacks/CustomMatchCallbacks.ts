import { MatchCallbacks } from '@spt-aki/callbacks/MatchCallbacks';
import { MatchController } from '@spt-aki/controllers/MatchController';
import { ProfileHelper } from '@spt-aki/helpers/ProfileHelper';
import { TraderHelper } from '@spt-aki/helpers/TraderHelper';
import { INullResponseData } from '@spt-aki/models/eft/httpResponse/INullResponseData';
import { IEndOfflineRaidRequestData } from '@spt-aki/models/eft/match/IEndOfflineRaidRequestData';
import { DatabaseServer } from '@spt-aki/servers/DatabaseServer';
import { LocalisationService } from '@spt-aki/services/LocalisationService';
import { MailSendService } from '@spt-aki/services/MailSendService';
import { HttpResponseUtil } from '@spt-aki/utils/HttpResponseUtil';
import { JsonUtil } from '@spt-aki/utils/JsonUtil';
import { TimeUtil } from '@spt-aki/utils/TimeUtil';
import { inject, injectable } from 'tsyringe';
import { CooperationExtract } from '../events/CooperationExtract';

@injectable()
export class CustomMatchCallbacks extends MatchCallbacks {
    constructor(
        @inject('HttpResponseUtil') protected httpResponse: HttpResponseUtil,
        @inject('JsonUtil') protected jsonUtil: JsonUtil,
        @inject('MatchController') protected matchController: MatchController,
        @inject('DatabaseServer') protected databaseServer: DatabaseServer,
        @inject('ProfileHelper') protected profileHelper: ProfileHelper,
        @inject('TraderHelper') protected traderHelper: TraderHelper,
        @inject('MailSendService') protected mailSendService: MailSendService,
        @inject('LocalisationService') protected localisationService: LocalisationService,
        @inject('TimeUtil') protected timeUtil: TimeUtil
    ) {
        // Pass the parent class the callback dependencies it needs.
        super(httpResponse, jsonUtil, matchController, databaseServer);
    }

    /**
     * Handles route `client/match/offline/end`
     */
    public override endOfflineRaid(
        url: string,
        info: IEndOfflineRaidRequestData,
        sessionID: string
    ): INullResponseData {
        // Call the original method and get the result.
        const parentResult = super.endOfflineRaid(url, info, sessionID);

        // This is the custom part... Check to see if the extract is a coop extract. If it is, fire up the event.
        if (CooperationExtract.extractIsCoop(info.exitName) && CooperationExtract.hasSurvived(info.exitStatus)) {
            new CooperationExtract(
                sessionID,
                info,
                this.databaseServer,
                this.traderHelper,
                this.profileHelper,
                this.mailSendService,
                this.localisationService,
                this.timeUtil
            );
        }

        // Return the original method's result.
        return parentResult;
    }
}
