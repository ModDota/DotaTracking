import { writeFileSync } from "fs";
import { Handler } from "./index";

export default class DumpPanoramaEvents implements Handler {
    public startString = "[ModDota] Start Events";
    public endString = "[ModDota] End Events";

    public handle(staging: string, output: string) {
        // writeFileSync("./staging/eventsRaw.txt", output);
        const result = {}

        const lines = output.split("\r\n")
            .filter(val => val.startsWith("| "))
            .map(val => val.slice(2));
        for (let i = 0; i < lines.length / 3; i += 3) {
            // <code>AddStyleAfterDelay(string class, float pre-delay)</code>
            const info = lines[i].slice(6, -7);
            const args = info.slice(info.indexOf("(") + 1, info.lastIndexOf(")")).split(", ").filter(val => val)
            .map(val => ({
                name: val.slice(val.lastIndexOf(" ") + 1),
                type: val.slice(0, val.lastIndexOf(" ")),
            }))
            const name = info.slice(0, info.indexOf("("));
            result[name] = {
                description: lines[i + 2],
                panelEvent: lines[i + 1] === "Yes",
                args,
            }
        }
        writeFileSync(staging + "__data/events.json", JSON.stringify(result, undefined, 4));
        console.log("dumped Events");
    }
}