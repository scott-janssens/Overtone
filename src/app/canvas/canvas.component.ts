import { Component, OnInit } from "@angular/core";
import { CommonModule } from '@angular/common';
import { OvertoneSequence } from "../../overtone/OvertoneSequence";
import { Pitch } from "../../overtone/Pitch";
import { MidiService } from "../services/midi/midi.service";
import { MidiTrack } from "../services/midi/MidiTrack";
import Color from "color";

const trackDrawHeight: number = 9;
let quarterNoteWidth: number = trackDrawHeight * 4;
let beatPos: number = 0;

@Component({
    selector: "ot-canvas",
    templateUrl: "./canvas.component.html",
    styleUrl: "./canvas.component.css",
    imports: [CommonModule],
    standalone: true
})

export class CanvasComponent implements OnInit {
    private _pitchesContainer: HTMLDivElement | undefined;
    private _container: HTMLDivElement | undefined;
    private _canvas: HTMLCanvasElement | undefined;
    private _canvasCtx: CanvasRenderingContext2D | undefined;
    private _pitches: HTMLCanvasElement | undefined;
    private _pitchesCtx: CanvasRenderingContext2D | undefined;
    private _bars: HTMLCanvasElement | undefined;
    private _barsCtx: CanvasRenderingContext2D | undefined;
    private _trackDrawWidth: number = 1200;
    private readonly _trackDrawHeight = trackDrawHeight;
    private _whiteKey: string = "#04242e";
    private _blackKey: string = "#000000";
    private readonly _trackCount = 96;

    private _lastVirtualWidth: number = 0;
    private _lastVirtualHeight: number = 0;
    private get zoom(): number { return this._midiService.zoom; }
    private set zoom(value: number) { this._midiService.zoom = value; }
    private _lastWheelEvent: WheelEvent | null = null;
    private _lastMouseX: number = -1;
    private _lastMouseY: number = -1;

    constructor(protected _midiService: MidiService) {
        _midiService.zoomChange.subscribe(v => this.performZoom(v));
    }

    windowWheelHandler(e: Event): void {
        if ((e?.target as HTMLCanvasElement)?.id == "canvas") {
            e.preventDefault();
        }
    }

    ngOnInit(): void {
        window.addEventListener("wheel", this.windowWheelHandler, { passive: false })

        this._pitchesContainer = document.getElementById("pitches-container") as HTMLDivElement;
        this._container = document.getElementById("canvas-container") as HTMLDivElement;
        this._canvas = document.getElementById('canvas') as HTMLCanvasElement;

        if (this._canvas === null) {
            throw new Error("no id 'canvas' found.");
        }

        this._canvas.height = this._trackDrawHeight * this._trackCount;
        this._canvasCtx = this._canvas.getContext("2d")!;

        this._pitches = (document.getElementById("pitches") as HTMLCanvasElement);
        this._pitches.height = this._canvas.height;
        this._pitches.width = 2 * this._trackDrawHeight;
        this._pitchesCtx = this._pitches.getContext("2d")!;

        this._bars = (document.getElementById("bars") as HTMLCanvasElement);
        this._bars.height = 2 * this._trackDrawHeight;
        this._barsCtx = this._bars.getContext("2d")!;

        this._midiService.midiFileLoaded.subscribe(e => this.onFileLoaded(e, this));
        this._midiService.showHeatMapChange.subscribe(e => this.redraw());
        this._midiService.heatMapThresholdChange.subscribe(e => this.redraw());
        this._midiService.tracksChange.subscribe(e => { this.trackManagement(); this.redraw() });
    }

    public onFileLoaded(midiService: MidiService, comp: CanvasComponent): void {
        comp.trackManagement();

        beatPos = quarterNoteWidth / midiService.midiFile!.header.ticksPerBeat;
        this._trackDrawWidth = comp._canvas!.width = this._bars!.width = midiService.getTotalBeats() * quarterNoteWidth;

        comp.redraw();
    }

    private _trackSubscriptions: MidiTrack[] = [];

    private trackManagement() {
        let newSubs: MidiTrack[] = [];

        for (let i = 0; i < this._midiService.tracks.length; i++) {
            let track = this._midiService.tracks[i];
            newSubs.push(track);
            let subIdx = this._trackSubscriptions.indexOf(track);

            if (subIdx === -1) {
                track.trackVisibilityChange.subscribe(e => this.redraw());
                track.colorChange.subscribe(e => this.redraw());
            }
            else {
                this._trackSubscriptions.splice(subIdx, 1);
            }
        }

        for (let track of this._trackSubscriptions) {
            track.trackVisibilityChange.unsubscribe();
            track.colorChange.unsubscribe();
        }

        this._trackSubscriptions = newSubs;
    }

    onWheelScroll(event: WheelEvent) {
        this._lastWheelEvent = event;
        this.zoom += 0.00025 * event.deltaY;
        this._lastWheelEvent = null;
    }
    
    onCanvasScroll(event: Event): void {
        this._pitchesContainer!.style.transform = "translate(0px," + -(<HTMLDivElement>event.target).scrollTop + "px)";
    }

    mouseDown(event: PointerEvent) {
        this._lastMouseX = event.clientX;
        this._lastMouseY = event.clientY;
        this._canvas!.setPointerCapture(event.pointerId);
        this._canvas!.onpointermove = e => this.mouseMove(e, this);
        this._canvas!.style.cursor = "grabbing";
    }

    mouseUp(event: PointerEvent) {
        this._canvas!.releasePointerCapture(event.pointerId);
        this._canvas!.onpointermove = null;
        this._canvas!.style.cursor = "grab";
    }

    mouseMove(event: PointerEvent, comp: CanvasComponent) {
        comp._container!.scrollLeft -= event.clientX - comp._lastMouseX;
        comp._container!.scrollTop -= event.clientY - comp._lastMouseY;

        comp._lastMouseX = event.clientX;
        comp._lastMouseY = event.clientY;
    }

    private validateTranslation(): void {
        if (this._container!.scrollLeft > 0) {
            this._container!.scrollLeft = 0;
        }
        else {
            const minX = this._canvas!.width - this._canvas!.width * this.zoom;
            if (this._container!.scrollLeft < minX) {
                this._container!.scrollLeft = minX;
            }
        }

        if (this._container!.scrollTop > 0) {
            this._container!.scrollTop = 0;
        }
        else {
            const minY = this._canvas!.height - this._canvas!.height * this.zoom;
            if (this._container!.scrollTop < minY) {
                this._container!.scrollTop = minY;
            }
        }
        this.drawBarTrack();
        this.drawPitchTrack();
    }

    private performZoom(newZoom: number): void {
        let x: number;
        let y: number;

        if (this._lastWheelEvent != null) {
            x = this._lastWheelEvent.clientX;
            y = this._lastWheelEvent.clientY;
        }
        else {
            x = this._container!.clientWidth / 2;
            y = this._container!.clientHeight / 2
        }

        if (this._lastVirtualWidth === 0) {
            this._lastVirtualWidth = this._canvas!.offsetWidth;
            this._lastVirtualHeight = this._canvas!.offsetHeight;
        }

        const pctX = (x + this._container!.scrollLeft) / this._lastVirtualWidth;
        const newVirtualWidth = this._canvas!.offsetWidth * this.zoom;
        this._container!.scrollLeft = newVirtualWidth * pctX - x;
        this._lastVirtualWidth = newVirtualWidth;

        const pctY = (y + this._container!.scrollTop) / this._lastVirtualHeight;
        const newVirtualHeight = this._canvas!.offsetHeight * this.zoom;
        this._container!.scrollTop = newVirtualHeight * pctY - y;
        this._lastVirtualHeight = newVirtualHeight;

        this._canvas!.style.transform = "scale(" + this.zoom + ")";
        this._container?.offsetHeight; // cause container div to redraw so vertical scrollbar refreshes

        this.drawBarTrack();
        this.drawPitchTrack();
    }

    private redraw(): void {
        this.drawBackground();
        this.drawBars();
        this.drawBarTrack();
        this.drawPitchTrack();

        for (let i = 0; i < this._midiService.tracks.length; i++) {
            this.drawMidiTrack(this._midiService.tracks[i]);
        }
    }

    private drawMidiTrack(track: MidiTrack): void {
        if (this._canvasCtx == null) { throw new Error("Canvas context not set."); }

        if (track.isTrackVisible) {
            let notes: { [Key: number]: Note | null } = {};

            this._canvasCtx.fillStyle = track.color;

            for (let event of track.events) {
                if (event.event.type == "channel") {
                    switch (event.event.subtype) {
                        case "noteOn":
                            if (notes[event.event.noteNumber] == null) {
                                notes[event.event.noteNumber] = new Note(event.globalTime, event.event.noteNumber, event.event.velocity);
                            }
                            break;
                        case "noteOff":
                            let note = notes[event.event.noteNumber];
                            if (note != null) {
                                let width = (event.globalTime - note.start) * beatPos;
                                this._canvasCtx.fillRect(note.x + 1, note.y, width, this._trackDrawHeight - 2);
                                notes[event.event.noteNumber] = null;
                                this.drawOvertones(event.event.noteNumber, note.x + 1, width, track.color);
                            }
                            break;
                        case "controller":
                            break;
                    }
                }
            }
        }
    }

    private drawOvertones(midiNote: number, x: number, width: number, color: string): void {
        if (this._canvasCtx == null) { throw new Error("Canvas context not set."); }

        const sequence = new OvertoneSequence(Pitch.fromMidi(midiNote).frequency, 4068);
        const halfHeight = this._trackDrawHeight / 2;

        this._canvasCtx.lineWidth = 1;
        let drawColor: Color;
        let greenColor: Color;
        let redColor: Color;

        if (this._midiService.showHeatMap) {
            greenColor = Color("lime");
            redColor = Color("red");
        }
        else {
            drawColor = Color(color);
        }

        for (let i = 1; i < Math.min(15, sequence.length); i++) {
            let overtone = sequence[i];

            if (this._midiService.showHeatMap) {
                greenColor = greenColor!.darken(0.1);
                redColor = redColor!.darken(0.15);
                this._canvasCtx.strokeStyle = this._midiService.heatMapThreshold > Math.abs(overtone.cents) ? greenColor.hex() : redColor.hex();
            }
            else {
                drawColor = drawColor!.darken(0.15);
                this._canvasCtx.strokeStyle = drawColor.hex();
            }

            let y = -(overtone.closestPitch.midi - 107) * this._trackDrawHeight + halfHeight - this._trackDrawHeight * overtone.cents / 100;
            this._canvasCtx.beginPath();
            this._canvasCtx.moveTo(x, y);
            this._canvasCtx.lineTo(x + width, y);
            this._canvasCtx.stroke();
        }
    }

    private drawBars(): void {
        if (this._canvasCtx == null) { throw new Error("Canvas context not set."); }

        this._canvasCtx.strokeStyle = "black";
        this._canvasCtx.lineWidth = 1;

        let bar = 1;

        for (let i = quarterNoteWidth * this._midiService.getTimeSignatureNumerator(1) * 4 / this._midiService.getTimeSignatureDenominator(1);
             i < this._trackDrawWidth;
             bar++, i += quarterNoteWidth * this._midiService.getTimeSignatureNumerator(bar) * 4 / this._midiService.getTimeSignatureDenominator(bar)) {
            this._canvasCtx.beginPath();
            this._canvasCtx.moveTo(i, 0);
            this._canvasCtx.lineTo(i, this._trackDrawHeight * this._trackCount);
            this._canvasCtx.stroke();
        }
    }

    private drawBackground(): void {
        if (this._canvasCtx == null) { throw new Error("Canvas context not set."); }

        this._canvasCtx.strokeStyle = this._blackKey;

        for (let i = 0; i < this._trackCount; i += 12) {
            this._canvasCtx.fillRect(0, i * this._trackDrawHeight, this._trackDrawWidth, this._trackDrawHeight);
            this._canvasCtx.beginPath();
            this._canvasCtx.moveTo(0, i * this._trackDrawHeight);
            this._canvasCtx.lineTo(this._trackDrawWidth, i * this._trackDrawHeight);
            this._canvasCtx.stroke();
            this._canvasCtx.fillStyle = this._whiteKey;
            this._canvasCtx.fillRect(0, i * this._trackDrawHeight, this._trackDrawWidth, this._trackDrawHeight);
            this._canvasCtx.fillStyle = this._blackKey;
            this._canvasCtx.fillRect(0, (i + 1) * this._trackDrawHeight, this._trackDrawWidth, this._trackDrawHeight);
            this._canvasCtx.fillStyle = this._whiteKey;
            this._canvasCtx.fillRect(0, (i + 2) * this._trackDrawHeight, this._trackDrawWidth, this._trackDrawHeight);
            this._canvasCtx.fillStyle = this._blackKey;
            this._canvasCtx.fillRect(0, (i + 3) * this._trackDrawHeight, this._trackDrawWidth, this._trackDrawHeight);
            this._canvasCtx.fillStyle = this._whiteKey;
            this._canvasCtx.fillRect(0, (i + 4) * this._trackDrawHeight, this._trackDrawWidth, this._trackDrawHeight);
            this._canvasCtx.fillStyle = this._blackKey;
            this._canvasCtx.fillRect(0, (i + 5) * this._trackDrawHeight, this._trackDrawWidth, this._trackDrawHeight);
            this._canvasCtx.fillStyle = this._whiteKey;
            this._canvasCtx.fillRect(0, (i + 6) * this._trackDrawHeight, this._trackDrawWidth, this._trackDrawHeight);
            this._canvasCtx.beginPath();
            this._canvasCtx.moveTo(0, (i + 7) * this._trackDrawHeight);
            this._canvasCtx.lineTo(this._trackDrawWidth, (i + 7) * this._trackDrawHeight);
            this._canvasCtx.stroke();
            this._canvasCtx.fillStyle = this._whiteKey;
            this._canvasCtx.fillRect(0, (i + 7) * this._trackDrawHeight, this._trackDrawWidth, this._trackDrawHeight);
            this._canvasCtx.fillStyle = this._blackKey;
            this._canvasCtx.fillRect(0, (i + 8) * this._trackDrawHeight, this._trackDrawWidth, this._trackDrawHeight);
            this._canvasCtx.fillStyle = this._whiteKey;
            this._canvasCtx.fillRect(0, (i + 9) * this._trackDrawHeight, this._trackDrawWidth, this._trackDrawHeight);
            this._canvasCtx.fillStyle = this._blackKey;
            this._canvasCtx.fillRect(0, (i + 10) * this._trackDrawHeight, this._trackDrawWidth, this._trackDrawHeight);
            this._canvasCtx.fillStyle = this._whiteKey;
            this._canvasCtx.fillRect(0, (i + 11) * this._trackDrawHeight, this._trackDrawWidth, this._trackDrawHeight);
        }
    }

    private drawBarTrack(): void {
        if (this._barsCtx == null) { throw new Error("bars context not set."); }

        this._bars!.width = this._canvas!.width * this.zoom;
        const font = this._trackDrawHeight * 1.5;

        this._barsCtx.fillStyle = "gray";
        this._barsCtx.fillRect(0, 0, this._bars!.width, 2 * this._trackDrawHeight);

        this._barsCtx.strokeStyle = this._blackKey;;
        this._barsCtx.lineWidth = 1;
        this._barsCtx.font = font + "px Arial sans-serif";
        this._barsCtx.fillStyle = this._blackKey;
        this._barsCtx.textAlign = "center";

        let bar = 1;
        let width = quarterNoteWidth * this._midiService.getTimeSignatureNumerator(1) * 4 / this._midiService.getTimeSignatureDenominator(1) * this.zoom;
        let i = 0;

        for (; i < this._bars!.width; i += width) {
            this._barsCtx.beginPath();
            this._barsCtx.moveTo(i, 0);
            this._barsCtx.lineTo(i, 2 * this._trackDrawHeight);
            this._barsCtx.stroke();
            width = quarterNoteWidth * this._midiService.getTimeSignatureNumerator(bar) * 4 / this._midiService.getTimeSignatureDenominator(bar) * this.zoom;
            this._barsCtx.fillText(String(bar++), i + width / 2, font, width);
        }
    }

    private drawPitchTrack(): void {
        if (this._pitchesCtx == null) { throw new Error("Pitches context not set."); }

        this._pitches!.height = this._canvas!.height * this.zoom;

        const octaveHeight = 12 * this._trackDrawHeight * this.zoom;
        this._pitchesCtx.fillStyle = "gray"; //this._whiteKey;
        this._pitchesCtx.fillRect(0, 0, 2 * this._trackDrawHeight, this._pitches!.height);
        this._pitchesCtx.strokeStyle = this._blackKey;

        for (let i = 0; i < 10; i++) {
            this._pitchesCtx.beginPath();
            this._pitchesCtx.moveTo(0, this._pitches!.height - i * octaveHeight);
            this._pitchesCtx.lineTo(2 * this._trackDrawHeight, this._pitches!.height - i * octaveHeight);
            this._pitchesCtx.stroke();
        }

        const font = this._trackDrawHeight * 1.5;
        this._pitchesCtx.font = font + "px Arial sans-serif";
        this._pitchesCtx.fillStyle = this._blackKey; //"white";
        this._pitchesCtx.textAlign = "center";

        for (let i = 0; i < 10; i++) {
            this._pitchesCtx.save();
            let text = String(i);
            this._pitchesCtx.translate(font, this._pitches!.height - octaveHeight * i - octaveHeight / 2);
            this._pitchesCtx.rotate(-Math.PI / 2);
            this._pitchesCtx.fillText(text, 0, 0, octaveHeight);
            this._pitchesCtx.restore();
        }

        this._pitchesCtx.fillStyle = "gold";
        const zoomedTrackHeight = this._trackDrawHeight * this.zoom;
        this._pitchesCtx.fillRect(0, 38 * zoomedTrackHeight, this._trackDrawHeight, zoomedTrackHeight);
    }
}

class Note {
    public start: number;
    public noteNumber: number;
    public velocity: number;
    public x: number;
    public y: number;

    constructor(start: number, noteNumber: number, velocity: number) {
        this.start = start;
        this.velocity = velocity;
        this.noteNumber = noteNumber;
        this.x = beatPos * start;
        this.y = (107 - noteNumber) * trackDrawHeight;
    }
}
