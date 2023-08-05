import type { Exit } from '@spt-aki/models/eft/common/ILocationBase';
import type { ILocationData } from '@spt-aki/models/spt/server/ILocations';
import type { ILogger } from '@spt-aki/models/spt/utils/ILogger';
import { getHumanLocationName } from './../utils/locations';

/**
 * Adjusts the maximum extraction time of an extract.
 */
export function adjustExtractionTime(
    location: ILocationData,
    extract: Exit,
    maxExtractionTime: number,
    debug: boolean,
    logger: ILogger
): void {
    if (extract.ExfiltrationTime > maxExtractionTime) {
        extract.ExfiltrationTime = maxExtractionTime;
        if (debug) {
            logger.log(
                `OpenExtracts: ${extract.Name} on ${getHumanLocationName(
                    location.base.Id
                )} has had its extraction time updated to ${maxExtractionTime} seconds.`,
                'gray'
            );
        }
    }
}
