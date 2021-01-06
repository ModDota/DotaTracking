import * as fs from "fs";
import * as child_process from "child_process";


require('dotenv').config();
import git = require("isomorphic-git");
import { gitAddA } from './git_utils';

import DotaExtension from "./dota";

if (process.env.DOTA_PATH.startsWith(".\\")) {
    process.env.DOTA_PATH = __dirname + process.env.DOTA_PATH.substr(".\\".length);
}
function steamcmd(appid: number) {
    return new Promise((resolve, reject) => {
        try {
            const childProcess = child_process.spawn(`${__dirname}\\steamcmd\\steamcmd.exe`, [
                `+login ${process.env.STEAM_USERNAME} ${process.env.STEAM_PASSWORD}`,
                `+force_install_dir ${process.env.DOTA_PATH}`,
                `+app_update ${appid}`,
                `+quit`
            ]);
            childProcess.stdout.on("data", data => console.log(`[SteamCMD] [OUT] ${data}`));
            childProcess.stderr.on("data", data => console.error(`[SteamCMD] [ERR] ${data}`));
            childProcess.on("error", err => console.error(err));
            childProcess.on("exit", (code, signal) => {
                console.log(code, signal);
                resolve();
            });
        } catch (e) {
            console.error("steamcmd failed, wat", e);
            // Lets try waiting a bonus 5 minutes when steamcmd wants a nap
            return sleep(5 * 60 * 1000);
        }
    });
}

export async function sleep(ms: number) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    })
}

async function gitInit() {
    const repo = {
        fs,
        dir: __dirname + "/staging",
    }
    await git.clone({
        ...repo,
        url: "https://github.com/ModDota/API",
        ref: "master"
    });
    await git.pull({
        ...repo,
    })
}
async function gitStuff(message: string) {
    const repo = {
        fs,
        dir: __dirname + "/staging",
    }
    await gitAddA(git, repo);
    await git.commit({
        ...repo,
        message,
        author: {
            name: "Dota Tracking",
            email: "dotatracking@github.361zn.is"
        }
    });
    await git.push({
        ...repo,
        token: process.env.GIT_TOKEN,
    })
}

export interface GameExtension {
    appid: number;
    checkVersion() : Promise<{oldVersion: string, newVersion: string}>;
    prepare(): Promise<void>;
    run(): Promise<void>;
    clean(): Promise<void>;
    postProcess(staging: string): Promise<void>;
}

export async function main(instance: GameExtension) {
    let successIterations = 0;
    while(true) {
        let oldVersion = "0000";
        let newVersion = "1234"
        if (process.env.USE_STEAMCMD === "true") {
            await steamcmd(instance.appid);
            const versionInfo = await instance.checkVersion();
            oldVersion = versionInfo.oldVersion;
            newVersion = versionInfo.newVersion;
        }
        // const {oldVersion, newVersion} = {oldVersion: "0000", newVersion:"1234"};
        if (oldVersion !== newVersion) {
            console.log("New version detected!");
            // init BEFORE running dota so we don't override our dumps with the past
            if (process.env.USE_GIT === "true") {
                await gitInit();
            } else {
                // Create the folder as node doesn't like copying files to folders that don't exist
                try {
                    fs.mkdirSync("./staging");
                } catch {
                    // Oh no the folder already exists... Problem solved I guess
                }
            }
            if (process.env.USE_DOTA === "true") {
                await instance.prepare();
                await instance.run();
            }
            await instance.postProcess(__dirname + "/staging/");
            if (process.env.USE_DOTA === "true") {
                await instance.clean();
            }
            if (process.env.USE_GIT === "true") {
                await gitStuff(`${newVersion}`);
            }
        } else {
            if (successIterations > 0 && process.env.USE_LOOP === "false") {
                process.exit(0);
            }
            await sleep(1000 * 60 * 2);
        }
        successIterations++;
    }
}
if (require.main === module) {
    // TODO: Expand to allow multiple apps to run in parallel
    main(new DotaExtension());
}