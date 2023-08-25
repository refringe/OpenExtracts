import type { Exit } from '@spt-aki/models/eft/common/ILocationBase';
import type { ILocationData } from '@spt-aki/models/spt/server/ILocations';
import type { ILogger } from '@spt-aki/models/spt/utils/ILogger';
import { getHumanLocationName } from './../utils/locations';

/**
 * Adjusts the chance for a given extract to be available.
 */
export function adjustChance(
    location: ILocationData,
    extract: Exit,
    configChance: number,
    debug: boolean,
    logger: ILogger
): void {
    if (configChance >= 0 && configChance <= 100 && configChance !== extract.Chance) {
        const originalChance = extract.Chance;
        extract.Chance = configChance;
        if (debug) {
            logger.log(
                `OpenExtracts: ${extract.Name} on ${getHumanLocationName(
                    location.base.Id
                )} has had its chance to be enabled changed from ${originalChance}% to ${configChance}%.`,
                'gray'
            );
        }
    }
}
