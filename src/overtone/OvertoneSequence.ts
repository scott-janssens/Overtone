import { Overtone } from "./Overtone";
import { Pitch } from "./Pitch";

export class OvertoneSequence extends Array<Overtone> {
    constructor(frequency: number, limitFrequency: number) {
        super();

        for (let i = 1; frequency * i <= limitFrequency; i++) {
            this.push(new Overtone(frequency * i));
        }
    }

    public static fromScientific(scientific: string, limitFrequency: number): OvertoneSequence {
        return new OvertoneSequence(new Pitch(scientific).frequency, limitFrequency);
    }
}
