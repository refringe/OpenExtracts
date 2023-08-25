import { IPostDBLoadModAsync } from '@spt-aki/models/external/IPostDBLoadModAsync';
import { IPreAkiLoadModAsync } from '@spt-aki/models/external/IPreAkiLoadModAsync';
import { DependencyContainer } from 'tsyringe';
import { getConfig } from './config';
import { adjustExtracts } from './extracts';
import { Configuration } from './types';
import { getLogger } from './utils/logger';
import { ILogger } from '@spt-aki/models/spt/utils/ILogger';
import { OpenExtractsMatchCallbacks } from './callbacks';
import { MatchCallbacks } from '@spt-aki/callbacks/MatchCallbacks';

/**
 * The main class of the OpenExtracts mod.
 */
class OpenExtracts implements IPostDBLoadModAsync, IPreAkiLoadModAsync {
    private static container: DependencyContainer;
    private static config: Configuration | null = null;
    private static logger: ILogger;

    /**
     * Handle the configuration file, and register any routes.
     * Runs first!
     */
    public async preAkiLoadAsync(container: DependencyContainer): Promise<void> {
        // Let's make some things readily available to the rest of the mod.
        OpenExtracts.container = container;
        OpenExtracts.config = await getConfig(container);
        OpenExtracts.logger = getLogger(container);

        // Register our custom MatchCallbacks class and overwrite the original token so ours is used instead.
        container.register<OpenExtractsMatchCallbacks>('OpenExtractsMatchCallbacks', OpenExtractsMatchCallbacks);
        container.register<MatchCallbacks>('MatchCallbacks', { useToken: 'OpenExtractsMatchCallbacks' });
    }

    /**
     * Adjust the extract settings, once the database has been loaded.
     */
    public async postDBLoadAsync(): Promise<void> {
        // The only way that the configuration is null at this point is if it's failed to load or validate.
        if (OpenExtracts.config === null) {
            return;
        }

        adjustExtracts(OpenExtracts.container, OpenExtracts.config);
    }
}

module.exports = { mod: new OpenExtracts() };
