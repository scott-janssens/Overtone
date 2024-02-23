import { Pitch } from "./Pitch";

export class Overtone {
    private static readonly _names: string[] = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    private static readonly _steps: { [name: string]: number; } = { "C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11 };

    private _closestPitch: Pitch;
    public get closestPitch(): Pitch {
        return this._closestPitch;
    }

    private _frequency: number;
    public get frequency(): number {
        return this._frequency;
    }

    private _cents: number;
    public get cents(): number {
        return this._cents;
    }

    constructor(frequency: number) {
        this._frequency = frequency;

        const r = 12 * Math.log2(frequency / 16.3516);
        const h = Math.round(r);

        this._cents = Math.round(100 * (r - h));
        this._closestPitch = new Pitch(Overtone._names[h % 12]+ Math.floor(h / 12));
    }

    public static fromScientific(scientific: string) : Overtone {
         return new Overtone(new Pitch(scientific).frequency);
    }
}