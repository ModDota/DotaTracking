import { writeFileSync } from "fs";
import { Handler } from "./index";

export default class DumpModifierList implements Handler {
    public startString = "[ModDota] Start Modifiers";
    public endString = "[ModDota] End Modifiers";

    public handle(staging: string, output: string) {
        const result = output.split("\r\n").sort((a,b) => a.toLowerCase().localeCompare(b.toLowerCase()))

        writeFileSync(staging + "_data/modifiers.json", JSON.stringify(result, undefined, 4));
        console.log("dumped Modifiers");
    }
}