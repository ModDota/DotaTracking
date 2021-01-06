import * as fs from "fs";
import * as fse from "fs-extra";
import * as child_process from "child_process";
import * as express from "express";
import * as sortJson from "sort-json";

import { GameExtension, sleep } from "../index";
import commands from "./commands";

function getConsoleInfo(consoleOut: string, start: string, stop: string) {
    return consoleOut.slice(consoleOut.indexOf(start) + start.length + 1, consoleOut.indexOf(stop))
        .replace(/^\d\d\/\d\d \d\d:\d\d:\d\d /gm, "")
        .slice(1, -1);   
}

export default class DotaExtension implements GameExtension {
    app = express();
    constructor() {
        this.app.use(express.json({limit: '50mb'}));
        this.app.use(express.urlencoded({limit: '50mb'}));

        this.app.post(["/client", "/server"], (req, res) => {
            console.log(req.path, req.body);
            res.sendStatus(200);
        });

        this.app.post("/disk/:filepath", async (req, res) => {
            console.log(`Requested disk write for ${req.params.filepath}`);
            if (req.params.filepath) {
                await fs.promises.writeFile(`${process.env.DOTA_PATH}/game/dota_addons/dump_gamemode/scripts/vscripts/${req.params.filepath}`, JSON.stringify(req.body));
                return res.sendStatus(200);
            }
            return res.sendStatus(400);
        });

        this.app.get("/delay", async (req, res) => {
            console.log("Delay requested");
            await sleep(10_000);
            res.status(200).json({});
        });
        this.app.listen(8888, () => console.log(`DotaTracking internal server now running on port 8888!`))
    }
    appid = 570;
    checkVersion() : Promise<{oldVersion: string, newVersion: string}> {
        return new Promise((resolve, reject) => {
            fs.readFile("./version.txt", (err, data) => {
                let oldVersion: string;
                if (err) {
                    oldVersion = "0000";
                } else {
                    oldVersion = data.toString();
                }
                fs.readFile(`${process.env.DOTA_PATH}/game/dota/steam.inf`, (err, data) => {
                    const info = data.toString();
                    const newVersion = /ClientVersion=([0-9\.]*)/.exec(info)[1];
                    console.log(oldVersion, newVersion);
                    fs.writeFile("./version.txt", newVersion, {}, err => {
                        if (err) {
                            console.error("Write Version", err);
                        }
                    });
                    resolve({
                        oldVersion,
                        newVersion,
                    });
                })
            });
        })
    }
    async clean() {
        console.log("Cleaning dota");
        fse.removeSync(`${process.env.DOTA_PATH}/game/dota_addons/dump_gamemode`);
        fse.removeSync(`${process.env.DOTA_PATH}/content/dota_addons/dump_gamemode`);
    }
    async prepare() {
        console.log("Preparing dota");
        fse.copySync("./dota/gamemode/game", `${process.env.DOTA_PATH}/game/dota_addons/dump_gamemode`);
        fse.copySync("./dota/gamemode/content", `${process.env.DOTA_PATH}/content/dota_addons/dump_gamemode`);
    }
    run() {
        return new Promise<void>((resolve, reject) => {
            child_process.spawn(`${process.env.DOTA_PATH}/game/bin/win64/vconsole2.exe`, [], {
                detached: true,
            });
            // TODO: Add "-nowindow" back, // "-hushsteam"
            const childProcess = child_process.spawn(`${process.env.DOTA_PATH}/game/bin/win64/dota2.exe`, ["-dev", "-vconsole", "-language dump", "-consolelog", "-novid"]);
            // childProcess.stdout.on("data", data => console.log(`[Dota2] [OUT] ${data}`));
            // childProcess.stderr.on("data", data => console.error(`[Dota2] [ERR] ${data}`));
            childProcess.on("exit", (code, signal) => {
                console.log(code, signal);
                resolve();
            });
        });
    }
    async postProcess(staging: string) {
        fs.copyFileSync(`${process.env.DOTA_PATH}/game/dota_addons/dump_gamemode/scripts/vscripts/lua_client.json`, staging + "_data/lua_client.json");
        fs.copyFileSync(`${process.env.DOTA_PATH}/game/dota_addons/dump_gamemode/scripts/vscripts/lua_client_enums.json`, staging + "_data/lua_client_enums.json");
        fs.copyFileSync(`${process.env.DOTA_PATH}/game/dota_addons/dump_gamemode/scripts/vscripts/lua_server.json`, staging + "_data/lua_server.json");
        fs.copyFileSync(`${process.env.DOTA_PATH}/game/dota_addons/dump_gamemode/scripts/vscripts/lua_server_enums.json`, staging + "_data/lua_server_enums.json");

        const consoleOut = fs.readFileSync(`${process.env.DOTA_PATH}/game/dota/console.log`, {encoding: "utf8"});
        console.log(commands);
        for (const handler of commands) {
            handler.handle(staging, getConsoleInfo(consoleOut, handler.startString, handler.endString));
        }

        // Lua's json writer is shit, lets format it again
        sortJson.overwrite([
            staging + "_data/lua_client.json",
            staging + "_data/lua_client_enums.json",
            staging + "_data/lua_server.json",
            staging + "_data/lua_server_enums.json",
        ], {
            indentSize: 4,
        });
    }
}