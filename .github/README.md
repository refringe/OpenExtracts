# Open Extracts

This is a mod for [Single Player Tarkov](https://www.sp-tarkov.com/).

This mod gives you the following configurable extract options:

-   Make extracts available no matter what side of the map you spawned.
-   Updates the percentage that random extracts are available.
-   Updates CO-OP extracts to be useable via payment (like cars).
    -   Increases Fence reputation.
-   Updates no-backpack extracts to be useable with backpacks.
-   Updates cliff extracts to be useable without a paracord, red rebel, and with an armored rig.
-   Sets a maximum hold time for extracts.

_\*All options are disabled by default_

# To install:

1. Decompress the contents of the download into your root SPT directory.
2. Open the `OpenExtracts/config/config.json5` file to adjust configuration options.
3. Leave a review and let me know what you think.

If you experience any problems, please [submit a detailed bug report](https://github.com/refringe/OpenExtracts/issues).

# To Build Locally:

This project has been built in [Visual Studio Code](https://code.visualstudio.com/) (VSC) using [Node.js](https://nodejs.org/). If you are unfamiliar with Node.js, I recommend using [NVM](https://github.com/nvm-sh/nvm) to manage installation and switching versions. If you do not wish to use NVM, you will need to install the version of Node.js listed within the `.nvmrc` file manually.

This project uses [Prettier](https://prettier.io/) to format code on save.

To build the project locally:

1. Clone the repository.
2. Open the `mod.code-workspace` file in Visual Studio Code (VSC).
3. Install the [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) VSC extension.
4. Install the [JSON5](https://marketplace.visualstudio.com/items?itemName=mrmlnc.vscode-json5) VSC extension.
5. Run `nvm use` in the terminal.
6. Run `npm install` in the terminal.
7. Run `npm run build` in the terminal.
