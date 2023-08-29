import { ILocationBase } from '@spt-aki/models/eft/common/ILocationBase';
import { ILocations } from '@spt-aki/models/spt/server/ILocations';
import { DatabaseServer } from '@spt-aki/servers/DatabaseServer';
import { DependencyContainer } from 'tsyringe';

// TODO: All of these can be moved into the model classes.

/**
 * Fetches the locations from the database.
 *
 * @param container The dependency injection container.
 * @returns The locations from the database.
 */
export function getLocations(container: DependencyContainer): ILocations {
    return container.resolve<DatabaseServer>('DatabaseServer').getTables().locations;
}

/**
 * Returns a comma-separated string of all entry points for a given location.
 *
 * @param location The location data object.
 * @returns A comma-separated string of all entry points.
 */
export function getAllEntryPoints(location: ILocationBase): string {
    const entryPointsSet = new Set<string>();
    for (const extract in location.exits) {
        const entryPoints = location.exits[extract].EntryPoints.split(',');
        entryPoints.forEach((entryPoint: string) => entryPointsSet.add(entryPoint));
    }
    return Array.from(entryPointsSet).join(',');
}

/**
 * Fetches the name of the location as it's stored in the configuration file.
 *
 * @param gameLocationName The name of the location as it's stored in the game.
 * @returns The name of the location as it's stored in the configuration file.
 */
export function getConfigLocationName(gameLocationName: string): string {
    const location = gameLocationName.toLowerCase();

    switch (location) {
        case 'bigmap':
            return 'customs';
        case 'factory4_day':
            return 'factoryDay';
        case 'factory4_night':
            return 'factoryNight';
        case 'rezervbase':
        case 'reservebase':
            return 'reserve';
        case 'tarkovstreets':
            return 'streets';
        default:
            return location;
    }
}

/**
 * Returns the human-readable name of a game location based on its internal name.
 *
 * @param gameLocationName The internal name of the location to convert.
 * @returns The human-readable name of the location, or the input name if it is not recognized.
 */
export function getHumanLocationName(gameLocationName: string): string {
    const location = gameLocationName.toLowerCase();

    switch (location) {
        case 'bigmap':
            return 'Customs';
        case 'factory4_day':
            return 'Factory (Day)';
        case 'factory4_night':
            return 'Factory (Night)';
        case 'interchange':
            return 'Interchange';
        case 'laboratory':
            return 'Laboratory';
        case 'lighthouse':
            return 'Lighthouse';
        case 'rezervbase':
        case 'reservebase':
            return 'Reserve';
        case 'shoreline':
            return 'Shoreline';
        case 'tarkovstreets':
            return 'Streets of Tarkov';
        case 'woods':
            return 'Woods';
        default:
            return location;
    }
}
