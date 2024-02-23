import { Injectable } from "@angular/core";
import { AnyMetaEvent, MidiFile, read } from "midifile-ts";
import { MidiTrack } from "./MidiTrack";
import { Subject } from "rxjs";
import { ProgramChange } from "./ProgramChanges";

// https://github.com/ryohey/midifile-ts
// https://www.music.mcgill.ca/~ich/classes/mumt306/midiformat.pdf

@Injectable({
    providedIn: "root"
})
export class MidiService {
    private _midiMetadata: MidiMetaDataItem[] = [];
    private _trackColors: string[] = [
        "#ffff00",
        "#ff00ff",
        "#00ffff",
        "#ff7f7f",
        "#7fff7f",
        "#7f7fff",
        "#ff7f00",
        "#ff007f",
        "#3fff00",
        "#007fff",
        "#7f00ff",
        "#7f7f7f"
    ];

    private _midiFile: MidiFile | undefined;
    get midiFile(): MidiFile | undefined { return this._midiFile; }
    get isMidiLoaded(): boolean { return this.midiFile != undefined; }
    midiFileLoaded: Subject<MidiService | null> = new Subject<MidiService | null>();

    private _title: string = "";
    get title() { return this._title; }

    private _tracks: MidiTrack[] = [];
    get tracks(): MidiTrack[] { return this._tracks; }
    tracksChange: Subject<MidiService> = new Subject<MidiService>();

    private _totalBeats: number = 0;
    get totalBeats(): number { return this._totalBeats; }

    private _overtoneDisplay: OvertoneDisplay = OvertoneDisplay.Frequency;
    get overtoneDisplay(): OvertoneDisplay { return this._overtoneDisplay; }
    set overtoneDisplay(value: OvertoneDisplay) {
        if (this._overtoneDisplay != value) {
            this._overtoneDisplay = value;
            this.overtoneDisplayChange.next(value);
        }
    }
    overtoneDisplayChange: Subject<OvertoneDisplay> = new Subject<OvertoneDisplay>();

    private _noteDisplay: NoteDisplay = NoteDisplay.Filled;
    get noteDisplay(): NoteDisplay { return this._noteDisplay }
    set noteDisplay(value: NoteDisplay) {
        if (this._noteDisplay != value) {
            this._noteDisplay = value;
            this.noteDisplayChange.next(value);
        }
    }
    noteDisplayChange: Subject<NoteDisplay> = new Subject<NoteDisplay>();

    private _drawBackground: boolean = true;
    get drawBackground(): boolean { return this._drawBackground }
    set drawBackground(value: boolean) {
        if (this._drawBackground != value) {
            this._drawBackground = value;
            this.drawBackgroundChange.next(value);
        }
    }
    drawBackgroundChange: Subject<boolean> = new Subject<boolean>();

    private _drawMonochrome: boolean = false;
    get drawMonochrome(): boolean { return this._drawMonochrome }
    set drawMonochrome(value: boolean) {
        if (this._drawMonochrome != value) {
            this._drawMonochrome = value;
            this.drawBackgroundChange.next(value);
        }
    }
    drawMonochromeChange: Subject<boolean> = new Subject<boolean>();

    private _centsThreshold: number = 10;
    get centsThreshold(): number { return this._centsThreshold; }
    set centsThreshold(value: number) {
        if (this._centsThreshold != value) {
            this._centsThreshold = value;
            this.centsThresholdChange.next(value);
        }
    }
    centsThresholdChange: Subject<number> = new Subject<number>();

    private _zoomLevel: number = 1;
    get zoomLevel(): number { return this._zoomLevel; }
    set zoomLevel(value: number) {
        const oldZoom = this._zoomLevel;
        value = Math.round(Number(value) * 1000) / 1000;
        if (value < 1) {
            value = 1;
        }
        else if (value > 4) {
            value = 4;
        }

        if (this._zoomLevel != value) {
            this._zoomLevel = value;
            this.zoomLevelChange.next([oldZoom, value]);
        }
    }
    zoomLevelChange: Subject<[oldZoom: number, newZoom: number]> = new Subject<[number, number]>();

    private reset(): void {
        this._midiFile = undefined;
        this._tracks = [];
        this._title = "";
        this._midiMetadata = [];
        this._totalBeats = 0;
    }

    get barCount(): number { return this._midiMetadata.length; }

    getMetaDataItem(bar: number): MidiMetaDataItem {
        return this._midiMetadata[bar - 1];
    }

    getBarFromBeat(beatNum: number): number {
        let beats = 0;

        for (let i = 0; i + 1 < this._midiMetadata.length; i++) {
            const meta = this._midiMetadata[i];
            const beatUnit = meta.timeSigDenominator / 4;
            beats += meta.timeSigNumerator / beatUnit;
            if (beats > beatNum) {
                return i + 1;
            }
        }

        return -1;
    }

    loadMidiFile(file: File): void {
        this.reset();
        const reader = new FileReader();
        reader.onload = e => {
            // TODO: Don't assume file read in one go.

            if (e.target != null) {
                this._midiFile = read(e.target.result as ArrayBuffer);

                if (this._midiFile.header.trackCount > 0) {
                    for (let i = 1; i < this._midiFile.tracks.length; i++) {
                        const track = new MidiTrack(this._midiFile.tracks[i]);
                        track.color = this._trackColors[i % this._trackColors.length];
                        this._tracks.push(track);
                    }

                    this.getMetaData(this._midiFile);
                }

                const item = this._midiMetadata[this._midiMetadata.length - 1];
                this._totalBeats = item.globalBeat + item.timeSigNumerator - 1;

                this.midiFileLoaded.next(this);
            }
        };

        reader.readAsArrayBuffer(file);
    }

    abortLoad(): void {
        this.reset();
        this.midiFileLoaded.next(null);
    }

    private getMetaData(midi: MidiFile): void {
        let metadata: MidiMetaDataItem = new MidiMetaDataItem(1, 0, 1);
        let beatPartial = 0;
        let bars = 1;
        let barTime = 0;
        let globalBeat = 0;

        for (const event of midi.tracks[0]) {
            if (event.type === "meta") {
                if (event.subtype === "trackName") {
                    this._title = event.text;
                }
                else if (event.deltaTime > 0) {
                    const beats = beatPartial + event.deltaTime / midi.header.ticksPerBeat;
                    const beatUnit = metadata.timeSigDenominator / 4;

                    if (beats * beatUnit < metadata.timeSigNumerator) {
                        metadata.applyEvent(event);
                        beatPartial = beats;
                        continue;
                    }

                    const fullBars = Math.floor(beats / metadata.timeSigNumerator * beatUnit);
                    bars = metadata.barNumber + fullBars;
                    beatPartial = beats - fullBars * metadata.timeSigNumerator / beatUnit;

                    let globalTime = metadata.globalTime;
                    globalBeat = metadata.globalBeat;
                    barTime = midi.header.ticksPerBeat * metadata.timeSigNumerator;

                    this._midiMetadata.push(metadata);
                    for (let i = metadata.barNumber + 1; i < bars; i++) {
                        globalTime += barTime;
                        globalBeat += metadata.timeSigNumerator / beatUnit;
                        this._midiMetadata.push(new MidiMetaDataItem(i, globalTime, globalBeat, metadata));
                    }

                    metadata = new MidiMetaDataItem(bars, globalTime + barTime, globalBeat + metadata.timeSigNumerator / beatUnit, metadata);
                }

                metadata.applyEvent(event);
            }
        }

        let lastGlobal = 0;
        for (const track of this._tracks) {
            for (let i = track.events.length - 1; i >= 0; i--) {
                const midiEvent = track.events[i];
                if ((midiEvent.event.type === "meta" &&
                        midiEvent.event.subtype === "endOfTrack") ||
                    (midiEvent.event.type === "channel" &&
                        midiEvent.event.subtype === "noteOff")) {
                    lastGlobal = Math.max(lastGlobal, midiEvent.globalTime);
                    break;
                }
            }
        }

        const beatUnit = metadata.timeSigDenominator / 4;
        barTime = midi.header.ticksPerBeat * metadata.timeSigNumerator / beatUnit;
        while (metadata.globalTime < lastGlobal) {
            this._midiMetadata.push(metadata);
            globalBeat += metadata.timeSigNumerator / beatUnit;
            metadata = new MidiMetaDataItem(++bars, metadata.globalTime + barTime, metadata.globalBeat + metadata.timeSigNumerator / beatUnit, metadata);
        }

        if (metadata.globalTime - barTime > lastGlobal) {
            this._midiMetadata.push(metadata);
        }
    }

    mergeTracks(trackA: MidiTrack, trackB: MidiTrack): void {
        this.mergeTracksInternal(trackA, trackB);
        this.tracksChange.next(this);
    }

    private mergeTracksInternal(trackA: MidiTrack, trackB: MidiTrack): MidiTrack {
        const ai = this.tracks.indexOf(trackA);
        const bi = this.tracks.indexOf(trackB);
        const mergedTrack = trackA.Merge(trackB);
        this.tracks.splice(ai, 1, mergedTrack);
        this.tracks.splice(bi, 1);

        return mergedTrack;
    }

    mergeTrackInstrument(instrument: string): void {
        const iTracks = this.tracks.filter(x => x.program?.instrument === instrument);
        this.mergeTrackArray(iTracks);
        this.tracksChange.next(this);
    }

    mergeTrackArray(trackArray: MidiTrack[]): MidiTrack | null {
        let merged: MidiTrack | null = null;

        if (trackArray.length > 1) {
            merged = trackArray[0];

            for (let i = 1; i < trackArray.length; i++) {
                merged = this.mergeTracksInternal(merged, trackArray[i]);
            }
        }

        return merged;
    }

    mergeTrackInstruments(): void {
        const programmed = this.tracks.filter(x => x.program?.instrument !== "");
        this.mergeByKey(programmed, t => t.program!.instrument);
        this.tracksChange.next(this);
    }

    mergeTrackTypes(): void {
        const programmed = this.tracks.filter(x => x.program != null);
        this.mergeByKey(programmed, t => t.program!.type);
        let c = 0;
        this.tracks.forEach((track: MidiTrack) => {
            if (track.program != null) {
                track.name = track.program.type;
                track.program = new ProgramChange(-1, "", track.program.type);
            }
            track.color = this._trackColors[c++ % this._trackColors.length];
        });
        this.tracksChange.next(this);
    }

    mergeAll(): void {
        this.mergeByKey(this.tracks, (t: MidiTrack) => "merge");
        const track = this.tracks[0];

        if (track?.program != null) {
            track.name = "Merged";
            track.program = new ProgramChange(-1, "", "");
        }

        this.tracksChange.next(this);
    }

    private mergeByKey(trackArray: MidiTrack[], getKey: (t: MidiTrack) => string): void {
        const map = this.getTrackMap(trackArray, getKey);

        map.forEach((value: MidiTrack[], key: string) => {
            if (value.length > 1) {
                const merged = this.mergeTrackArray(value);
                merged!.name = key;
            }
        });
    }

    getTrackMap(trackArray: MidiTrack[], getKey: (t: MidiTrack) => string): Map<string, MidiTrack[]> {
        const map = new Map<string, MidiTrack[]>();
        trackArray.forEach(t => {
            const key = getKey(t);
            if (!map.has(key)) {
                map.set(key, [t]);
            }
            else {
                map.get(key)!.push(t);
            }
        });

        return map;
    }

    removeTrack(track: MidiTrack) {
        const i = this.tracks.indexOf(track);

        if (i >= 0) {
            this.tracks.splice(i, 1);
        }

        this.tracksChange.next(this);
    }
}

class MidiMetaDataItem {
    barNumber: number;
    globalTime: number;
    globalBeat: number;
    timeSigNumerator: number = 4;
    timeSigDenominator: number = 4;
    keySignature: KeySignature = KeySignature.C_MAJOR;

    constructor(barNumber: number, globaltime: number, globalBeat: number, prev: MidiMetaDataItem | null = null) {
        this.barNumber = barNumber;
        this.globalTime = globaltime;
        this.globalBeat = globalBeat;

        if (prev != null) {
            this.timeSigNumerator = prev.timeSigNumerator;
            this.timeSigDenominator = prev.timeSigDenominator;
        }
    }

    applyEvent(event: AnyMetaEvent): void {
        const meta = event as AnyMetaEvent;
        switch (meta.subtype) {
            case "keySignature":
                this.keySignature = new KeySignature(meta.key, meta.scale);
                break;
            case "timeSignature":
                this.timeSigNumerator = meta.numerator
                this.timeSigDenominator = meta.denominator;
                break;
            default:
                break;
        }
    }
}

export class KeySignature {
    readonly keyAccidentals: number = 0;
    readonly keyScale: number = 0;

    static C_MAJOR: KeySignature = new KeySignature(0, 0);

    constructor(keyAccidentals: number, keyScale: number) {
        this.keyAccidentals = keyAccidentals;
        this.keyScale = keyScale;
    }
}

export enum OvertoneDisplay {
    Frequency = 1,
    CentsOffset,
    Chord
}

export enum NoteDisplay {
    Filled = 1,
    Outline,
    Hidden
}