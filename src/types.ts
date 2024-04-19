// The main configuration file structure.
export interface Configuration {
    general: General;
    extracts: Extracts;
}

// The configuration structure for the "general" section.
export interface General {
    enabled: boolean;
    debug: boolean;
}

// The configuration structure for the "extracts" section.
export interface Extracts {
    ignoreEntryPoint: boolean;
    ignoreCliffRequirements: boolean;
    ignoreBackpackRequirements: boolean;
    maxExtractionTime: number;
    resetTimerOnLeave: boolean;
    random: Random;
    cooperation: Cooperation;
    vehicle: Vehicle;
}

// The configuration structure for the "random" section.
export interface Random {
    enabled: boolean;
    chances: {
        [key: string]: {
            [key: string]: number;
        };
    };
}

// The configuration structure for the "cooperation" section.
export interface Cooperation {
    convertToPayment: boolean;
    item: string;
    number: number;
}

// The configuration structure for the "vehicle" section.
export interface Vehicle {
    adjustPayment: boolean;
    item: string;
    number: number;
}
