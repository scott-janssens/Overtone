import { Injectable } from "@angular/core";
import { AnyMetaEvent, MidiFile, NoteOffEvent, SetTempoEvent, TimeSignatureEvent, TrackNameEvent, read } from "midifile-ts";
import { MidiEvent, MidiTrack } from "./MidiTrack";
import { Subject } from "rxjs";
import { ProgramChange } from "./ProgramChanges";

// https://github.com/ryohey/midifile-ts
// https://www.music.mcgill.ca/~ich/classes/mumt306/midiformat.pdf

@Injectable({
    providedIn: "root"
})
export class MidiService {
    private _trackColors: string[] = [
        "green",
        "blue",
        "yellow",
        "orange",
        "red"
    ];

    private _midiFile: MidiFile | undefined;
    get midiFile(): MidiFile | undefined { return this._midiFile; }
    midiFileLoaded: Subject<MidiService> = new Subject<MidiService>();

    private _title: string = "";
    get title() { return this._title; }

    private _tracks: MidiTrack[] = [];
    get tracks(): MidiTrack[] { return this._tracks; }
    tracksChange: Subject<MidiService> = new Subject<MidiService>();

    private _showHeatMap: boolean = false;
    get showHeatMap(): boolean { return this._showHeatMap; }
    set showHeatMap(value: boolean) {
        if (this._showHeatMap != value) {
            this._showHeatMap = value;
            this.showHeatMapChange.next(value);
        }
    }
    showHeatMapChange: Subject<boolean> = new Subject<boolean>();

    private _heatMapThreshold: number = 10;
    get heatMapThreshold(): number { return this._heatMapThreshold; }
    set heatMapThreshold(value: number) {
        if (this._heatMapThreshold != value) {
            this._heatMapThreshold = value;
            this.heatMapThresholdChange.next(value);
        }
    }
    heatMapThresholdChange: Subject<number> = new Subject<number>();

    private _zoom: number = 1;
    get zoom(): number { return this._zoom; }
    set zoom(value: number) {
        value = Number(value);
        if (value < 1) {
            value = 1;
        }
        else if (value > 4) {
            value = 4;
        }

        if (this._zoom != value) {
            this._zoom = value;
            this.zoomChange.next(value);
        }
    }
    zoomChange: Subject<number> = new Subject<number>();

    private _midiMetadata: MidiMetadata[] = [];
    private _lastNoteOffEvent: MidiEvent | null = null;

    constructor() {
    }

    private reset(): void {
        this._tracks = [];
        this._title = "";
        this._midiMetadata = [];
        this._lastNoteOffEvent = null;
    }

    getTempo(bar: number): number {
        return this.getMetdataNode(bar).bpm;
    }

    getTimeSignatureNumerator(bar: number): number {
        return this.getMetdataNode(bar).timeSigNumerator;
    }

    getTimeSignatureDenominator(bar: number): number {
        return this.getMetdataNode(bar).timeSigDenominator;
    }

    getTotalBeats(): number {
        if (this._lastNoteOffEvent === null) {
            for (let track of this._tracks) {
                for (let i = track.events.length - 1; i >= 0; i--) {
                    let midiEvent = track.events[i];
                    if (midiEvent.event as NoteOffEvent !== null &&
                        (this._lastNoteOffEvent == null || midiEvent.globalTime >= this._lastNoteOffEvent.globalTime)) {
                        this._lastNoteOffEvent = midiEvent;
                        break;
                    }
                }
            }
        }

        const beats = this._lastNoteOffEvent!.globalTime / this._midiFile!.header.ticksPerBeat;

        return beats;
    }

    private getMetdataNode(bar: number): MidiMetadata {
        let i = 0;

        if (this._midiMetadata.length > 1) {
            for (; i + 1 < this._midiMetadata.length; i++) {
                if (bar < this._midiMetadata[i + 1].barNumber) {
                    break;
                }
            }
        }

        return this._midiMetadata[i];
    }

    async loadMidiFileAsync(file: File): Promise<void> {
        this.reset();
        const reader = new FileReader();
        reader.onload = e => {
            // TODO: Don't assume file read in one go.

            if (e.target != null) {
                this._midiFile = read(e.target.result as ArrayBuffer);

                if (this._midiFile.header.trackCount > 0) {
                    this.getMetaData(this._midiFile);

                    for (let i = 1; i < this._midiFile.tracks.length; i++) {
                        let track = new MidiTrack(this._midiFile.tracks[i]);
                        track.color = this._trackColors[i % this._trackColors.length];
                        this._tracks.push(track);
                    }
                }

                this.midiFileLoaded.next(this);
            }
        };

        reader.readAsArrayBuffer(file);

        while (this._midiFile === null) {
            await new Promise((r) => setTimeout(r, 100));
        }
    }

    private getMetaData(midi: MidiFile): void {
        let metadata: MidiMetadata = new MidiMetadata(1);

        for (let event of midi.tracks[0]) {
            if (event.deltaTime > 0) {
                this._midiMetadata.push(metadata);
                const beats = event.deltaTime / midi.header.ticksPerBeat;
                const bars = beats / metadata.timeSigNumerator * metadata.timeSigDenominator / 4;
                metadata = new MidiMetadata(metadata.barNumber + bars, metadata);
            }

            if (event.type == "meta") {
                let meta = event as AnyMetaEvent;
                switch (meta.subtype) {
                    case "trackName":
                        this._title = (meta as TrackNameEvent).text;
                        break;
                    case "setTempo":
                        metadata.tempo = (meta as SetTempoEvent).microsecondsPerBeat;
                        metadata.bpm = Math.round(60000000 / metadata.tempo);
                        break;
                    case "timeSignature":
                        let sig = meta as TimeSignatureEvent;
                        metadata.timeSigNumerator = sig.numerator
                        metadata.timeSigDenominator = sig.denominator;
                        break;
                }
            }
        }

        this._midiMetadata.push(metadata);
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
        let programmed = this.tracks.filter(x => x.program?.instrument !== "");
        this.mergeByKey(programmed, t => t.program!.instrument);
        this.tracksChange.next(this);
    }

    mergeTrackTypes(): void {
        let programmed = this.tracks.filter(x => x.program != null);
        this.mergeByKey(programmed, t => t.program!.type);
        let c = 0;
        this.tracks.forEach((track: MidiTrack, index: number) => {
            if (track.program != null) {
                track.name = track.program.type;
                track.program = new ProgramChange(-1, "", track.program.type);
            }
            track.color = this._trackColors[c++ % this._trackColors.length];
        });
        this.tracksChange.next(this);
    }

    mergeAll(): void {
        this.mergeByKey(this.tracks, t => "merge");
        let track = this.tracks[0];

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
                let merged = this.mergeTrackArray(value);
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

class MidiMetadata {
    barNumber: number;
    deltaTime: number = 0;
    timeSigNumerator: number = 4;
    timeSigDenominator: number = 4;
    tempo: number = 0;
    bpm: number = 120;

    constructor(barNumber: number, prev: MidiMetadata | null = null) {
        this.barNumber = barNumber;

        if (prev != null) {
            this.timeSigNumerator = prev.timeSigNumerator;
            this.timeSigDenominator = prev.timeSigDenominator;
            this.tempo = prev.tempo;
        }
    }
}