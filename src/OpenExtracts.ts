import { IPostDBLoadMod } from "@spt/models/external/IPostDBLoadMod";
import { IPreSptLoadMod } from "@spt/models/external/IPreSptLoadMod";
import { ILogger } from "@spt/models/spt/utils/ILogger";
import { DependencyContainer } from "tsyringe";
import { ExtractAdjuster } from "./adjusters/ExtractAdjuster";
import { ConfigServer } from "./servers/ConfigServer";
import { Configuration } from "./types";

/**
 * The main class of the OpenExtracts mod.
 */
class OpenExtracts implements IPostDBLoadMod, IPreSptLoadMod {
    public logger: ILogger;
    public config: Configuration | null = null;

    /**
     * Handle loading the configuration file and registering our custom MatchCallbacks class.
     * Runs before the database is loaded.
     */
    public preSptLoad(container: DependencyContainer): void {
        this.logger = container.resolve<ILogger>("WinstonLogger");

        // Load and validate the configuration file.
        try {
            this.config = new ConfigServer().loadConfig().validateConfig().getConfig();
        } catch (error: any) {
            this.config = null; // Set the config to null so we know it's failed to load or validate.
            this.logger.log(`OpenExtracts: ${error.message}`, "red");
        }

        // Set a flag so we know that we shouldn't continue when the postDBLoad method fires... just setting the config
        // back to null should do the trick. Use optional chaining because we have not yet checked if the config is
        // loaded and valid yet.
        if (this.config?.general?.enabled === false) {
            this.config = null;
            this.logger.log("OpenExtracts is disabled in the config file.", "red");
        }

        // If the configuration is null at this point we can stop here.
        if (this.config === null) {
            return;
        }
    }

    /**
     * Trigger the changes to extracts once the database has loaded.
     */
    public postDBLoad(container: DependencyContainer): void {
        // If the configuration is null at this point we can stop here. This will happen if the configuration file
        // failed to load, failed to validate, or if the mod is disabled in the configuration file.
        if (this.config === null) {
            return;
        }

        // Modify the extracts based on the configuration.
        new ExtractAdjuster(container, this.config).makeAdjustments();
    }
}

module.exports = { mod: new OpenExtracts() };
