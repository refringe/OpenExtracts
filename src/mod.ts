import { DependencyContainer } from "tsyringe";
import type { ILogger } from "@spt-aki/models/spt/utils/ILogger";
import type { IPostDBLoadMod } from "@spt-aki/models/external/IPostDBLoadMod";
import type { DatabaseServer } from "@spt-aki/servers/DatabaseServer";

class OpenExtracts implements IPostDBLoadMod
{
    private config = require("../config/config.json");
    private container: DependencyContainer;
    private logger;
    private debug = false;

    public postDBLoad(container: DependencyContainer):void
    {
        this.container = container;

        // Get the logger from the server container.
        this.logger = this.container.resolve<ILogger>("WinstonLogger");

        // Check to see if the mod is enabled.
        const enabled:boolean = this.config.mod_enabled;
        if (!enabled)
        {
            this.logger.info("OpenExtracts is disabled in the config file. No changes to raid extracts will be made.");
            return;
        }

        // We loud?
        this.debug = this.config.debug;

        // Get the location data
        const locations = this.container.resolve<DatabaseServer>("DatabaseServer").getTables().locations;

        // Fire.
        this.updateExtracts(locations);

        // Done.
        this.logger.info("OpenExtracts: Raid extracts have been updated.");
    }

    private updateExtracts(locations:any):void
    {
        // Initialize an array of the location names
        const locationNames = [
            "bigmap",
            "factory4_day",
            "factory4_night",
            "interchange",
            "laboratory",
            "lighthouse",
            "rezervbase",
            "shoreline",
            "woods"
        ];

        // Loop through each location
        for (const location of locationNames)
        {
            // Loop through each extract
            for (const extract in locations[location].base.exits)
            {
                // Make extracts available no matter what side of the map you spawned.
                const newEntryPoint = this.getEntryPoints(locations[location].base.Id);
                if (this.config.ignore_entry_point && locations[location].base.exits[extract].EntryPoints !== newEntryPoint)
                {
                    locations[location].base.exits[extract].EntryPoints = newEntryPoint;
                    if (this.debug)
                        this.logger.debug(`Extract "${locations[location].base.exits[extract].Name}" on "${locations[location].base.Id}" has been updated to allow all entry points.`);
                }
                
                // Updates the percentage that random extracts are available.
                if (this.config.random_extract_update && this.config.random_extract_chance >= 0 && this.config.random_extract_chance <= 100 && locations[location].base.exits[extract].Chance !== this.config.random_extract_chance)
                {
                    locations[location].base.exits[extract].Chance = this.config.random_extract_chance;
                    if (this.debug)
                        this.logger.debug(`Extract "${locations[location].base.exits[extract].Name}" on "${locations[location].base.Id}" has a ${this.config.random_extract_chance}% chance to be enabled.`);
                }
                    
                // If this is a train extract, we've done enough. Move on to the next extract.
                if (locations[location].base.exits[extract].PassageRequirement === "Train")
                {
                    continue;
                }

                // Updates CO-OP extracts to be useable via payment (like cars).
                if (this.config.convert_cooperation && locations[location].base.exits[extract].PassageRequirement === "ScavCooperation")
                {
                    locations[location].base.exits[extract].PassageRequirement = "TransferItem";
                    locations[location].base.exits[extract].RequirementTip = "EXFIL_Item";
                    locations[location].base.exits[extract].Id = this.config.cooperation_item;
                    locations[location].base.exits[extract].Count = this.config.cooperation_number;

                    if (this.debug)
                        this.logger.debug(`Extract "${locations[location].base.exits[extract].Name}" on "${locations[location].base.Id}" has been converted to a payment extract.`);
                }

                // Updates no-backpack extracts to be useable with backpacks.
                if (this.config.ignore_backpack_requirements && locations[location].base.exits[extract].RequirementTip === "EXFIL_tip_backpack" && locations[location].base.exits[extract].RequiredSlot === "Backpack")
                {
                    locations[location].base.exits[extract].PassageRequirement = "None";
                    locations[location].base.exits[extract].RequiredSlot = "FirstPrimaryWeapon";
                    locations[location].base.exits[extract].RequirementTip = "";

                    if (this.debug)
                        this.logger.debug(`Extract "${locations[location].base.exits[extract].Name}" on "${locations[location].base.Id}" has had it's backpack requirement removed.`);
                }

                // Updates cliff extracts to be useable without a paracord, red rebel, and with an armored rig.
                if (this.config.ignore_cliff_requirements && locations[location].base.exits[extract].Name === "Alpinist")
                {
                    locations[location].base.exits[extract].Id = "";
                    locations[location].base.exits[extract].PassageRequirement = "None";

                    if (this.debug)
                        this.logger.debug(`Extract "${locations[location].base.exits[extract].Name}" on "${locations[location].base.Id}" has had it's paracord, red rebel, and armored rig requirements removed.`);
                }

                // Sets a maximum hold time for extracts.
                if (locations[location].base.exits[extract].ExfiltrationTime > this.config.max_extraction_time)
                {
                    locations[location].base.exits[extract].ExfiltrationTime = this.config.max_extraction_time;
                    if (this.debug)
                        this.logger.debug(`Extract "${locations[location].base.exits[extract].Name}" on "${locations[location].base.Id}" has had it's extraction time updated to ${this.config.max_extraction_time} seconds.`);
                }

                // There's no CO-OP in SPT, so adjust some other extract settings accordingly.
                locations[location].base.exits[extract].ExfiltrationType = "Individual";
                locations[location].base.exits[extract].PlayersCount = 0;
            }
        }
    }

    private getEntryPoints(location:string):string
    {
        switch (location) {
            case "bigmap":
                return "Customs,Boiler Tanks";
            case "factory4_day":
                return "Factory";
            case "factory4_night":
                return "Factory";
            case "Interchange":
                return "MallSE,MallNW";
            case "laboratory":
                return "Common";
            case "Lighthouse":
                return "Tunnel,North";
            case "RezervBase":
                return "Common";
            case "Shoreline":
                return "Village,Riverside";
            case "Woods":
                return "House,Old Station";
            default:
                this.logger.warning(`Unknown location: ${location}`);
                return "";
        }
    }
}

module.exports = {mod: new OpenExtracts()};
