import dump_modifier_list from "./dump_modifier_list";
import dump_panorama_css_properties from "./dump_panorama_css_properties";
import dump_panorama_events from "./dump_panorama_events";

export interface Handler {
    startString: string;
    endString: string;
    handle: (staging: string, output: string) => void;
} 
export default [
    new dump_panorama_css_properties(),
    new dump_panorama_events(),
    new dump_modifier_list(),
] as unknown as Handler[];
