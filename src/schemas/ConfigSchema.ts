import { JSONSchema7 } from "json-schema";

export class ConfigSchema {
    /* eslint-disable @typescript-eslint/naming-convention */
    public static readonly schema: JSONSchema7 = {
        type: "object",
        properties: {
            general: {
                type: "object",
                properties: {
                    enabled: { type: "boolean" },
                    debug: { type: "boolean" },
                },
                required: ["enabled", "debug"],
                additionalProperties: false,
            },
            extracts: {
                type: "object",
                properties: {
                    ignoreEntryPoint: { type: "boolean" },
                    ignoreCliffRequirements: { type: "boolean" },
                    ignoreBackpackRequirements: { type: "boolean" },
                    maxExtractionTime: { type: "number" },
                    random: {
                        type: "object",
                        properties: {
                            enabled: { type: "boolean" },
                            chances: {
                                type: "object",
                                properties: {
                                    customs: {
                                        type: "object",
                                        properties: {
                                            "Smuggler's Boat": { type: "number", minimum: 0, maximum: 100 },
                                            "ZB-1012": { type: "number", minimum: 0, maximum: 100 },
                                            "Old Gas Station": { type: "number", minimum: 0, maximum: 100 },
                                            "Dorms V-Ex": { type: "number", minimum: 0, maximum: 100 },
                                        },
                                        required: ["Smuggler's Boat", "ZB-1012", "Old Gas Station", "Dorms V-Ex"],
                                        additionalProperties: false,
                                    },
                                    interchange: {
                                        type: "object",
                                        properties: {
                                            "PP Exfil": { type: "number", minimum: 0, maximum: 100 },
                                        },
                                        required: ["PP Exfil"],
                                        additionalProperties: false,
                                    },
                                    laboratory: {
                                        type: "object",
                                        properties: {
                                            lab_Parking_Gate: { type: "number", minimum: 0, maximum: 100 },
                                            lab_Hangar_Gate: { type: "number", minimum: 0, maximum: 100 },
                                        },
                                        required: ["lab_Parking_Gate", "lab_Hangar_Gate"],
                                        additionalProperties: false,
                                    },
                                    lighthouse: {
                                        type: "object",
                                        properties: {
                                            " V-Ex_light": { type: "number", minimum: 0, maximum: 100 },
                                        },
                                        required: [" V-Ex_light"],
                                        additionalProperties: false,
                                    },
                                    shoreline: {
                                        type: "object",
                                        properties: {
                                            "Rock Passage": { type: "number", minimum: 0, maximum: 100 },
                                            "Pier Boat": { type: "number", minimum: 0, maximum: 100 },
                                            "CCP Temporary": { type: "number", minimum: 0, maximum: 100 },
                                        },
                                        required: ["Rock Passage", "Pier Boat", "CCP Temporary"],
                                        additionalProperties: false,
                                    },
                                    streets: {
                                        type: "object",
                                        properties: {
                                            E7_car: { type: "number", minimum: 0, maximum: 100 },
                                            E8_yard: { type: "number", minimum: 0, maximum: 100 },
                                        },
                                        required: ["E7_car", "E8_yard"],
                                        additionalProperties: false,
                                    },
                                    woods: {
                                        type: "object",
                                        properties: {
                                            "ZB-016": { type: "number", minimum: 0, maximum: 100 },
                                            "RUAF Gate": { type: "number", minimum: 0, maximum: 100 },
                                            "ZB-014": { type: "number", minimum: 0, maximum: 100 },
                                        },
                                        required: ["ZB-016", "RUAF Gate", "ZB-014"],
                                        additionalProperties: false,
                                    },
                                },
                                required: [
                                    "customs",
                                    "interchange",
                                    "laboratory",
                                    "lighthouse",
                                    "shoreline",
                                    "streets",
                                    "woods",
                                ],
                                additionalProperties: false,
                            },
                        },
                        required: ["enabled", "chances"],
                        additionalProperties: false,
                    },
                    cooperation: {
                        type: "object",
                        properties: {
                            convertToPayment: { type: "boolean" },
                            item: { type: "string" },
                            number: { type: "number", minimum: 0, maximum: 65535 },
                            modifyFenceReputation: { type: "boolean" },
                            sendFenceGifts: { type: "boolean" },
                        },
                        required: ["convertToPayment", "item", "number", "modifyFenceReputation", "sendFenceGifts"],
                        additionalProperties: false,
                    },
                },
                required: [
                    "ignoreEntryPoint",
                    "ignoreCliffRequirements",
                    "ignoreBackpackRequirements",
                    "maxExtractionTime",
                    "random",
                    "cooperation",
                ],
                additionalProperties: false,
            },
        },
        required: ["general", "extracts"],
        additionalProperties: false,
    };
    /* eslint-enable @typescript-eslint/naming-convention */
}
