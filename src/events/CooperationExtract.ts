import Ajv, { ValidateFunction } from "ajv";
import { ExtractHistorySchema } from "../schemas/ExtractHistorySchema";
import { JSONSchema7 } from "json-schema";
import { ProfileHelper } from "@spt-aki/helpers/ProfileHelper";
import { TraderHelper } from "@spt-aki/helpers/TraderHelper";
import { IPmcData } from "@spt-aki/models/eft/common/IPmcData";
import { Item } from "@spt-aki/models/eft/common/tables/IItem";
import { IEndOfflineRaidRequestData } from "@spt-aki/models/eft/match/IEndOfflineRaidRequestData";
import { MessageType } from "@spt-aki/models/enums/MessageType";
import { Traders } from "@spt-aki/models/enums/Traders";
import { ILocaleBase } from "@spt-aki/models/spt/server/ILocaleBase";
import { DatabaseServer } from "@spt-aki/servers/DatabaseServer";
import { LocaleService } from "@spt-aki/services/LocaleService";
import { MailSendService } from "@spt-aki/services/MailSendService";
import { TimeUtil } from "@spt-aki/utils/TimeUtil";
import * as fs from "fs";
import path from "path";
import { inject, injectable } from "tsyringe";
import { OpenExtracts } from "../OpenExtracts";
import { ExtractHistory, FenceMessages } from "../types";

/**
 * This class is initialized when the player chooses to extract from a coop extract. It's used to modify the fence rep
 * and send gifts to the player from Fence.
 */
@injectable()
export class CooperationExtract {
    private pmcData: IPmcData;
    private extractHistory: ExtractHistory = {};

    private ajv: Ajv;
    private validateSchema: ValidateFunction;
    private extractHistorySchema: JSONSchema7;

    private static readonly EXTRACT_HISTORY_LOCATION = "../data/extractHistory.json";
    private static readonly FENCE_MESSAGE_LOCATION = "../data/fenceMessages.json";

    private static readonly COOP_FENCE_REP_GAIN = 0.25;
    private static readonly COOP_FENCE_REP_MULTIPLIER = 0.5;
    private static readonly COOP_FENCE_REP_GROWTH = 0.01;

    private static readonly COOP_FENCE_GIFT_NUM_MIN = 2;
    private static readonly COOP_FENCE_GIFT_NUM_MAX = 4;

    constructor(
        sessionId: string,
        info: IEndOfflineRaidRequestData,
        @inject("DatabaseServer") protected databaseServer: DatabaseServer,
        @inject("TraderHelper") protected traderHelper: TraderHelper,
        @inject("ProfileHelper") protected profileHelper: ProfileHelper,
        @inject("MailSendService") protected mailSendService: MailSendService,
        @inject("LocaleService") protected localeService: LocaleService,
        @inject("TimeUtil") protected timeUtil: TimeUtil
    ) {
        if (OpenExtracts.config.general.debug) {
            OpenExtracts.logger.log(
                `OpenExtracts: Cooperation extract event has been initiated. SessionID: ${sessionId}, Status: ${info.exitStatus}, Extract: ${info.exitName}`,
                "gray"
            );
        }

        // Configure the JSON schema validator.
        this.ajv = new Ajv();
        this.extractHistorySchema = ExtractHistorySchema.schema;
        this.validateSchema = this.ajv.compile(this.extractHistorySchema);

        // Load the extract history.
        this.extractHistory = this.loadExtractHistory();

        // Load the player PMC profile data.
        this.pmcData = this.profileHelper.getPmcProfile(sessionId);

        // Engage!
        this.handleExtract(sessionId, info);
    }

    /**
     * Loads the fence messages from the JSON file. We're doing this asynchronously to prevent the server from hanging
     * on startup (since the messages aren't actually used until an extract occurs).
     */
    public static async loadFenceMessages(locales: ILocaleBase): Promise<void> {
        try {
            // Read the JSON file
            const fileContent = await fs.promises.readFile(
                path.join(__dirname, CooperationExtract.FENCE_MESSAGE_LOCATION),
                "utf-8"
            );
            const messages: FenceMessages = JSON.parse(fileContent);

            // Call the method to add the messages to the database
            CooperationExtract.addFenceMessages(locales, messages);

            if (OpenExtracts.config.general.debug) {
                OpenExtracts.logger.log(`OpenExtracts: Fence messages have successfully loaded.`, "gray");
            }
        } catch (error) {
            OpenExtracts.logger.log(`OpenExtracts: Error loading fence messages: ${error}`, "red");
        }
    }

    /**
     * Add the fence messages to the locale database.
     */
    private static addFenceMessages(locales: ILocaleBase, messages: FenceMessages): void {
        // Loop through each language in the JSON file
        for (const lang of Object.keys(messages)) {
            // If the language key doesn't exist in the database, skip it.
            if (!locales.global[lang]) {
                continue;
            }

            // Loop through each message key for the current language. Overwrite the existing message if it exists.
            for (const key of Object.keys(messages[lang])) {
                locales.global[lang][key] = messages[lang][key];
            }
        }
    }

    /**
     * Load extract history from JSON file.
     */
    private loadExtractHistory(): ExtractHistory {
        try {
            const data = fs.readFileSync(path.join(__dirname, CooperationExtract.EXTRACT_HISTORY_LOCATION), "utf8");
            const parsedData = JSON.parse(data) as unknown; // Still needs validation.

            // Validate the JSON data
            if (!this.validateSchema(parsedData)) {
                throw new Error(`Invalid JSON data: ${JSON.stringify(this.validateSchema.errors)}`);
            }

            return parsedData as ExtractHistory; // Safe cast after validation.
        } catch (err) {
            if (err.code === "ENOENT") {
                // File not found, creating a new one
                this.saveExtractHistory({});
                return {};
            } else {
                // Some other error occurred
                throw new Error(`Failed to read extract history file: ${err}`);
            }
        }
    }

    /**
     * Save full extract history to JSON file.
     */
    private saveExtractHistory(history: ExtractHistory): void {
        try {
            // Validate the JSON data
            if (!this.validateSchema(history)) {
                throw new Error(`Invalid JSON data: ${JSON.stringify(this.validateSchema.errors)}`);
            }

            const jsonStr = JSON.stringify(history, null, 4);
            fs.writeFileSync(path.join(__dirname, CooperationExtract.EXTRACT_HISTORY_LOCATION), jsonStr, "utf8");
            OpenExtracts.logger.log(`OpenExtracts: Extract history data saved successfully.`, "gray");
        } catch (err) {
            throw new Error(`Failed to write extract history file: ${err}`);
        }
    }

    /**
     * Orchestrates what happens when a player extracts using a coop extract. This includes modifying the fence rep and
     * sending gifts to the player from Fence.
     */
    private handleExtract(sessionId: string, info: IEndOfflineRaidRequestData): void {
        // If the extract is not a coop extract or the player did not survive, do nothing.
        if (!CooperationExtract.extractIsCoop(info.exitName) || !CooperationExtract.hasSurvived(info.exitStatus)) {
            if (OpenExtracts.config.general.debug) {
                OpenExtracts.logger.log(`OpenExtracts: Incompatible extract status. Doing nothing.`, "gray");
            }
            return;
        }

        if (OpenExtracts.config.extracts.cooperation.modifyFenceReputation) {
            const newRep = this.calculateNewFenceRep(sessionId, info.exitName);
            this.updateFenceReputation(sessionId, newRep);
            this.rememberCoopExtract(sessionId, info.exitName);
        }

        if (OpenExtracts.config.extracts.cooperation.sendFenceGifts) {
            this.sendFenceGift(sessionId);
        }
    }

    /**
     * Calculate the new Fence reputation based on a number of factors. The original reputation gain is halved after
     * every use, but there is also a growth for every day the extract has not been used.
     */
    private calculateNewFenceRep(sessionId: string, extract: string): number {
        const currentRep = this.getFenceRep();
        const extractCount = this.getExtractCount(sessionId, extract);
        const daysSinceLastUse = this.getDaysSinceLastUse(sessionId, extract);

        // The initial reputation gain.
        let repGain = CooperationExtract.COOP_FENCE_REP_GAIN;

        // Decrease the reputation gain based on the number of times the extract has been used in the past.
        repGain *= Math.pow(CooperationExtract.COOP_FENCE_REP_MULTIPLIER, extractCount);

        // Increase the reputation gain based on the number of days since the extract was last used.
        repGain += daysSinceLastUse * CooperationExtract.COOP_FENCE_REP_GROWTH;

        // The gain is at least 0.01.
        repGain = Math.max(repGain, 0.01);

        if (OpenExtracts.config.general.debug) {
            OpenExtracts.logger.log(`OpenExtracts: Calculated Fence reputation gain: ${repGain}`, "gray");
        }

        // Calculate the new reputation.
        let newRep = currentRep + repGain;

        // Round to the nearest tenth.
        newRep = Math.round(newRep * 10) / 10;

        // Ensure that the Fence rep is within a valid range (-7 to 15).
        return Math.min(Math.max(newRep, -7), 15);
    }

    /**
     * Retrieves the player's current Fence reputation.
     */
    private getFenceRep(): number {
        return Number(this.pmcData.TradersInfo[Traders.FENCE].standing);
    }

    /**
     * Retrieves the number of times the player has used this coop extract.
     */
    private getExtractCount(sessionId: string, extract: string): number {
        if (!this.extractHistory[sessionId]) {
            return 0;
        }
        return this.extractHistory[sessionId].filter(record => record.extractName === extract).length;
    }

    /**
     * Retrieves the number of days since the player last used this coop extract.
     */
    private getDaysSinceLastUse(sessionId: string, extract: string): number {
        const lastDate = this.getLastCoopExtractDate(sessionId, extract);
        if (lastDate === null) {
            return 0;
        }
        const today = new Date();
        return Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    /**
     * Retrieves the date that this coop extract was last used by this player.
     */
    private getLastCoopExtractDate(sessionId: string, extract: string): Date | null {
        if (!this.extractHistory[sessionId]) {
            return null;
        }
        const relevantRecords = this.extractHistory[sessionId].filter(record => record.extractName === extract);
        if (relevantRecords.length === 0) {
            return null;
        }
        relevantRecords.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return new Date(relevantRecords[0].timestamp);
    }

    /**
     * Update the player's Fence reputation/standing.
     */
    private updateFenceReputation(sessionId: string, rep: number): void {
        if (OpenExtracts.config.general.debug) {
            OpenExtracts.logger.log(`OpenExtracts: Updating Fence reputation to: ${rep}.`, "gray");
        }

        const fence = this.pmcData.TradersInfo[Traders.FENCE];

        fence.standing = rep;

        // After the reputation is updated, check if the player has leveled up Fence.
        this.traderHelper.lvlUp(Traders.FENCE, sessionId);
        fence.loyaltyLevel = Math.max(fence.loyaltyLevel, 1);
    }

    /**
     * Remember the current coop extract for this player.
     */
    private rememberCoopExtract(sessionId: string, extract: string): void {
        // Initialize the array for this sessionId if it doesn't exist.
        if (!this.extractHistory[sessionId]) {
            this.extractHistory[sessionId] = [];
        }

        // Add the new extract record.
        this.extractHistory[sessionId].push({
            extractName: extract,
            timestamp: this.getCurrentTimestamp(),
        });

        // Save the updated history.
        try {
            this.saveExtractHistory(this.extractHistory);
        } catch (err) {
            OpenExtracts.logger.log(`OpenExtracts: Failed to save extract history: ${err}`, "red");
        }
    }

    /**
     * Send a gift to the player from Fence.
     */
    private sendFenceGift(sessionId: string): void {
        if (OpenExtracts.config.general.debug) {
            OpenExtracts.logger.log("OpenExtracts: Sending Fence gift.", "gray");
        }

        const items: Item[] = this.generateGiftItems();
        const message = this.selectFenceMessage();
        const fence = this.traderHelper.getTraderById(Traders.FENCE);

        // Send the message and the gift.
        this.mailSendService.sendDirectNpcMessageToPlayer(
            sessionId,
            fence,
            MessageType.MESSAGE_WITH_ITEMS,
            message,
            items,
            this.timeUtil.getHoursAsSeconds(48)
        );
    }

    /**
     * Generate a random gift for the player from Fence's assortment.
     */
    private generateGiftItems(): Item[] {
        // Load up the items that Fence has available.
        const fenceItems: Item[] = this.traderHelper.getTraderAssortsById(Traders.FENCE).items;

        // Determine the maximum number of gifts we can generate.
        const maxGifts = Math.min(fenceItems.length, CooperationExtract.COOP_FENCE_GIFT_NUM_MAX);

        // Randomly choose the number of gifts.
        const numGifts = Math.floor(Math.random() * (maxGifts - 1)) + CooperationExtract.COOP_FENCE_GIFT_NUM_MIN;

        // Randomly select 'numGifts' unique items from the list.
        const selectedGifts: Item[] = [];
        for (let i = 0; i < numGifts; i++) {
            const randomIndex = Math.floor(Math.random() * fenceItems.length);
            const selectedItem = fenceItems.splice(randomIndex, 1)[0];
            selectedGifts.push(selectedItem);
        }

        return this.buffGifts(selectedGifts);
    }

    /**
     * Buff the gifts by increasing durability of guns and armor. We want them to be gifts, not trash.
     */
    private buffGifts(items: Item[]): Item[] {
        for (const item of items) {
            if (item?.upd?.Repairable) {
                // Safely fetch the mint durability for this item.
                const database = this.databaseServer.getTables();
                const mintDurability = database?.templates?.items[item._tpl]?._props?.Durability;

                // Only update the (max)durability of the item if mintDurability is not undefined.
                if (mintDurability !== undefined) {
                    item.upd.Repairable.Durability = item.upd.Repairable.MaxDurability = mintDurability;
                }
            }
        }
        return items;
    }

    /**
     * Pick a random message from Fence's imported messages.
     */
    private selectFenceMessage(): string {
        const key = `open_extracts_${Math.floor(Math.random() * 20) + 1}`;
        const locale = this.localeService.getLocaleDb();
        return locale[key];
    }

    /**
     * Get the current timestamp in ISO 8601 format (UTC timezone).
     */
    private getCurrentTimestamp(): string {
        return new Date().toISOString();
    }

    /**
     * Checks to see if the extract is a coop extract.
     */
    public static extractIsCoop(extract: string): boolean {
        return this.getCoopExtractNames().has(extract);
    }

    /**
     * Returns a set of all the coop extract names.
     */
    private static getCoopExtractNames(): Set<string> {
        return new Set<string>([
            "Interchange Cooperation", // Interchange
            "tunnel_shared", // Lighthouse
            "EXFIL_ScavCooperation", // Reserve
            "Factory Gate", // Woods
        ]);
    }

    /**
     * Checks to see if the player has survived the raid.
     */
    public static hasSurvived(exitStatus: string): boolean {
        return exitStatus === "Survived";
    }
}
