#!/usr/bin/env node

import fs from "fs";
import os from "os";
import path from "path";
import ignore from "ignore";
import archiver from "archiver";
import winston from "winston";

const args = process.argv.slice(2);
const verbose = args.includes("--verbose") || args.includes("-v");

const logLevels = {
    error: 0,
    warn: 1,
    success: 2,
    info: 3,
};

const logColors = {
    error: "red",
    warn: "yellow",
    info: "grey",
    success: "green",
};

winston.addColors(logColors);

const logger = winston.createLogger({
    levels: logLevels,
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(info => {
            return `${info.level}: ${info.message}`;
        })
    ),
    transports: [
        new winston.transports.Console({
            level: verbose ? "info" : "success",
        }),
    ],
});

async function main() {
    const currentDir = getCurrentDirectory();
    let projectDir;

    try {
        const buildIgnorePatterns = await loadBuildIgnoreFile(currentDir);

        const packageJson = await loadPackageJson(currentDir);
        const projectName = createProjectName(packageJson);
        logger.log("success", `Project name created: ${projectName}`);

        const distDir = await cleanAndCreateDistDirectory(currentDir);
        logger.log("info", `Distribution directory successfully cleaned.`);

        projectDir = await createTemporaryDirectoryWithProjectName(projectName);
        logger.log("success", `Temporary working directory successfully created.`);
        logger.log("info", projectDir);

        logger.log("info", "Beginning copy operation using .buildignore file...");
        await copyFiles(currentDir, projectDir, buildIgnorePatterns);
        logger.log("success", "Files successfully copied to temporary directory.");

        logger.log("info", "Beginning folder compression...");
        const zipFilePath = path.join(path.dirname(projectDir), `${projectName}.zip`);
        await createZipFile(projectDir, zipFilePath, "user/mods/" + projectName);
        logger.log("success", "Archive successfully created.");
        logger.log("info", zipFilePath);

        const zipFileInProjectDir = path.join(projectDir, `${projectName}.zip`);
        await fs.promises.rename(zipFilePath, zipFileInProjectDir);
        logger.log("success", "Archive successfully moved.");
        logger.log("info", zipFileInProjectDir);

        await fs.promises.rename(projectDir, path.join(distDir));
        logger.log("success", "Temporary directory successfully moved into project distribution directory.");

        logger.log("success", "------------------------------------");
        logger.log("success", "Build script completed successfully!");
        logger.log("success", "Your mod package has been created in the 'dist' directory:");
        logger.log("success", `/${path.relative(process.cwd(), path.join(distDir, `${projectName}.zip`))}`);
        logger.log("success", "------------------------------------");
        if (!verbose) {
            logger.log("success", "To see a detailed build log, use `npm run buildinfo`.");
            logger.log("success", "------------------------------------");
        }
    } catch (err) {
        logger.log("error", "An error occurred: " + err);
    } finally {
        if (projectDir) {
            try {
                await fs.promises.rm(projectDir, { force: true, recursive: true });
                logger.log("info", "Cleaned temporary directory.");
            } catch (err) {
                logger.log("error", "Failed to clean temporary directory: " + err);
            }
        }
    }
}

function getCurrentDirectory() {
    return path.dirname(new URL(import.meta.url).pathname);
}

async function loadBuildIgnoreFile(currentDir) {
    const buildIgnorePath = path.join(currentDir, ".buildignore");
    try {
        const fileContent = await fs.promises.readFile(buildIgnorePath, "utf-8");
        const ig = ignore().add(fileContent.split("\n"));
        return ig;
    } catch (err) {
        logger.log("warn", "Failed to read .buildignore file. No files or directories will be ignored.");
        return ignore(); // Return an ignore instance with no patterns
    }
}

async function loadPackageJson(currentDir) {
    const packageJsonPath = path.join(currentDir, "package.json");
    const packageJsonContent = await fs.promises.readFile(packageJsonPath, "utf-8");
    return JSON.parse(packageJsonContent);
}

function createProjectName(packageJson) {
    const author = packageJson.author.replace(/\W/g, "").toLowerCase();
    const name = packageJson.name.replace(/\W/g, "").toLowerCase();
    const version = packageJson.version;
    return `${author}-${name}-${version}`;
}

async function cleanAndCreateDistDirectory(projectDir) {
    const distPath = path.join(projectDir, "dist");
    await fs.promises.rm(distPath, { force: true, recursive: true });

    await fs.promises.mkdir(distPath);
    return distPath;
}

async function createTemporaryDirectoryWithProjectName(projectName) {
    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "spt-mod-build-"));
    const projectDir = path.join(tempDir, projectName);
    await fs.promises.mkdir(projectDir);
    return projectDir;
}

async function copyFiles(srcDir, destDir, ignoreHandler) {
    try {
        const entries = await fs.promises.readdir(srcDir, { withFileTypes: true });
        const copyOperations = [];

        for (const entry of entries) {
            const srcPath = path.join(srcDir, entry.name);
            const destPath = path.join(destDir, entry.name);
            const relativePath = path.relative(process.cwd(), srcPath);

            if (ignoreHandler.ignores(relativePath)) {
                logger.log("info", `Ignored: /${path.relative(process.cwd(), srcPath)}`);
                continue;
            }

            if (entry.isDirectory()) {
                await fs.promises.mkdir(destPath);
                copyOperations.push(copyFiles(srcPath, destPath, ignoreHandler));
            } else {
                copyOperations.push(
                    fs.promises.copyFile(srcPath, destPath).then(() => {
                        logger.log("info", `Copied: /${path.relative(process.cwd(), srcPath)}`);
                    })
                );
            }
        }

        await Promise.all(copyOperations);
    } catch (err) {
        logger.log("error", "Error copying files: " + err);
    }
}

async function createZipFile(directoryToZip, zipFilePath, containerDirName) {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipFilePath);
        const archive = archiver("zip", {
            zlib: { level: 9 }, // Sets the compression level.
        });

        output.on("close", function () {
            logger.log("info", "Archiver has finalized. The output and the file descriptor have closed.");
            resolve();
        });

        archive.on("warning", function (err) {
            if (err.code === "ENOENT") {
                logger.log("warn", `Archiver issued a warning: ${err.code} - ${err.message}`);
            } else {
                reject(err);
            }
        });

        archive.on("error", function (err) {
            reject(err);
        });

        archive.pipe(output);
        archive.directory(directoryToZip, containerDirName);
        archive.finalize();
    });
}

// Entry point
main();
