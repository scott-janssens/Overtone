import { Component, HostListener, OnChanges, OnInit, SimpleChanges } from "@angular/core";
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
    standalone: true
})

export class CanvasComponent implements OnInit {
    private _container: HTMLDivElement | undefined;
    private _canvas: HTMLCanvasElement | undefined;
    private _ctx: CanvasRenderingContext2D | undefined;
    private _trackDrawWidth: number = 1200;
    private readonly _trackDrawHeight = trackDrawHeight;
    private _whiteKey: string = "#04242e";
    private _blackKey: string = "#000000";
    private readonly _trackCount = 96;

    // private _lastMouseX: number = -1;
    // private _lastMouseY: number = -1;
    private _translateX: number = 0;
    private _translateY: number = 0;

    private _lastVirtualWidth: number = 0;
    private _lastVirtualHeight: number = 0;
    private get zoom(): number { return this._midiService.zoom; }
    private set zoom(value: number) { this._midiService.zoom = value; }
    private _lastWheelEvent: WheelEvent | null = null;

    constructor(private _midiService: MidiService) {
        _midiService.zoomChange.subscribe(v => this.performZoom(v));
    }

    ngOnInit(): void {
        this._container = document.getElementsByClassName("canvas-container")[0] as HTMLDivElement;
        this._canvas = document.getElementById('canvas') as HTMLCanvasElement;

        if (this._canvas === null) {
            throw new Error("no id 'canvas' found.");
        }

        this._canvas.height = 864;
        this._ctx = this._canvas.getContext("2d")!;
        this._midiService.midiFileLoaded.subscribe(e => this.onFileLoaded(e, this));
        this._midiService.showHeatMapChange.subscribe(e => this.redraw());
        this._midiService.heatMapThresholdChange.subscribe(e => this.redraw());
    }

    public onFileLoaded(midiService: MidiService, comp: CanvasComponent): void {
        for (let i = 1; i < midiService.tracks.length; i++) {
            midiService.tracks[i].trackVisibilityChange.subscribe(e => this.redraw());
            midiService.tracks[i].colorChange.subscribe(e => this.redraw());
        }

        beatPos = quarterNoteWidth / midiService.midiFile!.header.ticksPerBeat;
        this._trackDrawWidth = comp._canvas!.width = midiService.getTotalBeats() * quarterNoteWidth;

        comp.redraw();
    }

    onWheelScroll(event: WheelEvent) {
        this._lastWheelEvent = event;
        this.zoom = this.zoom + 0.00025 * event.deltaY;
        this._lastWheelEvent = null;
    }

    // mouseDown(event: PointerEvent) {
    //     this._lastMouseX = event.clientX;
    //     this._lastMouseY = event.clientY;
    //     this._canvas!.setPointerCapture(event.pointerId);
    //     this._canvas!.onpointermove = e => this.mouseMove(e, this);
    //     this._canvas!.style.cursor = "grabbing";
    // }

    // mouseUp(event: PointerEvent) {
    //     this._canvas!.releasePointerCapture(event.pointerId);
    //     this._canvas!.onpointermove = null;
    //     this._canvas!.style.cursor = "grab";
    // }

    // mouseMove(event: PointerEvent, comp: CanvasComponent) {
    //     comp._translateX += event.clientX - comp._lastMouseX;
    //     comp._translateY += event.clientY - comp._lastMouseY;

    //     comp.validateTranslation();

    //     comp._lastMouseX = event.clientX;
    //     comp._lastMouseY = event.clientY;
    //     comp._canvas!.style.transform = "translate(" + comp._translateX + "px," + comp._translateY + "px) scale(" + comp.zoom + "," + comp.zoom + ")";
    // }

    private performZoom(newZoom: number): void {
        let x: number;
        let y: number;

        if (this._lastWheelEvent != null) {
            x = this._lastWheelEvent.clientX;
            y = this._lastWheelEvent.clientY;
        }
        else {
            x = this._canvas!.clientWidth / 2;
            y = this._canvas!.clientHeight / 2
        }

        const oldTransX = this._translateX;
        const pctX = (x - this._translateX) / this._lastVirtualWidth;
        const newVirtualWidth = this._canvas!.offsetWidth * this.zoom;
        this._translateX = x - newVirtualWidth * pctX;

        const pctY = (y - this._translateY) / this._lastVirtualHeight;
        const newVirtualHeight = this._canvas!.height * this.zoom;
        this._translateY = y - newVirtualHeight * pctY;

        this._lastVirtualWidth = newVirtualWidth;
        this._lastVirtualHeight = newVirtualHeight;

        this.validateTranslation();
        this._canvas!.style.transform = "translate(" + this._translateX + "px," + this._translateY + "px) scale(" + this.zoom + "," + this.zoom + ")";
    }

    private validateTranslation(): void {
        if (this._translateX > 0) {
            this._translateX = 0;
        }
        else {
            const minX = this._canvas!.width - this._canvas!.width * this.zoom;
            if (this._translateX < minX) {
                this._translateX = minX;
            }
        }

        if (this._translateY > 0) {
            this._translateY = 0;
        }
        else {
            const minY = this._canvas!.height - this._canvas!.height * this.zoom;
            if (this._translateY < minY) {
                this._translateY = minY;
            }
        }
    }

    private redraw(): void {
        this.drawBackground();
        this.drawBarLines();

        for (let i = 0; i < this._midiService.tracks.length; i++) {
            this.drawMidiTrack(this._midiService.tracks[i]);
        }
    }

    private drawMidiTrack(track: MidiTrack): void {
        if (this._ctx == null) { throw new Error("Canvas context not set."); }

        if (track.isTrackVisible) {
            let notes: { [Key: number]: Note | null } = {};

            this._ctx.fillStyle = track.color;

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
                                this._ctx.fillRect(note.x + 2 * this._trackDrawHeight + 1, note.y, width, this._trackDrawHeight - 2);
                                notes[event.event.noteNumber] = null;
                                this.drawOvertones(event.event.noteNumber, note.x + 2 * this._trackDrawHeight + 1, width, track.color);
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
        if (this._ctx == null) { throw new Error("Canvas context not set."); }

        const sequence = new OvertoneSequence(Pitch.fromMidi(midiNote).frequency, 4068);
        const halfHeight = this._trackDrawHeight / 2;

        this._ctx.lineWidth = 1;
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

        for (let i = 1; i < sequence.length; i++) {
            let overtone = sequence[i];

            if (this._midiService.showHeatMap) {
                greenColor = greenColor!.darken(0.1);
                redColor = redColor!.darken(0.15);
                this._ctx.strokeStyle = this._midiService.heatMapThreshold > Math.abs(overtone.cents) ? greenColor.hex() : redColor.hex();
            }
            else {
                drawColor = drawColor!.darken(0.15);
                this._ctx.strokeStyle = drawColor.hex();
            }

            let y = -(overtone.closestPitch.midi - 107) * this._trackDrawHeight + halfHeight - this._trackDrawHeight * overtone.cents / 100;
            this._ctx.beginPath();
            this._ctx.moveTo(x, y);
            this._ctx.lineTo(x + width, y);
            this._ctx.stroke();
        }
    }

    private drawBarLines(): void {
        if (this._ctx == null) { throw new Error("Canvas context not set."); }

        this._ctx.strokeStyle = "black";
        this._ctx.lineWidth = 1;
        let bar = 2;

        for (let i = 2 * this._trackDrawHeight + quarterNoteWidth * this._midiService.getTimeSignatureNumerator(1); i < this._trackDrawWidth; i += quarterNoteWidth * this._midiService.getTimeSignatureNumerator(bar++)) {
            this._ctx.beginPath();
            this._ctx.moveTo(i, 0);
            this._ctx.lineTo(i, this._trackDrawHeight * this._trackCount);
            this._ctx.stroke();
        }
    }

    private drawBackground(): void {
        if (this._ctx == null) { throw new Error("Canvas context not set."); }

        this._ctx.strokeStyle = this._blackKey;

        for (let i = 0; i < this._trackCount; i += 12) {
            this._ctx.fillRect(0, i * this._trackDrawHeight, this._trackDrawWidth, this._trackDrawHeight);
            this._ctx.beginPath();
            this._ctx.moveTo(0, i * this._trackDrawHeight);
            this._ctx.lineTo(this._trackDrawWidth, i * this._trackDrawHeight);
            this._ctx.stroke();
            this._ctx.fillStyle = this._whiteKey;
            this._ctx.fillRect(0, i * this._trackDrawHeight, this._trackDrawWidth, this._trackDrawHeight);
            this._ctx.fillStyle = this._blackKey;
            this._ctx.fillRect(0, (i + 1) * this._trackDrawHeight, this._trackDrawWidth, this._trackDrawHeight);
            this._ctx.fillStyle = this._whiteKey;
            this._ctx.fillRect(0, (i + 2) * this._trackDrawHeight, this._trackDrawWidth, this._trackDrawHeight);
            this._ctx.fillStyle = this._blackKey;
            this._ctx.fillRect(0, (i + 3) * this._trackDrawHeight, this._trackDrawWidth, this._trackDrawHeight);
            this._ctx.fillStyle = this._whiteKey;
            this._ctx.fillRect(0, (i + 4) * this._trackDrawHeight, this._trackDrawWidth, this._trackDrawHeight);
            this._ctx.fillStyle = this._blackKey;
            this._ctx.fillRect(0, (i + 5) * this._trackDrawHeight, this._trackDrawWidth, this._trackDrawHeight);
            this._ctx.fillStyle = this._whiteKey;
            this._ctx.fillRect(0, (i + 6) * this._trackDrawHeight, this._trackDrawWidth, this._trackDrawHeight);
            this._ctx.beginPath();
            this._ctx.moveTo(0, (i + 7) * this._trackDrawHeight);
            this._ctx.lineTo(this._trackDrawWidth, (i + 7) * this._trackDrawHeight);
            this._ctx.stroke();
            this._ctx.fillStyle = this._whiteKey;
            this._ctx.fillRect(0, (i + 7) * this._trackDrawHeight, this._trackDrawWidth, this._trackDrawHeight);
            this._ctx.fillStyle = this._blackKey;
            this._ctx.fillRect(0, (i + 8) * this._trackDrawHeight, this._trackDrawWidth, this._trackDrawHeight);
            this._ctx.fillStyle = this._whiteKey;
            this._ctx.fillRect(0, (i + 9) * this._trackDrawHeight, this._trackDrawWidth, this._trackDrawHeight);
            this._ctx.fillStyle = this._blackKey;
            this._ctx.fillRect(0, (i + 10) * this._trackDrawHeight, this._trackDrawWidth, this._trackDrawHeight);
            this._ctx.fillStyle = this._whiteKey;
            this._ctx.fillRect(0, (i + 11) * this._trackDrawHeight, this._trackDrawWidth, this._trackDrawHeight);
        }

        const rollHeight = this._trackCount * this._trackDrawHeight;
        const octaveHeight = 12 * this._trackDrawHeight;
        this._ctx.fillStyle = this._whiteKey;
        this._ctx.fillRect(0, 0, 2 * this._trackDrawHeight, rollHeight);

        for (let i = 0; i < 10; i++) {
            this._ctx.strokeStyle = this._blackKey;
            this._ctx.beginPath();
            this._ctx.moveTo(0, rollHeight - i * octaveHeight);
            this._ctx.lineTo(2 * this._trackDrawHeight, rollHeight - i * octaveHeight);
            this._ctx.stroke();
        }

        const font = this._trackDrawHeight * 1.5;
        this._ctx.font = font + "px Arial sans-serif";
        this._ctx.fillStyle = "white";
        this._ctx.textAlign = "center";

        for (let i = 0; i < 10; i++) {
            this._ctx.save();
            let text = String(i);
            this._ctx.translate(font, rollHeight - octaveHeight * i - octaveHeight / 2);
            this._ctx.rotate(-Math.PI / 2);
            this._ctx.fillText(text, 0, 0, octaveHeight);
            this._ctx.restore();
        }

        this._ctx.fillStyle = "gold";
        this._ctx.fillRect(0, 43 * this._trackDrawHeight, this._trackDrawHeight, this._trackDrawHeight);
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
