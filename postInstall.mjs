#!/usr/bin/env node

/*
 * This script is used to remove the local tsyringe package when running inside the SPT-AKI project directory. This is
 * necessary because the local tsyringe package will override the SPT-AKI tsyringe package, which will cause dependency
 * injection to fail in a very confusing way, which will likely consume your afternoon and make you want to cry. :D
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const sptProjectFile = path.join(currentDirectory, '../../../src/Program.ts');
const isInsideSptProject = fs.existsSync(sptProjectFile);

if (isInsideSptProject) {
    exec('rm -rf node_modules/tsyringe', err => {
        if (err) {
            console.error('postInstall: Failed to remove local tsyringe package:', err);
            process.exit(1);
        } else {
            console.log('postInstall: Removed local tsyringe package. SPT project tsyringe package will be used.');
            process.exit(0);
        }
    });
} else {
    console.log('postInstall: Running outside of SPT project. Keeping local tsyringe package.');
    process.exit(0);
}