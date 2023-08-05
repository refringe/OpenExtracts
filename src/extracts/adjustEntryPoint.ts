import type { Exit } from '@spt-aki/models/eft/common/ILocationBase';
import type { ILocationData } from '@spt-aki/models/spt/server/ILocations';
import type { ILogger } from '@spt-aki/models/spt/utils/ILogger';
import { getHumanLocationName } from './../utils/locations';

/**
 * Adjusts the entry point of an extract.
 */
export function adjustEntryPoint(
    location: ILocationData,
    extract: Exit,
    newEntryPoint: string,
    debug: boolean,
    logger: ILogger
): void {
    if (extract.EntryPoints !== newEntryPoint) {
        extract.EntryPoints = newEntryPoint;
        if (debug) {
            logger.log(
                `OpenExtracts: ${extract.Name} on ${getHumanLocationName(
                    location.base.Id
                )} has been updated to allow all entry points: ${newEntryPoint}.`,
                'gray'
            );
        }
    }
}
