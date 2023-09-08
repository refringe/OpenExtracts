import * as fs from 'fs';
import * as json5 from 'json5';
import { join } from 'path';
import { Configuration, Cooperation, Extracts, General, Random } from '../types';

/**
 * ConfigServer Class
 *
 * The ConfigServer class is responsible for managing the application's configuration settings.
 * It provides functionality to load and validate a configuration file, which is specified in JSON5 format.
 * The class checks the validity of each major section in the configuration and ensures that they meet
 * their respective data type and range requirements.
 */
export class ConfigServer {
    private relativeConfigPath: string;
    private configPath: string;
    private config: Configuration | null = null;
    private isLoaded: boolean = false;
    private isValid: boolean = false;

    /**
     * Constructs a new ConfigServer instance.
     * Automatically loads and validates the configuration file specified by the relative path.
     */
    constructor(relativeConfigPath: string = '../../config/config.json5') {
        this.relativeConfigPath = relativeConfigPath;
        this.configPath = this.buildConfigPath();
    }

    /**
     * Constructs the absolute path to the configuration file based on its relative path.
     */
    private buildConfigPath(): string {
        return join(__dirname, this.relativeConfigPath);
    }

    /**
     * Loads the configuration from a file.
     * Sets the `isLoaded` flag to true if successful, false otherwise.
     * Throws a ConfigError if the file cannot be loaded.
     */
    public loadConfig(): this {
        try {
            const configFileContent = fs.readFileSync(this.configPath, 'utf-8');
            this.config = json5.parse(configFileContent) as Configuration;
            this.isLoaded = true;
        } catch (error) {
            this.config = null;
            this.isLoaded = false;
            this.isValid = false;
            throw new Error('CONFIG_LOAD_ERROR: Could not load configuration');
        }
        return this;
    }

    /**
     * Validates the loaded configuration.
     * Sets the `isValid` flag to true if the validation is successful, false otherwise.
     * Throws a ConfigError if the configuration is not loaded or is invalid.
     */
    public validateConfig(): this {
        if (!this.isLoaded) {
            throw new Error('CONFIG_NOT_LOADED: Configuration not loaded');
        }

        if (this.config === null) {
            throw new Error('CONFIG_IS_NULL: Configuration is null');
        }

        try {
            this.getValidationErrors(this.config);
            this.isValid = true;
        } catch (error: any) {
            this.config = null;
            this.isValid = false;
            throw new Error('CONFIG_VALIDATION_ERROR: Configuration validation failed - ' + error.message);
        }

        return this;
    }

    /**
     * Validates the structure of the given configuration object and throws an error if it is invalid.
     */
    private getValidationErrors(config: Configuration): Configuration {
        const validationError = this.validateConfiguration(config);
        if (validationError) {
            throw new Error(validationError);
        }
        return config;
    }

    /**
     * Validates the general structure of the given configuration object.
     * Checks each major configuration section for validity.
     */
    private validateConfiguration(config: Configuration): string | null {
        const generalValidation = this.isValidGeneral(config.general);
        if (generalValidation !== null) {
            return generalValidation;
        }

        const extractsValidation = this.isValidExtracts(config.extracts);
        if (extractsValidation !== null) {
            return extractsValidation;
        }

        return null; // No errors
    }

    /**
     * Validates the "general" section of the configuration object.
     * Ensures the 'enabled' and 'debug' fields are booleans.
     */
    private isValidGeneral(general: General): string | null {
        if (typeof general.enabled !== 'boolean') {
            return 'The general setting "enabled" should be a boolean.';
        }
        if (typeof general.debug !== 'boolean') {
            return 'The general setting "debug" should be a boolean.';
        }
        return null;
    }

    /**
     * Validates the "extracts" section of the configuration object.
     * Ensures that each field meets its data type and range requirements.
     */
    private isValidExtracts(extracts: Extracts): string | null {
        if (typeof extracts.ignoreEntryPoint !== 'boolean') {
            return 'The extracts setting "ignore_entry_point" should be a boolean.';
        }
        if (typeof extracts.ignoreCliffRequirements !== 'boolean') {
            return 'The extracts setting "ignore_cliff_requirements" should be a boolean.';
        }
        if (typeof extracts.ignoreBackpackRequirements !== 'boolean') {
            return 'The extracts setting "ignore_backpack_requirements" should be a boolean.';
        }
        if (typeof extracts.maxExtractionTime !== 'number') {
            return 'The extracts setting "max_extraction_time" should be a number.';
        }

        const randomValidation = this.isValidRandom(extracts.random);
        if (randomValidation !== null) {
            return randomValidation;
        }

        const cooperationValidation = this.isValidCooperation(extracts.cooperation);
        if (cooperationValidation !== null) {
            return cooperationValidation;
        }
        return null;
    }

    /**
     * Validates the "random" subsection of the "extracts" section of the configuration object.
     * Ensures that 'enabled' is a boolean and 'chances' is a well-formed object.
     */
    private isValidRandom(random: Random): string | null {
        const allowedKeysAndSubkeys = {
            customs: ["Smuggler's Boat", 'ZB-1012', 'Old Gas Station', 'Dorms V-Ex'],
            interchange: ['PP Exfil'],
            laboratory: ['lab_Parking_Gate', 'lab_Hangar_Gate'],
            lighthouse: [' V-Ex_light'], // The space here is not a mistake.
            shoreline: ['Rock Passage', 'Pier Boat', 'CCP Temporary'],
            streets: ['E7_car', 'E8_yard'],
            woods: ['ZB-016', 'RUAF Gate', 'ZB-014'],
        };

        if (typeof random.enabled !== 'boolean') {
            return 'The random setting "enabled" should be a boolean.';
        }
        if (typeof random.chances !== 'object') {
            return 'The random setting "chances" should be an object.';
        }

        for (const [key, subkeys] of Object.entries(allowedKeysAndSubkeys)) {
            if (!Object.prototype.hasOwnProperty.call(random.chances, key)) {
                return `Missing location: '${key}' in extracts.random.chances.`;
            }

            for (const subkey of subkeys) {
                if (!Object.prototype.hasOwnProperty.call(random.chances[key], subkey)) {
                    return `Missing extraction: '${subkey}' in extracts.random.chances.${key}.`;
                }
            }
        }

        for (const [key, value] of Object.entries(random.chances)) {
            for (const [subkey, subvalue] of Object.entries(value)) {
                if (typeof subvalue !== 'number' || subvalue < 0 || subvalue > 100) {
                    return `The extraction point "${subkey}" in the "${key}" map has an invalid chance value. It should be a number between 0 and 100, representing the percentage chance it has to be available.`;
                }
            }
        }

        return null;
    }

    /**
     * Validates the "cooperation" subsection of the "extracts" section of the configuration object.
     * Ensures that each field meets its data type and range requirements.
     */
    private isValidCooperation(cooperation: Cooperation): string | null {
        if (typeof cooperation.convertToPayment !== 'boolean') {
            return 'The cooperation setting "convert_to_payment" should be a boolean.';
        }
        if (typeof cooperation.item !== 'string') {
            return 'The cooperation setting "item" should be a string.';
        }
        if (typeof cooperation.number !== 'number') {
            return 'The cooperation setting "number" should be a number.';
        }
        if (typeof cooperation.modifyFenceReputation !== 'boolean') {
            return 'The cooperation setting "modifyFenceReputation" should be a boolean.';
        }
        if (typeof cooperation.sendFenceGifts !== 'boolean') {
            return 'The cooperation setting "sendFenceGifts" should be a boolean.';
        }
        return null;
    }

    /**
     * Retrieves the loaded and validated configuration.
     */
    public getConfig(): Configuration | null {
        if (!this.isValid) {
            throw new Error('CONFIG_INVALID: Configuration not valid or not loaded');
        }
        return this.config;
    }
}
