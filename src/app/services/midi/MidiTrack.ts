import { AnyEvent } from "midifile-ts";
import { MidiTrackMetaData } from "./MidiTrackMetaData";

export class MidiTrack {
    readonly meta: MidiTrackMetaData;
    readonly events: AnyEvent[];

    constructor(events: AnyEvent[]) {
        this.events = events;
        this.meta = new MidiTrackMetaData(events);
    }
}