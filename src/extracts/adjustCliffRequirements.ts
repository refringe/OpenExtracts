import type { Exit } from '@spt-aki/models/eft/common/ILocationBase';
import type { ILocationData } from '@spt-aki/models/spt/server/ILocations';
import type { ILogger } from '@spt-aki/models/spt/utils/ILogger';
import { getHumanLocationName } from './../utils/locations';

/**
 * Adjusts the cliff requirements for a given extract.
 */
export function adjustCliffRequirements(location: ILocationData, extract: Exit, debug: boolean, logger: ILogger): void {
    if (extract.Name.toLowerCase().includes('alpinist') && extract.PassageRequirement === 'Reference') {
        extract.Id = '';
        extract.PassageRequirement = 'None';

        if (debug) {
            logger.log(
                `OpenExtracts: ${extract.Name} on ${getHumanLocationName(
                    location.base.Id
                )} has had its paracord, red rebel, and armored rig requirements removed.`,
                'gray'
            );
        }
    }
}
