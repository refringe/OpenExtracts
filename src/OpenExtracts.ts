import { IPostDBLoadModAsync } from '@spt-aki/models/external/IPostDBLoadModAsync';
import { IPreAkiLoadModAsync } from '@spt-aki/models/external/IPreAkiLoadModAsync';
import { IPreAkiLoadMod } from '@spt-aki/models/external/IPreAkiLoadMod';
import { DependencyContainer } from 'tsyringe';
import { getConfig } from './config';
import { adjustExtracts } from './extracts';
import { Configuration } from './types';
import { OpenExtractsMatchCallbacks } from './callbacks';
import { MatchCallbacks } from '@spt-aki/callbacks/MatchCallbacks';

/**
 * The main class of the OpenExtracts mod.
 */
class OpenExtracts implements IPostDBLoadModAsync, IPreAkiLoadModAsync, IPreAkiLoadMod {
    private static config: Configuration | null = null;

    /**
     * Register our custom MatchCallbacks class and overwrite the original token so ours is used instead.
     */
    public preAkiLoad(container: DependencyContainer): void {
        container.register<OpenExtractsMatchCallbacks>('OpenExtractsMatchCallbacks', OpenExtractsMatchCallbacks);
        container.register<MatchCallbacks>('MatchCallbacks', { useToken: 'OpenExtractsMatchCallbacks' });
    }

    /**
     * Handle loading the configuration file.
     */
    public async preAkiLoadAsync(container: DependencyContainer): Promise<void> {
        // Let's make some things readily available to the rest of the mod.
        OpenExtracts.config = await getConfig(container);
    }

    /**
     * Adjust the extract settings, once the database has been loaded.
     */
    public async postDBLoadAsync(container: DependencyContainer): Promise<void> {
        // The only way that the configuration is null at this point is if it's failed to load or validate.
        if (OpenExtracts.config === null) {
            return;
        }

        adjustExtracts(container, OpenExtracts.config);
    }
}

module.exports = { mod: new OpenExtracts() };
