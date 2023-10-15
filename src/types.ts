// The main configuration file structure.
export interface Configuration {
    general: General;
    extracts: Extracts;
}

// The configuration file structure for the "general" section.
export interface General {
    enabled: boolean;
    debug: boolean;
}

// The configuration file structure for the "extracts" section.
export interface Extracts {
    ignoreEntryPoint: boolean;
    ignoreCliffRequirements: boolean;
    ignoreBackpackRequirements: boolean;
    maxExtractionTime: number;
    random: Random;
    cooperation: Cooperation;
}

// The configuration file structure for the "random" section.
export interface Random {
    enabled: boolean;
    chances: {
        [key: string]: {
            [key: string]: number;
        };
    };
}

// The configuration file structure for the "cooperation" section.
export interface Cooperation {
    convertToPayment: boolean;
    item: string;
    number: number;
    modifyFenceReputation: boolean;
}

export interface ExtractHistory {
    [sessionId: string]: ExtractRecord[];
}

export interface ExtractRecord {
    extractName: string;
    timestamp: string; // ISO 8601 format (UTC timezone)
}

export interface FenceMessages {
    [language: string]: {
        [messageKey: string]: string;
    };
}
