import type { Exit } from '@spt-aki/models/eft/common/ILocationBase';
import type { ILocationData } from '@spt-aki/models/spt/server/ILocations';
import type { ILogger } from '@spt-aki/models/spt/utils/ILogger';
import { getHumanLocationName } from './../utils/locations';

/**
 * Adjusts the backpack requirements for a given extract.
 */
export function adjustBackpackRequirements(
    location: ILocationData,
    extract: Exit,
    debug: boolean,
    logger: ILogger
): void {
    if (extract.RequiredSlot === 'Backpack') {
        extract.PassageRequirement = 'None';
        extract.RequiredSlot = 'FirstPrimaryWeapon';
        extract.RequirementTip = '';

        if (debug) {
            logger.log(
                `OpenExtracts: ${extract.Name} on ${getHumanLocationName(
                    location.base.Id
                )} has had its backpack requirement removed.`,
                'gray'
            );
        }
    }
}
