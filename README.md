# Overtone
This application plots overtones for acoustic instruments. Overtone is still a beta version.

Since scale pitch frequencies are exponential while the overtone sequence is arithmetic, the overtones in the sequence will not remain in tune with the fundamental pitch played by the instrument. This application shows the amount the overtones are out of tune in cents (1/100th of a semitone).

MIDI files can be uploaded, or a provided file can be loaded for analysis. Instrument track visibility can be toggled, or instruments can be merged to organize the music as desired (via right click context menu). The notes of instruments at the top of the list will be draw over the notes of instruments lower in the list. Rearranging the order of instruments will alter the order the instrument notes are drawn.

Currently, the overtones displayed are for illustrative purposes. Every instrument’s overtone sequence diminishes in amplitude in a linear fashion. A future version will correct this so overtone sequences match the individual instrument type.


## TODO
- Frequency range control
- Instrument based overtones
- Handle MIDI percussion correctly
- Reflect velocity and CC values in overtones
- Overtones/harmonic analysis comparison
