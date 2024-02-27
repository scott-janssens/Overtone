import { AnyEvent, ProgramChangeEvent } from "midifile-ts";
import { Subject } from "rxjs";
import { ProgramChange, ProgramChanges } from "./ProgramChanges";

export class MidiTrack {
    name: string = "";

    private _events: MidiEvent[] = [];
    get events(): MidiEvent[] { return this._events; }

    private _notes: Note[] = []
    get notes(): Note[] { return this._notes; }

    private _endOfTrack: number = -1;
    get endOfTrack(): number { return this._endOfTrack; }

    private _program: ProgramChange | undefined;
    get program(): ProgramChange | undefined { return this._program; }
    set program(value: ProgramChange | undefined) {
        if (this._program != value) {
            this._program = value;
            this.programChange.next(value);
        }
    }
    programChange: Subject<ProgramChange | undefined> = new Subject<ProgramChange | undefined>();

    private _color: string = "white";
    get color(): string { return this._color; }
    set color(value: string) {
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
        const notes: { [Key: number]: Note | null } = {};
        let time = 0;

        if (events !== null) {
            events.forEach(event => {
                let eventIsNote: boolean = false;
                time += event.deltaTime;

                if (event.type === "meta") {
                    switch (event.subtype) {
                        case "trackName":
                            this.name = event.text;
                            break;
                        case "endOfTrack":
                            this._endOfTrack = time;
                            break;
                    }
                }
                else if (event.type === "channel") {
                    switch (event.subtype) {
                        case "noteOn": {
                            eventIsNote = true;
                            const noteEvent = new Note(time, event.noteNumber, event.velocity);
                            if (notes[event.noteNumber] == null) {
                                notes[event.noteNumber] = noteEvent;
                            }
                            break;
                        }
                        case "noteOff":
                            eventIsNote = true;
                            if (notes[event.noteNumber] != null) {
                                notes[event.noteNumber]!.end = time;
                                this._notes.push(notes[event.noteNumber]!);
                                notes[event.noteNumber] = null;
                            }
                            break;
                        case "programChange": {
                            const programChange = (event as ProgramChangeEvent).value;
                            this.program = ProgramChanges.get(programChange);
                            break;
                        }
                    }
                }

                if (!eventIsNote) {
                    this._events.push(new MidiEvent(event, time));
                }
            });

            if (this._endOfTrack < 0) {
                this._endOfTrack = this._notes[this._notes.length - 1].end!;
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

        while (thisIdx < this._events.length || trackIdx < track._events.length) {
            if (trackIdx >= track._events.length ||
                this._events[thisIdx]?.globalTime <= track._events[trackIdx].globalTime) {
                const newEvent = structuredClone(this.events[thisIdx]);
                newEvent.event.deltaTime = this._events[thisIdx].globalTime - mergeTime;
                newTrack._events.push(newEvent);
                mergeTime = this._events[thisIdx].globalTime;
                thisIdx++;
            }
            else {
                if (track.events[trackIdx].event.type !== "meta") { // only keep meta data from "this" track
                    const newEvent = structuredClone(track.events[trackIdx]);
                    newEvent.event.deltaTime = track._events[trackIdx].globalTime - mergeTime;
                    newTrack._events.push(newEvent);
                    mergeTime = track._events[trackIdx].globalTime;
                }

                trackIdx++;
            }
        }

        thisIdx = 0;
        trackIdx = 0;

        while (thisIdx < this._notes.length || trackIdx < track._notes.length) {
            if (trackIdx >= track._notes.length ||
                (thisIdx < this._notes.length && this._notes[thisIdx].start <= track._notes[trackIdx].start)) {
                newTrack._notes.push(this._notes[thisIdx]);
                thisIdx++;
            }
            else {
                newTrack._notes.push(track._notes[trackIdx]);
                trackIdx++;
            }
        }

        return newTrack;
    }

    *notesFrom(globalTime: number): Generator<Note> {
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

export class Note {
    private static _lastId: number = 0;
    readonly id: number = 0;
    readonly start: number;
    readonly noteNumber: number;
    readonly velocity: number;

    private _end: number | null = null;
    get end(): number | null { return this._end; }
    set end(value: number) {
        this._end = value;
        this._width = value - this.start;
    }

    private _width: number | null = null;
    get width(): number | null { return this._width; }

    constructor(start: number, noteNumber: number, velocity: number) {
        this.id = ++Note._lastId;
        this.start = start;
        this.velocity = velocity;
        this.noteNumber = noteNumber;
    }
}