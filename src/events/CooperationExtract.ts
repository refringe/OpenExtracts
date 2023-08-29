import { ProfileHelper } from '@spt-aki/helpers/ProfileHelper';
import { TraderHelper } from '@spt-aki/helpers/TraderHelper';
import { IPmcData } from '@spt-aki/models/eft/common/IPmcData';
import { Item } from '@spt-aki/models/eft/common/tables/IItem';
import { IEndOfflineRaidRequestData } from '@spt-aki/models/eft/match/IEndOfflineRaidRequestData';
import { MessageType } from '@spt-aki/models/enums/MessageType';
import { Traders } from '@spt-aki/models/enums/Traders';
import { ILocaleBase } from '@spt-aki/models/spt/server/ILocaleBase';
import { DatabaseServer } from '@spt-aki/servers/DatabaseServer';
import { LocalisationService } from '@spt-aki/services/LocalisationService';
import { MailSendService } from '@spt-aki/services/MailSendService';
import { TimeUtil } from '@spt-aki/utils/TimeUtil';
import { promises as fs } from 'fs';
import path from 'path';
import { inject, injectable } from 'tsyringe';
import { OpenExtracts } from '../OpenExtracts';
import { ExtractHistory, FenceMessages } from '../types';

/**
 * This class is initialized when the player chooses to extract from a coop extract. It's used to modify the fence rep
 * and send gifts to the player from Fence.
 */
@injectable()
export class CooperationExtract {
    private extractHistory: ExtractHistory = {};
    private static extractHistoryLocation = '../data/extractHistory.json';
    private static fenceMessageLocation = '../data/fenceMessages.json';
    private pmcData: IPmcData;

    private static readonly COOP_FENCE_REP_GAIN = 0.25;
    private static readonly COOP_FENCE_REP_MULTIPLIER = 0.5;
    private static readonly COOP_FENCE_REP_GROWTH = 0.01;

    constructor(
        sessionId: string,
        info: IEndOfflineRaidRequestData,
        @inject('DatabaseServer') protected databaseServer: DatabaseServer,
        @inject('TraderHelper') protected traderHelper: TraderHelper,
        @inject('ProfileHelper') protected profileHelper: ProfileHelper,
        @inject('MailSendService') protected mailSendService: MailSendService,
        @inject('LocalisationService') protected localisationService: LocalisationService,
        @inject('TimeUtil') protected timeUtil: TimeUtil
    ) {
        if (OpenExtracts.config.general.debug) {
            OpenExtracts.logger.log(
                `OpenExtracts: Cooperation extract event has been initiated. SessionID: ${sessionId}, Info: ${info}`,
                'gray'
            );
        }

        // Load the extract history asynchronously
        this.loadExtractHistory()
            .then(history => {
                this.extractHistory = history;
            })
            .catch(err => {
                OpenExtracts.logger.log(`OpenExtracts: Failed to load extract history: ${err}`, 'red');
            });

        // Load the player PMC profile data.
        this.pmcData = this.profileHelper.getPmcProfile(sessionId);

        this.handleExtract(sessionId, info);
    }

    /**
     * Load the fence messages from the JSON file.
     */
    public static async loadFenceMessages(locales: ILocaleBase): Promise<void> {
        try {
            // Read the JSON file
            const fileContent = await fs.readFile(
                path.join(__dirname, CooperationExtract.fenceMessageLocation),
                'utf-8'
            );
            const messages: FenceMessages = JSON.parse(fileContent);

            // Call the method to add the messages to the database
            CooperationExtract.addFenceMessages(locales, messages);

            console.log('OpenExtracts: Fence messages loaded successfully.');
        } catch (error) {
            console.error('OpenExtracts: Error loading fence messages:', error);
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
    private async loadExtractHistory(): Promise<ExtractHistory> {
        try {
            const data = await fs.readFile(path.join(__dirname, CooperationExtract.extractHistoryLocation), 'utf8');
            return JSON.parse(data);
        } catch (err) {
            if (err.code === 'ENOENT') {
                // File not found, creating a new one
                await this.saveExtractHistory({});
                return {};
            } else {
                // Some other error occurred
                throw new Error(`Failed to read extract history file: ${err}`);
            }
        }
    }

    /**
     * Save extract history to JSON file.
     */
    private async saveExtractHistory(history: ExtractHistory): Promise<void> {
        try {
            const jsonStr = JSON.stringify(history, null, 2);
            await fs.writeFile(path.join(__dirname, CooperationExtract.extractHistoryLocation), jsonStr, 'utf8');
        } catch (err) {
            throw new Error(`Failed to write extract history file: ${err}`);
        }
    }

    /**
     * Orchestrates what happens when a player extracts using a coop extract. This includes modifying the fence rep and
     * sending gifts to the player from Fence.
     */
    private handleExtract(sessionId: string, info: IEndOfflineRaidRequestData): void {
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
        this.saveExtractHistory(this.extractHistory).catch(err => {
            OpenExtracts.logger.log(`OpenExtracts: Failed to save extract history: ${err}`, 'red');
        });
    }

    /**
     * Send a gift to the player from Fence.
     */
    private sendFenceGift(sessionId: string): void {
        // Generate a message.

        // Generate a gift.
        const giftItems: Item[] = this.generateGiftItems();

        // Send the message and the gift.
        this.mailSendService.sendDirectNpcMessageToPlayer(
            sessionId,
            Traders.FENCE,
            MessageType.MESSAGE_WITH_ITEMS,
            this.generateFenceMessage(),
            giftItems,
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
        const maxGifts = Math.min(fenceItems.length, 4); // Assuming 4 is the max number of gifts you want to send

        // Randomly choose the number of gifts (let's say between 2 to maxGifts).
        const numGifts = Math.floor(Math.random() * (maxGifts - 1)) + 2;

        // Randomly select 'numGifts' unique items from the list.
        const selectedGifts: Item[] = [];
        for (let i = 0; i < numGifts; i++) {
            const randomIndex = Math.floor(Math.random() * fenceItems.length);
            const selectedItem = fenceItems.splice(randomIndex, 1)[0];
            selectedGifts.push(selectedItem);
        }

        return selectedGifts;
    }

    /**
     * Pick a random message from Fence's imported messages.
     */
    private generateFenceMessage(): string {
        const key = `open_extract_${Math.floor(Math.random() * 20) + 1}`;
        return this.localisationService.getText(key);
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
            'Interchange Cooperation', // Interchange
            'tunnel_shared', // Lighthouse
            'EXFIL_ScavCooperation', // Reserve
            'Factory Gate', // Woods
        ]);
    }

    public static hasSurvived(exitStatus: string): boolean {
        return exitStatus === 'survived';
    }
}
