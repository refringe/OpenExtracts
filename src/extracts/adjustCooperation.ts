import type { Exit } from '@spt-aki/models/eft/common/ILocationBase';
import type { ILocationData } from '@spt-aki/models/spt/server/ILocations';
import type { ILogger } from '@spt-aki/models/spt/utils/ILogger';
import { getHumanLocationName } from './../utils/locations';

/**
 * Converts a cooperation extract to a payment extract.
 */
export function adjustCooperation(
    location: ILocationData,
    extract: Exit,
    item: string,
    number: number,
    debug: boolean,
    logger: ILogger
): void {
    if (extract.PassageRequirement === 'ScavCooperation') {
        extract.PassageRequirement = 'TransferItem';
        extract.RequirementTip = 'EXFIL_Item';
        extract.Id = item;
        extract.Count = number;

        if (debug) {
            logger.log(
                `OpenExtracts: ${extract.Name} on ${getHumanLocationName(
                    location.base.Id
                )} has been converted to a payment extract.`,
                'gray'
            );
        }
    }
}
