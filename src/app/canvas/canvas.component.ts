import { AfterViewInit, Component, ViewChild } from "@angular/core";
import { CommonModule } from '@angular/common';
import { OvertoneSequence } from "../../overtone/OvertoneSequence";
import { Pitch } from "../../overtone/Pitch";
import { MidiService, OvertoneDisplay } from "../services/midi/midi.service";
import { MidiTrack } from "../services/midi/MidiTrack";
import Color from "color";
import { VirtualCanvasComponent } from "../virtual-canvas/virtual-canvas.component";

const trackDrawHeight: number = 9;
const headerSize: number = 2 * trackDrawHeight;
let quarterNoteWidth: number = trackDrawHeight * 4;
let beatPos: number = 0;

@Component({
    selector: "ot-canvas",
    templateUrl: "./canvas.component.html",
    styleUrl: "./canvas.component.scss",
    imports: [CommonModule, VirtualCanvasComponent],
    standalone: true
})

export class CanvasComponent implements AfterViewInit {
    @ViewChild("canvas") canvas!: VirtualCanvasComponent;


    private readonly _trackDrawHeight = trackDrawHeight;
    private readonly _trackCount = 96;
    private _pitchesContainer: HTMLDivElement | undefined;
    private _container: HTMLDivElement | undefined;
    // private _canvas: HTMLCanvasElement | undefined;
    private _canvasCtx!: CanvasRenderingContext2D;
    // private _pitches: HTMLCanvasElement | undefined;
    // private _canvasCtx: CanvasRenderingContext2D | undefined;
    // private _bars: HTMLCanvasElement | undefined;
    // private _barsCtx!: CanvasRenderingContext2D;
    private _whiteKey: string = "#04242e";
    private _blackKey: string = "#000000";

    private _lastVirtualWidth: number = 0;
    private _lastVirtualHeight: number = 0;
    private get zoom(): number { return this._midiService.zoomLevel; }
    private set zoom(value: number) { this._midiService.zoomLevel = value; }
    private _lastWheelEvent: WheelEvent | null = null;
    private _lastMouseX: number = -1;
    private _lastMouseY: number = -1;
    private _octaveHeight: number = 12 * trackDrawHeight;

    private _firstDrawBeat: number = 1;
    private _firstDrawBar: number = 1;
    private _viewRight: number = 0;

    constructor(protected _midiService: MidiService) {
        _midiService.zoomLevelChange.subscribe(v => this.performZoom(v));
        //_midiService.zoomLevelChange.subscribe(v => this.redraw());
    }

    windowWheelHandler(e: Event): void {
        if ((e?.target as HTMLCanvasElement)?.id == "canvas") {
            e.preventDefault();
        }
    }

    ngAfterViewInit(): void {
        window.addEventListener("wheel", this.windowWheelHandler, { passive: false })

        this._pitchesContainer = document.getElementById("pitches-container") as HTMLDivElement;
        // this._container = document.getElementById("canvas-container") as HTMLDivElement;
        //this._canvas = document.getElementById('canvas') as HTMLCanvasElement;

        // if (this._canvas === null) {
        //     throw new Error("no id 'canvas' found.");
        // }

        this.canvas.height = this._trackDrawHeight * this._trackCount + headerSize;
        this._canvasCtx = this.canvas.CanvasRenderingContext2D;

        // this._pitches = (document.getElementById("pitches") as HTMLCanvasElement);
        // this._pitches.height = this._canvas.height;
        // this._pitches.width = this._headerSize;
        // this._canvasCtx = this._pitches.getContext("2d")!;

        // this._bars = (document.getElementById("bars") as HTMLCanvasElement);
        // this._bars.height = this._headerSize;
        // this._barsCtx = this._bars.getContext("2d")!;

        this._midiService.midiFileLoaded.subscribe(e => this.onFileLoaded(e, this));
        this._midiService.overtoneDisplayChange.subscribe(e => this.redraw());
        this._midiService.centsThresholdChange.subscribe(e => this.redraw());
        this._midiService.tracksChange.subscribe(e => { this.trackManagement(); this.redraw() });
        this._midiService.drawBackgroundChange.subscribe(e => this.redraw());
        this._midiService.drawMonochromeChange.subscribe(e => this.redraw());
    }

    public onFileLoaded(midiService: MidiService, comp: CanvasComponent): void {
        comp.trackManagement();

        this.zoom = 1;
        beatPos = quarterNoteWidth / midiService.midiFile!.header.ticksPerBeat;
        // this._container!.scrollLeft = this._container!.scrollTop = 0;
        // comp.canvas.width = midiService.totalBeats * quarterNoteWidth;
        //this._bars!.width = midiService.totalBeats * quarterNoteWidth;

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
        // this.redraw();
    }

    mouseDown(event: PointerEvent) {
        this._lastMouseX = event.clientX;
        this._lastMouseY = event.clientY;
        this.canvas.canvas.nativeElement.setPointerCapture(event.pointerId);
        this.canvas.canvas.nativeElement.onpointermove = e => this.mouseMove(e, this);
        this.canvas.style.cursor = "grabbing";
    }

    mouseUp(event: PointerEvent) {
        this.canvas.canvas.nativeElement.releasePointerCapture(event.pointerId);
        this.canvas.canvas.nativeElement.onpointermove = null;
        this.canvas.style.cursor = "grab";
    }

    mouseMove(event: PointerEvent, comp: CanvasComponent) {
        comp._container!.scrollLeft -= event.clientX - comp._lastMouseX;
        comp._container!.scrollTop -= event.clientY - comp._lastMouseY;

        comp._lastMouseX = event.clientX;
        comp._lastMouseY = event.clientY;
    }

    // private validateTranslation(): void {
    //     if (this._container!.scrollLeft > 0) {
    //         this._container!.scrollLeft = 0;
    //     }
    //     else {
    //         const minX = this.canvas.width - this.canvas.width * this.zoom;
    //         if (this._container!.scrollLeft < minX) {
    //             this._container!.scrollLeft = minX;
    //         }
    //     }

    //     if (this._container!.scrollTop > 0) {
    //         this._container!.scrollTop = 0;
    //     }
    //     else {
    //         const minY = this.canvas.height - this.canvas.height * this.zoom;
    //         if (this._container!.scrollTop < minY) {
    //             this._container!.scrollTop = minY;
    //         }
    //     }
    //     this.drawBarTrack();
    //     this.drawPitchTrack();
    // }

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
            this._lastVirtualWidth = this.canvas.width;
            this._lastVirtualHeight = this.canvas.height;
        }

        const pctX = (x + this._container!.scrollLeft) / this._lastVirtualWidth;
        const newVirtualWidth = this.canvas.width * this.zoom;
        this._container!.scrollLeft = newVirtualWidth * pctX - x;
        this._lastVirtualWidth = newVirtualWidth;

        const pctY = (y + this._container!.scrollTop) / this._lastVirtualHeight;
        const newVirtualHeight = this.canvas.height * this.zoom;
        this._container!.scrollTop = newVirtualHeight * pctY - y;
        this._lastVirtualHeight = newVirtualHeight;

        //this.canvas.style.transform = "scale(" + this.zoom + ")";
        //this.canvas.height = this._trackDrawHeight * this._trackCount * this.zoom;
        //this.canvas.width = this._midiService.totalBeats * quarterNoteWidth * this.zoom;
        //this._bars!.width = this._midiService.totalBeats * quarterNoteWidth * this.zoom;

        this._container?.offsetHeight; // cause container div to redraw so vertical scrollbar refreshes

        this._octaveHeight = 12 * this._trackDrawHeight * this.zoom;

        // this.drawBarTrack();
        // this.drawPitchTrack();
        this.redraw();
    }

    private redraw(): void {
        this._firstDrawBeat = 0; //Math.floor(this._container!.scrollLeft / (this.zoom * quarterNoteWidth)) + 1;
        this._firstDrawBar = this._midiService.getBarFromBeat(this._firstDrawBeat);
        //this._viewRight = /*this._container!.scrollLeft +*/ this._container!.clientWidth;
        this._viewRight = this.canvas.width;

        this._canvasCtx!.clearRect(0, 0, this.canvas.width, this.canvas.height)
        // this._canvasCtx!.clearRect(0, 0, this._pitches!.width, this._pitches!.height)
        // this._barsCtx!.clearRect(0, 0, this._bars!.width, this._bars!.height)

        this.drawBackground();
        this.drawBarLines();
        this.drawBarHeader();
        this.drawPitchHeader();

        for (let i = 0; i < this._midiService.tracks.length; i++) {
            this.drawMidiTrack(this._midiService.tracks[i]);
        }
    }

    private drawMidiTrack(track: MidiTrack): void {
        if (track.isTrackVisible) {
            let notes: { [Key: number]: Note | null } = {};

            this._canvasCtx.fillStyle = this._midiService.drawMonochrome ? "gray" : track.color;

            const startTime = this._midiService.getGlobalTimeAtBar(this._firstDrawBar);
            for (let event of track.iterateFrom(startTime)) {
                if (event.globalTime * beatPos > this._viewRight) {
                    break;
                }

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
        color = this._midiService.drawMonochrome ? "gray" : color;

        const sequence = new OvertoneSequence(Pitch.fromMidi(midiNote).frequency, 4068);
        const halfHeight = this._trackDrawHeight / 2;

        this._canvasCtx.lineWidth = 1;
        let drawColor: Color;
        let greenColor: Color;
        let redColor: Color;

        if (this._midiService.overtoneDisplay == OvertoneDisplay.CentsOffset) {
            greenColor = this._midiService.drawMonochrome ? Color(color) : Color("lime");
            redColor = Color("red");
        }
        else {
            drawColor = Color(color);
        }

        for (let i = 1; i < Math.min(15, sequence.length); i++) {
            let overtone = sequence[i];

            if (this._midiService.overtoneDisplay == OvertoneDisplay.CentsOffset) {
                greenColor = greenColor!.darken(0.1);
                redColor = redColor!.darken(0.15);
                this._canvasCtx.strokeStyle = this._midiService.centsThreshold > Math.abs(overtone.cents) ? greenColor.hex() : redColor.hex();
            }
            else {
                drawColor = drawColor!.darken(0.15);
                this._canvasCtx.strokeStyle = drawColor.hex();
            }

            let y = -(overtone.closestPitch.midi - 107) * this._trackDrawHeight + halfHeight - this._trackDrawHeight * overtone.cents / 100;

            if (y <= headerSize) {
                break;
            }

            this._canvasCtx.beginPath();
            this._canvasCtx.moveTo(x, y);
            this._canvasCtx.lineTo(x + width, y);
            this._canvasCtx.stroke();
        }
    }

    private drawBarLines(): void {
        this._canvasCtx.strokeStyle = "black";
        this._canvasCtx.lineWidth = 1;

        // TODO: Add global beat count to bar metadata to optimize this
        let bar = 1;
        let i = headerSize + this.zoom * quarterNoteWidth * this._midiService.getTimeSignatureNumerator(1) * 4 / this._midiService.getTimeSignatureDenominator(1);

        for (i; bar < this._firstDrawBar;
            bar++, i += this.zoom * quarterNoteWidth * this._midiService.getTimeSignatureNumerator(bar) * 4 / this._midiService.getTimeSignatureDenominator(bar)) {
        }

        for (; i < this._viewRight;
            bar++, i += this.zoom * quarterNoteWidth * this._midiService.getTimeSignatureNumerator(bar) * 4 / this._midiService.getTimeSignatureDenominator(bar)) {
            this._canvasCtx.beginPath();
            let y = headerSize;
            this._canvasCtx.moveTo(i, y);
            this._canvasCtx.lineTo(i, y + this.canvas.height);
            this._canvasCtx.stroke();
        }
    }

    private drawBackground(): void {
        if (!this._midiService.drawBackground) {
            return;
        }

        const h = this._trackDrawHeight * this.zoom;
        const h2 = 2 * h;
        const x = headerSize; //this._container!.scrollLeft;
        const w = this.canvas.width; // this._container!.clientWidth;
        //const octaveHeight = 12 * this._trackDrawHeight * this.zoom;

        this._canvasCtx.fillStyle = this._whiteKey;
        this._canvasCtx.strokeStyle = "black";

        for (let i = 0; i < this._trackCount; i += 12) {
            let y = i * h + headerSize;

            // if (this._container!.scrollTop > y + this._octaveHeight) {
            //     continue;
            // }

            // if (y > this._container!.scrollTop + this._container!.clientHeight) {
            //     break;
            // }

            this._canvasCtx.fillRect(x, y, w, h);
            this._canvasCtx.beginPath();
            this._canvasCtx.moveTo(x, y);
            this._canvasCtx.lineTo(this._viewRight, y);
            this._canvasCtx.stroke();
            this._canvasCtx.fillRect(x, y, w, h);
            y += h2;
            this._canvasCtx.fillRect(x, y, w, h);
            y += h2;
            this._canvasCtx.fillRect(x, y, w, h);
            y += h2;
            this._canvasCtx.fillRect(x, y, w, h2);
            this._canvasCtx.beginPath();
            y += h;
            this._canvasCtx.moveTo(x, y);
            this._canvasCtx.lineTo(this._viewRight, y);
            this._canvasCtx.stroke();
            y += h2;
            this._canvasCtx.fillRect(x, y, w, h);
            y += h2;
            this._canvasCtx.fillRect(x, y, w, h);
        }
    }

    private drawBarHeader(): void {
        // this._bars!.width = this._canvas!.width * this.zoom;
        const font = this._trackDrawHeight * 1.5;

        // this._barsCtx.fillStyle = "gray";
        // this._barsCtx.fillRect(this._container!.scrollLeft, 0, this._container!.clientWidth, this._headerSize);

        // this._barsCtx.strokeStyle = this._blackKey;;
        // this._barsCtx.lineWidth = 1;
        // this._barsCtx.font = font + "px Arial sans-serif";
        // this._barsCtx.fillStyle = this._blackKey;
        // this._barsCtx.textAlign = "center";
        this._canvasCtx.fillStyle = "gray";
        this._canvasCtx.fillRect(0 /*this._container!.scrollLeft*/, 0, this.canvas.width /*this._container!.clientWidth*/, headerSize);

        this._canvasCtx.strokeStyle = this._blackKey;;
        this._canvasCtx.lineWidth = 1;
        this._canvasCtx.font = font + "px Arial sans-serif";
        this._canvasCtx.fillStyle = this._blackKey;
        this._canvasCtx.textAlign = "center";

        let bar = 1;
        let width = quarterNoteWidth * this._midiService.getTimeSignatureNumerator(1) * 4 / this._midiService.getTimeSignatureDenominator(1) * this.zoom;
        let i = headerSize;

        for (; i < this._viewRight; i += width, bar++) {
            width = quarterNoteWidth * this._midiService.getTimeSignatureNumerator(bar) * 4 / this._midiService.getTimeSignatureDenominator(bar) * this.zoom;
            if (bar < this._firstDrawBar) continue;
            // this._barsCtx.beginPath();
            // this._barsCtx.moveTo(i, 0);
            // this._barsCtx.lineTo(i, this._headerSize);
            // this._barsCtx.stroke();
            // this._barsCtx.fillText(String(bar), i + width / 2, font, width);
            this._canvasCtx.beginPath();
            this._canvasCtx.moveTo(i, 0);
            this._canvasCtx.lineTo(i, headerSize);
            this._canvasCtx.stroke();
            this._canvasCtx.fillText(String(bar), i + width / 2, font, width);
        }
    }

    private drawPitchHeader(): void {
        this._canvasCtx.fillStyle = "gray";
        this._canvasCtx.fillRect(0, headerSize, headerSize, this.canvas.height);
        this._canvasCtx.strokeStyle = this._blackKey;

        for (let i = 0; i < 10; i++) {
            this._canvasCtx.beginPath();
            this._canvasCtx.moveTo(0, this.canvas.height - i * this._octaveHeight);
            this._canvasCtx.lineTo(headerSize, this.canvas.height - i * this._octaveHeight);
            this._canvasCtx.stroke();
        }

        const fontHeight = this._trackDrawHeight * 1.5;
        this._canvasCtx.font = fontHeight + "px Arial sans-serif";
        this._canvasCtx.fillStyle = this._blackKey;
        this._canvasCtx.textAlign = "center";

        this._canvasCtx.save();
        this._canvasCtx.rotate(-Math.PI / 2);
        let xOffset = -this.canvas.height + this._octaveHeight / 2;
        for (let i = 0; i < 10; i++, xOffset += this._octaveHeight) {
            this._canvasCtx.fillText(String(i), xOffset, fontHeight, this._octaveHeight);
        }
        this._canvasCtx.restore();

        this._canvasCtx.fillStyle = "gold";
        const zoomedTrackHeight = this._trackDrawHeight * this.zoom;
        this._canvasCtx.fillRect(0, headerSize + 38 * zoomedTrackHeight, this._trackDrawHeight, zoomedTrackHeight);
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
        this.x = headerSize + beatPos * start;
        this.y = (107 - noteNumber) * trackDrawHeight;
    }
}
