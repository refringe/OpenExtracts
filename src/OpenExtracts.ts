import { MatchCallbacks } from '@spt-aki/callbacks/MatchCallbacks';
import { IPostDBLoadModAsync } from '@spt-aki/models/external/IPostDBLoadModAsync';
import { IPreAkiLoadModAsync } from '@spt-aki/models/external/IPreAkiLoadModAsync';
import { ILocaleBase } from '@spt-aki/models/spt/server/ILocaleBase';
import { ILogger } from '@spt-aki/models/spt/utils/ILogger';
import { DatabaseServer } from '@spt-aki/servers/DatabaseServer';
import { DependencyContainer } from 'tsyringe';
import { CustomMatchCallbacks } from './callbacks/CustomMatchCallbacks';
import { getConfig } from './config';
import { CooperationExtract } from './events/CooperationExtract';
import { ModifyExtracts } from './models/ModifyExtracts';
import { Configuration } from './types';
import { getLogger } from './utils/logger';

/**
 * The main class of the OpenExtracts mod.
 */
export class OpenExtracts implements IPostDBLoadModAsync, IPreAkiLoadModAsync {
    public static container: DependencyContainer;
    public static logger: ILogger;
    public static config: Configuration | null = null;

    /**
     * Handle loading the configuration file and registering our custom MatchCallbacks class.
     * Runs before the database is loaded.
     */
    public async preAkiLoadAsync(container: DependencyContainer): Promise<void> {
        OpenExtracts.container = container;
        OpenExtracts.logger = getLogger(container);
        OpenExtracts.config = await getConfig(container);

        // Register our custom MatchCallbacks class and overwrite the token on the original class so ours is used in
        // it's place. We're using this to get information about an extract after one's used, and this is only needed
        // if we're modifying the fence reputation or sending Fence gifts after a cooperation extract.
        if (this.shouldRegisterMatchCallback()) {
            container.register<CustomMatchCallbacks>('CustomMatchCallbacks', CustomMatchCallbacks);
            container.register<MatchCallbacks>('MatchCallbacks', { useToken: 'CustomMatchCallbacks' });
        }
    }

    /**
     * Determine if we should register our custom MatchCallbacks class based on the configuration.
     */
    private shouldRegisterMatchCallback(): boolean {
        return (
            OpenExtracts.config.extracts.cooperation.convertToPayment &&
            (OpenExtracts.config.extracts.cooperation.modifyFenceReputation ||
                OpenExtracts.config.extracts.cooperation.sendFenceGifts)
        );
    }

    /**
     * Trigger the changes to extracts once the database has loaded.
     */
    public async postDBLoadAsync(): Promise<void> {
        // The only way that the configuration is null at this point is if it's failed to load or validate. Pass.
        if (OpenExtracts.config === null) {
            return;
        }

        // Ensure that the Fence locale messages are loaded in.
        const locales: ILocaleBase = OpenExtracts.container.resolve<DatabaseServer>('DatabaseServer').getTables().locales;
        CooperationExtract.loadFenceMessages(locales);

        // Engage!
        new ModifyExtracts();
    }
}

module.exports = { mod: new OpenExtracts() };
