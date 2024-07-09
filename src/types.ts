export interface Configuration {
    general: General;
    extracts: Extracts;
}

export interface General {
    enabled: boolean;
    debug: boolean;
}

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

export interface Random {
    enabled: boolean;
    chances: {
        [key: string]: {
            [key: string]: number;
        };
    };
}

export interface Cooperation {
    convertToPayment: boolean;
    item: string;
    number: number;
}

export interface Vehicle {
    adjustPayment: boolean;
    item: string;
    number: number;
}
