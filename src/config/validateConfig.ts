import {
    Configuration,
    Cooperation,
    Extracts,
    General,
    Random,
} from '../types';

/**
 * Validates the given configuration object and returns an error message if it is invalid.
 */
export function validateConfig(config: Configuration): string | null {
    const generalValidation = isValidGeneral(config.general);
    if (generalValidation !== null) {
        return generalValidation;
    }

    const extractsValidation = isValidExtracts(config.extracts);
    if (extractsValidation !== null) {
        return extractsValidation;
    }

    return null; // No errors
}

/**
 * Validates the "general" section of the configuration object and returns an error message if it is invalid.
 */
function isValidGeneral(general: General): string | null {
    if (typeof general.enabled !== 'boolean') {
        return 'The general setting "enabled" should be a boolean.';
    }
    if (typeof general.debug !== 'boolean') {
        return 'The general setting "debug" should be a boolean.';
    }
    return null;
}

/**
 * Validates the "extracts" section of the configuration object and returns an error message if it is invalid.
 */
function isValidExtracts(extracts: Extracts): string | null {
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

    const randomValidation = isValidRandom(extracts.random);
    if (randomValidation !== null) {
        return randomValidation;
    }

    const cooperationValidation = isValidCooperation(extracts.cooperation);
    if (cooperationValidation !== null) {
        return cooperationValidation;
    }
    return null;
}

/**
 * Validates the "random" section of the "extracts" section of the configuration object and returns an error message if it is invalid.
 */
function isValidRandom(random: Random): string | null {
    if (typeof random.enabled !== 'boolean') {
        return 'The random setting "enabled" should be a boolean.';
    }
    if (typeof random.chances !== 'object') {
        return 'The random setting "chances" should be an object.';
    }
    for (const [key, value] of Object.entries(random.chances)) {
        for (const [subkey, subvalue] of Object.entries(value)) {
            if (
                typeof subvalue !== 'number' ||
                subvalue < 0 ||
                subvalue > 100
            ) {
                return `The extraction point "${subkey}" in the "${key}" map has an invalid chance value. It should be a number between 0 and 100, representing the percentage chance it has to be available.`;
            }
        }
    }
    return null;
}

/**
 * Validates the "cooperation" section of the "extracts" section of the configuration object and returns an error message if it is invalid.
 */
function isValidCooperation(cooperation: Cooperation): string | null {
    if (typeof cooperation.convertToPayment !== 'boolean') {
        return 'The cooperation setting "convert_to_payment" should be a boolean.';
    }
    if (typeof cooperation.item !== 'string') {
        return 'The cooperation setting "item" should be a string.';
    }
    if (typeof cooperation.number !== 'number') {
        return 'The cooperation setting "number" should be a number.';
    }
    return null;
}
