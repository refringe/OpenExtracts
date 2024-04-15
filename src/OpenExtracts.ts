import { IPostDBLoadMod } from "@spt-aki/models/external/IPostDBLoadMod";
import { IPreAkiLoadMod } from "@spt-aki/models/external/IPreAkiLoadMod";
import { ILogger } from "@spt-aki/models/spt/utils/ILogger";
import { DependencyContainer } from "tsyringe";
import { ExtractAdjuster } from "./adjusters/ExtractAdjuster";
import { ConfigServer } from "./servers/ConfigServer";
import { Configuration } from "./types";

/**
 * The main class of the OpenExtracts mod.
 */
export class OpenExtracts implements IPostDBLoadMod, IPreAkiLoadMod {
    public static container: DependencyContainer;
    public static logger: ILogger;
    public static config: Configuration | null = null;

    /**
     * Handle loading the configuration file and registering our custom MatchCallbacks class.
     * Runs before the database is loaded.
     */
    public preAkiLoad(container: DependencyContainer): void {
        OpenExtracts.container = container;

        // Resolve the logger and save it to the static logger property for simple access.
        OpenExtracts.logger = container.resolve<ILogger>("WinstonLogger");

        // Load and validate the configuration file, saving it to the static config property for simple access.
        try {
            OpenExtracts.config = new ConfigServer().loadConfig().validateConfig().getConfig();
        } catch (error: any) {
            OpenExtracts.config = null; // Set the config to null so we know it's failed to load or validate.
            OpenExtracts.logger.log(`OpenExtracts: ${error.message}`, "red");
        }

        // Set a flag so we know that we shouldn't continue when the postDBLoad method fires... just setting the config
        // back to null should do the trick. Use optional chaining because we have not yet checked if the config is
        // loaded and valid yet.
        if (OpenExtracts.config?.general?.enabled === false) {
            OpenExtracts.config = null;
            OpenExtracts.logger.log("OpenExtracts is disabled in the config file.", "red");
        }

        // If the configuration is null at this point we can stop here.
        if (OpenExtracts.config === null) {
            return;
        }
    }

    /**
     * Trigger the changes to extracts once the database has loaded.
     */
    public postDBLoad(): void {
        // If the configuration is null at this point we can stop here. This will happen if the configuration file
        // failed to load, failed to validate, or if the mod is disabled in the configuration file.
        if (OpenExtracts.config === null) {
            return;
        }

        // Modify the extracts based on the configuration.
        new ExtractAdjuster();
    }
}

module.exports = { mod: new OpenExtracts() };
