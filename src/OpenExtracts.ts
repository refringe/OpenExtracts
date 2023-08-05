import type { IPostDBLoadModAsync } from '@spt-aki/models/external/IPostDBLoadModAsync';
import { DependencyContainer } from 'tsyringe';
import { loadAndValidateConfig } from './config';
import { adjustExtracts } from './extracts';
import type { Configuration } from './types';
import { getLogger } from './utils/logger';

/**
 * The main class of the OpenExtracts mod.
 */
class OpenExtracts implements IPostDBLoadModAsync {
    public async postDBLoadAsync(
        container: DependencyContainer
    ): Promise<void> {
        const logger = getLogger(container);
        let config: Configuration;

        try {
            config = await loadAndValidateConfig();
        } catch (error) {
            logger.log(
                'OpenExtracts: An error occurred while loading or validating the configuration file. ' +
                    error.message,
                'red'
            );
            return;
        }

        if (!config.general.enabled) {
            logger.log('OpenExtracts is disabled in the config file.', 'red');
            return;
        }

        adjustExtracts(container, config);
    }
}

module.exports = { mod: new OpenExtracts() };
