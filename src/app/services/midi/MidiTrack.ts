import Color from "color";
import { AnyEvent, TrackNameEvent } from "midifile-ts";
import { Subject } from "rxjs";

export class MidiTrack {
    readonly name: string = "";
    readonly events: MidiEvent[] = [];

    private _color: Color = Color("white");
    public get color(): string { return this._color.hex(); }
    public set color(value: string) {
        const newColor = Color(value);
        if (this._color != newColor) {
            this._color = newColor;
            this.colorChange.next(this);
        }
    }
    colorChange: Subject<MidiTrack> = new Subject<MidiTrack>();

    private _isTrackVisible: boolean = true;
    get isTrackVisible() { return this._isTrackVisible; }
    set isTrackVisible(value: boolean) {
        if (this._isTrackVisible != value) {
            this._isTrackVisible = value;
            this.trackVisibilityChange.next(this);
        }
    }
    trackVisibilityChange: Subject<MidiTrack> = new Subject<MidiTrack>();

    constructor(events: AnyEvent[]) {
        let time = 0;

        events.forEach(x => {
            time += x.deltaTime;
            this.events.push(new MidiEvent(x, time));
        });

        for (let event of events) {
            let trackName = event as TrackNameEvent;

            if (trackName != null) {
                this.name = trackName.text;
                break;
            }
        }
    }
}

export class MidiEvent {
    readonly event: AnyEvent;
    readonly globalTime: number;

    constructor(event: AnyEvent, globalTime: number) {
        this.event = event;
        this.globalTime = globalTime;
    }
}
