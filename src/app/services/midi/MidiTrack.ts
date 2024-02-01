import { AnyEvent, TrackNameEvent } from "midifile-ts";
import { Subject } from "rxjs";

export class MidiTrack {
    readonly name: string = "";
    readonly events: AnyEvent[];

    private _color: string = "green";
    public get color(): string { return this._color; }
    public set color(value: string) {
        if (this._color != value) {
            this._color = value;
            this.colorChange.next(this);
        }
    }
    colorChange: Subject<MidiTrack> = new Subject<MidiTrack>();

    private _isTrackVisible: boolean = true;
    get isTrackVisible() { return this._isTrackVisible; }
    set isTrackVisible(value: boolean) {
        if (this._isTrackVisible != value) {
            this._isTrackVisible = value;
            this._isSequenceVisible = value;
            this.trackVisibilityChange.next(this);
        }
    }
    trackVisibilityChange: Subject<MidiTrack> = new Subject<MidiTrack>();

    private _isSequenceVisible: boolean = true;
    get isSequenceVisible() { return this._isSequenceVisible; }
    set isSequenceVisible(value: boolean) {
        if (this._isSequenceVisible != value) {
            this._isSequenceVisible = value;
            this.overtoneVisibilityChange.next(this);
        }
    }
    overtoneVisibilityChange: Subject<MidiTrack> = new Subject<MidiTrack>();

    constructor(events: AnyEvent[]) {
        this.events = events;

        for (let event of events) {
            let trackName = event as TrackNameEvent;

            if (trackName != null) {
                this.name = trackName.text;
                break;
            }
        }
    }
}