import { MatchCallbacks } from "@spt-aki/callbacks/MatchCallbacks";
import { IPostDBLoadMod } from "@spt-aki/models/external/IPostDBLoadMod";
import { IPreAkiLoadMod } from "@spt-aki/models/external/IPreAkiLoadMod";
import { ILogger } from "@spt-aki/models/spt/utils/ILogger";
import { DatabaseServer } from "@spt-aki/servers/DatabaseServer";
import { ILocaleBase } from "@spt-aki/models/spt/server/ILocaleBase";
import { DependencyContainer } from "tsyringe";
import { CustomMatchCallbacks } from "./callbacks/CustomMatchCallbacks";
import { CooperationExtract } from "./events/CooperationExtract";
import { ModifyExtracts } from "./models/ModifyExtracts";
import { ConfigServer } from "./servers/ConfigServer";
import { Configuration } from "./types";

// TODO: The AJV schema validation is required in prod., add it (and it's deps) to the .buildignore file.
// TODO: Test that the empty JSON history works in prod.

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

        // Register our custom MatchCallbacks class and overwrite the token on the original class so ours is used in
        // it's place. We're using this to get information about an extract after one's used, and this is only needed
        // if we're modifying the fence reputation or sending Fence gifts after a cooperation extract.
        if (this.coopFenceOpsEnabled()) {
            container.register<CustomMatchCallbacks>("CustomMatchCallbacks", CustomMatchCallbacks);
            container.register<MatchCallbacks>("MatchCallbacks", { useToken: "CustomMatchCallbacks" });
        }
    }

    /**
     * Check to see if the cooperation extract and fence operations are enabled within the configuration file.
     */
    private coopFenceOpsEnabled(): boolean {
        const coop = OpenExtracts.config.extracts.cooperation;
        return coop.convertToPayment && (coop.modifyFenceReputation || coop.sendFenceGifts);
    }

    /**
     * Trigger the changes to extracts once the database has loaded.
     */
    public postDBLoad(container: DependencyContainer): void {
        // If the configuration is null at this point we can stop here. This will happen if the configuration file
        // failed to load, failed to validate, or if the mod is disabled in the configuration file.
        if (OpenExtracts.config === null) {
            return;
        }

        // Load the Fence locale messages. These are only needed if we're modifying the fence reputation or sending
        // Fence gifts after a cooperation extract.
        if (this.coopFenceOpsEnabled()) {
            const locales: ILocaleBase = container.resolve<DatabaseServer>("DatabaseServer").getTables().locales;
            CooperationExtract.loadFenceMessages(locales); // Async function, but we don't need to wait for it.
        }

        // Modify the extracts based on the configuration.
        new ModifyExtracts();
    }
}

module.exports = { mod: new OpenExtracts() };
