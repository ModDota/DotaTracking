
import { writeFileSync } from "fs";
import { Handler } from "./index";

const EXAMPLES_REGEXP = /\n\n<b>Examples?:<\/b><pre>(.+)<\/pre>$/s;

export default class DumpPanoramaCSSProperties implements Handler {
    public startString = "[ModDota] Start CSS Properties";
    public endString = "[ModDota] End CSS Properties";

    public handle(staging: string, output: string) {
        // writeFileSync("./staging/cssPropertiesRaw.txt", output);
        const result = {};

        const entries = output.slice(4)
        .split(/\n=== /)
        .map(x => x
            .trim()
            .replace(/<br>/g, '\n')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/ {2,}/, ' ')
            .split('\n')
            .map(l => l.trim()),
        );
        for (let [rule, ...restLines] of entries) {
            rule = rule.slice(0, -4);
            const info = restLines.join('\n');
            const description = info.replace(EXAMPLES_REGEXP, '');
            const examples = (info.match(EXAMPLES_REGEXP) && info.match(EXAMPLES_REGEXP)[1] || "")
              .split('\n')
              .filter(x => x !== '')
              .reduceRight<string[]>(
                (accumulator, v) =>
                  v.startsWith('//')
                    ? [...accumulator.filter((_, i) => i < accumulator.length - 1), `${v}\n${accumulator[accumulator.length - 1]}`]
                    : [...accumulator, v],
                [],
              )
              .reverse();
            result[rule] = {
                description,
                examples,
            }
        }
        writeFileSync(staging + "_data/css_properties.json", JSON.stringify(result, undefined, 4));
        console.log("dumped CSS Properties");
    }
}