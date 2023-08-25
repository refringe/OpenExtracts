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
    random: Random;
    cooperation: Cooperation;
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
    increaseFenceReputation: boolean;
    generateFenceGifts: boolean;
}
