import { AnyEvent, ProgramChangeEvent, TrackNameEvent } from "midifile-ts";
import { Subject } from "rxjs";
import { ProgramChange, ProgramChanges } from "./ProgramChanges";

export class MidiTrack {
    name: string = "";

    private _events: MidiEvent[] = [];
    get events(): MidiEvent[] { return this._events; }

    private _notes: NoteEvent[] = []
    get notes(): NoteEvent[] { return this._notes; }

    private _program: ProgramChange | undefined;
    public get program(): ProgramChange | undefined { return this._program; }
    public set program(value: ProgramChange | undefined) {
        if (this._program != value) {
            this._program = value;
            this.programChange.next(value);
        }
    }
    programChange: Subject<ProgramChange | undefined> = new Subject<ProgramChange | undefined>();

    private _color: string = "white";
    public get color(): string { return this._color; }
    public set color(value: string) {
        const newColor = value;
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
        const notes: { [Key: number]: NoteEvent | null } = {};
        let time = 0;

        if (events !== null) {
            events.forEach(x => {
                time += x.deltaTime;
                this.events.push(new MidiEvent(x, time));
            });

            for (const event of this.events) {
                if (event.event.type == "meta") {
                    this.name = (event.event as TrackNameEvent)!.text;
                }
                else if (event.event.type === "channel") {
                    switch (event.event.subtype) {
                        case "noteOn": {
                            const noteEvent = new NoteEvent(event.globalTime, event.event.noteNumber, event.event.velocity);
                            if (notes[event.event.noteNumber] == null) {
                                notes[event.event.noteNumber] = noteEvent;
                            }
                            break;
                        }
                        case "noteOff":
                            if (notes[event.event.noteNumber] != null) {
                                notes[event.event.noteNumber]!.end = event.globalTime;
                                this._notes.push(notes[event.event.noteNumber]!);
                                notes[event.event.noteNumber] = null;
                            }
                            break;
                        case "programChange": {
                            const programChange = (event.event as ProgramChangeEvent).value;
                            this.program = ProgramChanges.get(programChange);
                            break;
                        }
                    }
                }
            }
        }
    }

    Merge(track: MidiTrack): MidiTrack {
        const newTrack = new MidiTrack();
        newTrack.name = this.name;
        newTrack._program = this._program;
        newTrack._color = this._color;
        newTrack._isTrackVisible = true;

        let mergeTime = 0;
        let thisIdx = 0;
        let trackIdx = 0;

        while (thisIdx < this.events.length || trackIdx < track.events.length) {
            if (trackIdx >= track.events.length ||
                this.events[thisIdx]?.globalTime <= track.events[trackIdx].globalTime) {
                const newEvent = structuredClone(this.events[thisIdx]);
                newEvent.event.deltaTime = this.events[thisIdx].globalTime - mergeTime;
                newTrack.events.push(newEvent);
                mergeTime = this.events[thisIdx].globalTime;
                thisIdx++;
            }
            else {
                if (track.events[trackIdx].event.type != "meta") {
                    const newEvent = structuredClone(track.events[trackIdx]);
                    newEvent.event.deltaTime = track.events[trackIdx].globalTime - mergeTime;
                    newTrack.events.push(newEvent);
                    mergeTime = track.events[trackIdx].globalTime;
                    trackIdx++;
                }
                else {
                    trackIdx++;
                }
            }
        }

        return newTrack;
    }

    *notesFrom(globalTime: number): Generator<NoteEvent> {
        for (let i = this.noteTimeBinarySearch(globalTime); i < this._notes.length; i++) {
            yield this._notes[i];
        }
    }

    private noteTimeBinarySearch(globalTime: number): number {
        if (this._notes.length === 0) {
            return -1;
        }

        let left = 0;
        let right = this._notes.length;
        let length = right - left;
        let i = Math.floor(length / 2);

        while (left < right) {
            if (this._notes[i].end === globalTime) {
                break;
            }

            if (globalTime < this._notes[i].end!) {
                if (right === i) {
                    break;
                }

                right = i;
            }
            else {
                if (left === i) {
                    break;
                }
                left = i;
            }

            length = right - left;
            i = left + Math.floor(length / 2);
        }

        while (i > 0 && this._notes[i].end! >= globalTime) {
            i--;
        }

        return i;
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

export class NoteEvent {
    private static _lastId: number = 0;
    public readonly id: number = 0;
    public readonly start: number;
    public readonly noteNumber: number;
    public readonly velocity: number;

    private _end: number | null = null;
    public get end(): number | null { return this._end; }
    public set end(value: number) {
        this._end = value;
        this._width = value - this.start;
    }

    private _width: number | null = null;
    public get width(): number | null { return this._width; }

    constructor(start: number, noteNumber: number, velocity: number) {
        this.id = ++NoteEvent._lastId;
        this.start = start;
        this.velocity = velocity;
        this.noteNumber = noteNumber;
    }
}