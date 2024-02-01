import { AnyEvent, TrackNameEvent } from "midifile-ts";

export class MidiTrackMetaData {
    name: string = "";    
    color: string = "";
    
    private _isTrackVisible: boolean = true;
    get isTrackVisible() {return this._isTrackVisible;}
    set isTrackVisible(value: boolean ) {
        this._isTrackVisible = value;
        this._isSequenceVisible = value;
    }

    private _isSequenceVisible: boolean = true;
    get isSequenceVisible() {return this._isSequenceVisible;}
    set isSequenceVisible(value: boolean) {
        this._isSequenceVisible = value;
    }

    constructor(events: AnyEvent[]) {
        for (let event of events) {
            let trackName = event as TrackNameEvent;

            if (trackName != null) {
                this.name = trackName.text;
                break;
            }
        }
    }
}