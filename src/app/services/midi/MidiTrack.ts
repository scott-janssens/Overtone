import Color from "color";
import { AnyEvent, ChannelEvent, MetaEvent, ProgramChangeEvent, TrackNameEvent } from "midifile-ts";
import { Subject } from "rxjs";
import { ProgramChange, ProgramChanges } from "./ProgramChanges";

export class MidiTrack {
    readonly name: string = "";
    readonly events: MidiEvent[] = [];

    private _program: ProgramChange | undefined;
    public get program(): ProgramChange | undefined { return this._program; }
    public set program(value: ProgramChange) {
        if (this._program != value) {
            this._program = value;
            this.programChange.next(value);
        }
    }
    programChange: Subject<ProgramChange> = new Subject<ProgramChange>();

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
            if (event.type == "meta") {
                this.name = (event as TrackNameEvent)!.text;
            }
            else if (event.type === "channel" && event.subtype === "programChange") {
                let programChange = (event as ProgramChangeEvent).value;
                this.program = ProgramChanges.get(programChange);
            }

            if (this.name !== "" && this.program !== undefined) {
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
