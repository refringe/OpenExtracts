import { Exit, ILocationBase } from '@spt-aki/models/eft/common/ILocationBase';
import { OpenExtracts } from '../OpenExtracts';
import { getAllEntryPoints, getConfigLocationName, getHumanLocationName, getLocations } from '../utils/locations';

/**
 * This class is responsible for adjusting extracts according to the configuration.
 */
export class ModifyExtracts {
    constructor() {
        this.makeAdjustments();
    }

    /**
     * Orchestrates the adjustment of extracts according to the configuration.
     */
    private makeAdjustments(): void {
        const locations = getLocations(OpenExtracts.container);
        const enabledLocations = ModifyExtracts.getEnabledLocations();

        // Iterate over all of the enabled location's exits.
        for (const locationName of enabledLocations) {
            const location = locations[locationName].base as ILocationBase;
            for (const extract of location.exits) {
                this.commonAdjustments(extract);
                this.enableAllEntryPoints(extract, location);
                this.adjustChanceEnabled(extract, location);
                this.adjustMaximumExtractTime(extract, location);

                // We can finish here if this is a train extract.
                if (extract.PassageRequirement === 'Train') {
                    continue;
                }

                this.convertCooperationToPayment(extract, location);
                this.removeBackpackRequirement(extract, location);
                this.removeCliffRequirements(extract, location);
            }
        }

        OpenExtracts.logger.log(
            `OpenExtracts: Extracts have been successfully adjusted according to the configuration.`,
            'cyan'
        );
    }

    /**
     * Get a list of locations to adjust.
     */
    private static getEnabledLocations(): Set<string> {
        return new Set<string>([
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
        ]);
    }

    /**
     * Perform adjustments that are common to all extracts.
     */
    private commonAdjustments(extract: Exit): void {
        // This is SPT; all extracts should be individual and have no minimum player requirement.
        extract.ExfiltrationType = 'Individual';
        extract.PlayersCount = 0;
    }

    /**
     * Enable all entry points for an extract, making the extract useable no matter where the player spawns.
     */
    private enableAllEntryPoints(extract: Exit, location: ILocationBase): void {
        if (!OpenExtracts.config.extracts.ignoreEntryPoint) {
            // Option has been disabled in the configuration file.
            return;
        }

        // Dynamically get all of the entry points for this location.
        const allEntryPoints = getAllEntryPoints(location);

        // Update the database and log it if debug is enabled.
        if (extract.EntryPoints !== allEntryPoints) {
            extract.EntryPoints = allEntryPoints;

            if (OpenExtracts.config.general.debug) {
                OpenExtracts.logger.log(
                    `OpenExtracts: ${extract.Name} on ${getHumanLocationName(
                        location.Id
                    )} has been updated to allow all entry points: ${allEntryPoints}.`,
                    'gray'
                );
            }
        }
    }

    /**
     * Adjust the chance of the extract being enabled.
     */
    private adjustChanceEnabled(extract: Exit, location: ILocationBase): void {
        if (!OpenExtracts.config.extracts.random.enabled) {
            // Option has been disabled in the configuration file.
            return;
        }

        const locationConfig = OpenExtracts.config.extracts.random.chances[getConfigLocationName(location.Id)];

        // TODO: this check shouldn't have to be made; we should already be valid at this point.
        //       add validation for the location names in the config file for this.
        if (locationConfig !== undefined && locationConfig[extract.Name] !== undefined) {
            const configChance = locationConfig[extract.Name];

            // TODO: AGAIN, these bounds checks shouldn't have to be made; we should already be valid at this point.
            if (configChance >= 0 && configChance <= 100 && configChance !== extract.Chance) {
                const originalChance = extract.Chance;
                extract.Chance = configChance;

                if (OpenExtracts.config.general.debug) {
                    OpenExtracts.logger.log(
                        `OpenExtracts: ${extract.Name} on ${getHumanLocationName(
                            location.Id
                        )} has had its chance to be enabled changed from ${originalChance}% to ${configChance}%.`,
                        'gray'
                    );
                }
            }
        }
    }

    /**
     * Adjust the maximum extraction time of an extract.
     */
    private adjustMaximumExtractTime(extract: Exit, location: ILocationBase): void {
        const originalExtractTime = extract.ExfiltrationTime;
        const maxTime = OpenExtracts.config.extracts.maxExtractionTime;

        if (originalExtractTime <= maxTime) {
            // The original extraction time is already less than or equal to the maximum extraction time.
            return;
        }

        extract.ExfiltrationTime = maxTime;

        if (OpenExtracts.config.general.debug) {
            OpenExtracts.logger.log(
                `OpenExtracts: ${extract.Name} on ${getHumanLocationName(
                    location.Id
                )} has had its extraction time updated from ${originalExtractTime} seconds to ${maxTime} seconds.`,
                'gray'
            );
        }
    }

    /**
     * Convert a cooperation extract to a payment extract.
     */
    private convertCooperationToPayment(extract: Exit, location: ILocationBase): void {
        if (!OpenExtracts.config.extracts.cooperation.convertToPayment) {
            // Option has been disabled in the configuration file.
            return;
        }

        if (!ModifyExtracts.isCooperationExtract(extract)) {
            // This isn't a cooperation extract;
            return;
        }

        extract.PassageRequirement = 'TransferItem';
        extract.RequirementTip = 'EXFIL_Item';
        extract.Id = OpenExtracts.config.extracts.cooperation.item;
        extract.Count = OpenExtracts.config.extracts.cooperation.number;

        if (OpenExtracts.config.general.debug) {
            OpenExtracts.logger.log(
                `OpenExtracts: ${extract.Name} on ${getHumanLocationName(
                    location.Id
                )} has been converted to a payment extract.`,
                'gray'
            );
        }
    }

    /**
     * Check if an extract is a cooperation extract.
     */
    private static isCooperationExtract(extract: Exit): boolean {
        return extract.PassageRequirement === 'ScavCooperation';
    }

    /**
     * Remove the backpack requirement from an extract.
     */
    private removeBackpackRequirement(extract: Exit, location: ILocationBase): void {
        if (!OpenExtracts.config.extracts.ignoreBackpackRequirements) {
            // Option has been disabled in the configuration file.
            return;
        }

        if (!ModifyExtracts.isBackpackExtract(extract)) {
            // This isn't a backpack extract;
            return;
        }

        extract.PassageRequirement = 'None';
        extract.RequiredSlot = 'FirstPrimaryWeapon';
        extract.RequirementTip = '';

        if (OpenExtracts.config.general.debug) {
            OpenExtracts.logger.log(
                `OpenExtracts: ${extract.Name} on ${getHumanLocationName(
                    location.Id
                )} has had its backpack requirement removed.`,
                'gray'
            );
        }
    }

    /**
     * Check if an extract is a backpack extract.
     */
    private static isBackpackExtract(extract: Exit): boolean {
        return (
            ModifyExtracts.getBackpackExtractRequirementTips().has(extract.RequirementTip) &&
            extract.RequiredSlot === 'Backpack'
        );
    }

    /**
     * Get a list (set) of backpack extracts.
     */
    private static getBackpackExtractRequirementTips(): Set<string> {
        return new Set<string>(['EXFIL_tip_backpack', 'EXFIL_INTERCHANGE_HOLE_TIP']);
    }

    /**
     * Remove the cliff requirement from an extract.
     */
    private removeCliffRequirements(extract: Exit, location: ILocationBase): void {
        if (!OpenExtracts.config.extracts.ignoreCliffRequirements) {
            // Option has been disabled in the configuration file.
            return;
        }

        if (!ModifyExtracts.isCliffExtract(extract)) {
            // This isn't a cliff extract;
            return;
        }

        extract.Id = '';
        extract.PassageRequirement = 'None';

        if (OpenExtracts.config.general.debug) {
            OpenExtracts.logger.log(
                `OpenExtracts: ${extract.Name} on ${getHumanLocationName(
                    location.Id
                )} has had its paracord, red rebel, and armored rig requirements removed.`,
                'gray'
            );
        }
    }

    /**
     * Check if an extract is a cliff extract.
     */
    private static isCliffExtract(extract: Exit): boolean {
        return extract.Name.toLowerCase().includes('alpinist') && extract.PassageRequirement === 'Reference';
    }
}
