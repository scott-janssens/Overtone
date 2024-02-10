import Color from "color";
import { AnyEvent, ChannelEvent, MetaEvent, ProgramChangeEvent, TrackNameEvent } from "midifile-ts";
import { Subject } from "rxjs";
import { ProgramChange, ProgramChanges } from "./ProgramChanges";

export class MidiTrack {
    private _name: string = "";
    get name() { return this._name; }

    private _events: MidiEvent[] = [];
    get events(): MidiEvent[] { return this._events; }

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

    constructor(events: AnyEvent[] | null = null) {
        let time = 0;

        if (events !== null) {
            events.forEach(x => {
                time += x.deltaTime;
                this.events.push(new MidiEvent(x, time));
            });

            for (let event of events) {
                if (event.type == "meta") {
                    this._name = (event as TrackNameEvent)!.text;
                }
                else if (event.type === "channel" && event.subtype === "programChange") {
                    let programChange = (event as ProgramChangeEvent).value;
                    this.program = ProgramChanges.get(programChange);
                }

                if (this._name !== "" && this.program !== undefined) {
                    break;
                }
            }
        }
    }

    Merge(track: MidiTrack): MidiTrack {
        const newTrack = new MidiTrack();
        newTrack._name = this._name;
        newTrack._program = this._program;
        newTrack._color = this._color;
        newTrack._isTrackVisible = true;

        let mergeTime = 0;
        let thisIdx = 0;
        let trackIdx = 0;

        while (thisIdx < this.events.length || trackIdx < track.events.length) {
            if (trackIdx >= track.events.length ||
                this.events[thisIdx]?.globalTime <= track.events[trackIdx].globalTime) {
                let newEvent = structuredClone(this.events[thisIdx]);
                newEvent.event.deltaTime = this.events[thisIdx].globalTime - mergeTime;
                newTrack.events.push(newEvent);
                mergeTime = this.events[thisIdx].globalTime;
                thisIdx++;
            }
            else {
                if (track.events[trackIdx].event.type != "meta") {
                    let newEvent = structuredClone(track.events[trackIdx]);
                    newEvent.event.deltaTime = track.events[trackIdx].globalTime - mergeTime;
                    newTrack.events.push(newEvent);
                    mergeTime = this.events[trackIdx].globalTime;
                    trackIdx++;
                }
                else {
                    trackIdx++;
                }
            }
        }

        return newTrack;
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
