import type { Configuration } from '../types';
import { DependencyContainer } from 'tsyringe';
import { getLogger } from '../utils/logger';
import {
    getLocations,
    getAllEntryPoints,
    getConfigLocationName,
} from '../utils/locations';
import {
    adjustBackpackRequirements,
    adjustChance,
    adjustCliffRequirements,
    adjustCooperation,
    adjustEntryPoint,
    adjustExtractionTime,
} from '.';

/**
 * Adjusts all extracts based on the configuration.
 */
export function adjustExtracts(
    container: DependencyContainer,
    config: Configuration
): void {
    // Get the logger and debug flag from the configuration
    const logger = getLogger(container);
    const debug = config.general.debug;

    // Get the locations and enabled locations from the configuration
    const locations = getLocations(container);
    const enabledLocations = [
        'bigmap',
        'factory4_day',
        'factory4_night',
        'interchange',
        'laboratory',
        'lighthouse',
        'rezervbase',
        'shoreline',
        'tarkovstreets',
        'woods',
    ];

    // Iterate over all enabled locations and their extracts
    for (const location of enabledLocations) {
        for (const extract in locations[location].base.exits) {
            const extractName = locations[location].base.exits[extract].Name;

            // Adjust the entry point if the configuration allows it
            if (config.extracts.ignoreEntryPoint) {
                const newEntryPoints = getAllEntryPoints(locations[location]);
                adjustEntryPoint(
                    locations[location],
                    locations[location].base.exits[extract],
                    newEntryPoints,
                    debug,
                    logger
                );
            }

            // Adjust the chance of the extract appearing if the configuration allows it
            if (config.extracts.random.enabled) {
                const locationConfig =
                    config.extracts.random.chances[
                        getConfigLocationName(location)
                    ];
                if (
                    locationConfig !== undefined &&
                    locationConfig[extractName] !== undefined
                ) {
                    const configChance = locationConfig[extractName];
                    adjustChance(
                        locations[location],
                        locations[location].base.exits[extract],
                        configChance,
                        debug,
                        logger
                    );
                }
            }

            // Adjust the cooperation requirements if the configuration allows it
            if (
                locations[location].base.exits[extract].PassageRequirement !==
                'Train'
            ) {
                if (
                    config.extracts.cooperation.convertToPayment &&
                    locations[location].base.exits[extract]
                        .PassageRequirement === 'ScavCooperation'
                ) {
                    adjustCooperation(
                        locations[location],
                        locations[location].base.exits[extract],
                        config.extracts.cooperation.item,
                        config.extracts.cooperation.number,
                        debug,
                        logger
                    );
                }

                // Adjust the backpack requirements if the configuration allows it
                if (
                    config.extracts.ignoreBackpackRequirements &&
                    (locations[location].base.exits[extract].RequirementTip ===
                        'EXFIL_tip_backpack' ||
                        locations[location].base.exits[extract]
                            .RequirementTip === 'EXFIL_INTERCHANGE_HOLE_TIP') &&
                    locations[location].base.exits[extract].RequiredSlot ===
                        'Backpack'
                ) {
                    adjustBackpackRequirements(
                        locations[location],
                        locations[location].base.exits[extract],
                        debug,
                        logger
                    );
                }

                // Adjust the cliff requirements if the configuration allows it
                if (
                    config.extracts.ignoreCliffRequirements &&
                    extractName.toLowerCase().includes('alpinist')
                ) {
                    adjustCliffRequirements(
                        locations[location],
                        locations[location].base.exits[extract],
                        debug,
                        logger
                    );
                }

                // Adjust the extraction time if it exceeds the maximum allowed time
                if (
                    locations[location].base.exits[extract].ExfiltrationTime >
                    config.extracts.maxExtractionTime
                ) {
                    adjustExtractionTime(
                        locations[location],
                        locations[location].base.exits[extract],
                        config.extracts.maxExtractionTime,
                        debug,
                        logger
                    );
                }
            }

            // Set the exfiltration type and player count for the extract
            locations[location].base.exits[extract].ExfiltrationType =
                'Individual';
            locations[location].base.exits[extract].PlayersCount = 0;
        }
    }

    logger.log(
        `OpenExtracts: Extracts have been successfully adjusted according to the configuration.`,
        'cyan'
    );
}
