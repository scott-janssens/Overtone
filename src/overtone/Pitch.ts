export class Pitch {
    private static readonly _steps: { [name: string]: number; } = { "C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11 };
    private static readonly _namesSharp: string[] = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    private static readonly _namesFlat: string[] = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

    private _frequency: number = 0;
    public get frequency(): number {
        return this._frequency;
    }

    private _letter: string = "";
    public get letter(): string {
        return this._letter;
    }

    private _octave: number = 0;
    public get octave(): number {
        return this._octave;
    }

    private _scientific: string = "";
    public get scientific(): string {
        return this._scientific;
    }

    private _midi: number = 0;
    public get midi(): number {
        return this._midi;
    }

    constructor(scientific: string) {
        scientific = scientific.charAt(0).toUpperCase() + scientific.slice(1);

        let step: number = Pitch._steps[scientific[0]];
        if (step == null) {
            throw new Error("Invalid note name: " + scientific);
        }

        let pos = 1;

        if (scientific[1] == "#") {
            pos++
            step++;
        }
        else if (scientific[1] == "b") {
            pos++
            step--;
        }

        let octave = +scientific[pos];

        if (octave < 0) {
            throw new Error("Octave must be 0 or greater.");
        }

        step += 12 * octave;

        this._letter = scientific.substring(0, pos);
        this._octave = octave;
        this._scientific = scientific.substring(0, pos + 1);
        this._frequency = 16.3516 * Math.pow(2, step / 12);
        this._midi = 12 + 12 * octave + this.getNameIndex(this._letter);
    }

    private getNameIndex(letter: string): number {
        let result = Pitch._namesSharp.indexOf(letter);
        if (result < 0) {
            result = Pitch._namesFlat.indexOf(letter);
        }

        return result;
    }

    public static fromMidi(midi: number): Pitch {
        if (midi < 12 || midi > 127) {
            throw new Error("MIDI value out of range for Pitch (24-127).");
        }

        let scientific = this._namesSharp[midi % 12] + (Math.floor(midi / 12) - 1);
        return new Pitch(scientific);
    }
}
