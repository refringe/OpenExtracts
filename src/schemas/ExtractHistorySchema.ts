import { JSONSchema7 } from "json-schema";

export class ExtractHistorySchema {
    /* eslint-disable @typescript-eslint/naming-convention */
    public static readonly schema: JSONSchema7 = {
        type: "object",
        additionalProperties: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    extractName: { type: "string" },
                    timestamp: { type: "string", format: "date-time" },
                },
                required: ["extractName", "timestamp"],
            },
        },
    };
    /* eslint-enable @typescript-eslint/naming-convention */
}
