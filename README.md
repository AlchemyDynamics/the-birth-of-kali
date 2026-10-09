# Within the Darkness...

A playable procedural 3D prelude to **Dreamwalkers**. Explore a water-like cosmic void as an unnamed cosmic octopus, gather drifting blue lights, grow a nebula and star inside her mantle, and keep feeding the black hole that forms when the star collapses.

## Play locally

Run `npm start` (or `node server.mjs`) and open http://127.0.0.1:4173/ in a desktop browser with WebGL 2. No dependency installation is needed: Three.js and the recorded narration are included.

Click **Enter the void** to begin the opening cinematic. Headphones, a keyboard, and a mouse are recommended.

| Control | Action |
|---|---|
| Mouse | Orbit and aim; center the pointer to hold the view |
| W / S | Swim forward / backward |
| A / D | Strafe |
| Q / E | Descend / ascend |
| Space or Shift | Jet toward the pointer |
| Mouse wheel | Adjust camera distance |
| P or Escape | Pause / resume |
| M | Toggle sound |
| R | Restart |
| ? | Show controls |

Tentacles automatically catch nearby lights. Stop swimming to eat them; moving interrupts feeding while caught lights remain attached. Feeding follows a 92 BPM pulse, with melodic swallows on successive beats and chords of up to three notes on the same beat. Nebula, star, and black-hole stages begin at 8, 100, and 350 lights. At 100 lights, a separate Blue Supergiant ignition cinematic plays, then control returns for further feeding. At 350 lights, a second cinematic shows the collapse into a singularity. Play continues until 500 stars, when a lion’s roar interrupts her. The confrontation ends with a close view inside the mantle at the black hole; press R to restart.

After the Blue Supergiant cutscene at 100 stars, barrel rolls unlock a sustained blue boost fueled by captured stars. Hold Space (or Shift) to sustain the boost; releasing it immediately stops fuel use and returns her to a glide. Each held star fuels one second at 1.8× ordinary jet speed, with 65% faster steering and a continuous roll. Newly captured stars can extend the boost. Spent fuel does not count toward mantle growth; when fuel runs out, she glides back into ordinary movement. Empty barrel rolls remain available without the speed boost.

## GitHub Pages

This is a static browser game. In repository **Settings → Pages**, choose **Deploy from a branch**, then **main** and **/(root)**. The `.nojekyll` file serves the included modules and assets directly. Relative URLs support the repository subdirectory used by GitHub Pages.

The hosted game needs no API keys or backend service. Narration is included as prerecorded MP3 files.

## Development

- `src/` — procedural creature, shaders, movement, feeding, camera, and audio.
- `assets/narration/` — recorded voice lines.
- `vendor/` — locally included Three.js modules and its license.
- `npm test` — simulation checks.

The creature uses procedural pose deformation and texture-based skin relief; the water-like movement is an artistic simulation. Larger displays use an adaptive render resolution to reduce GPU load.

Feeding composes with the collected pitches: nearby notes form rising and falling figures, phrase endings favor D or A, and occasional consonant chords land together on a beat. Notes keep their pitch and tentacle ownership. Interrupted meals retain their order and progress; the shared feeding clock pauses with movement.

## Credits

Created for Dreamwalkers. Rendering uses Three.js; its MIT license is included in `vendor/THREE-LICENSE.txt`. Narration was generated using ElevenLabs. No license for the original game or its assets is granted by the included third-party license.

After singularity formation, periodic blue-light groups spawn every 12 seconds instead of 24, and the blue-light field capacity rises from 28 to 56.

The second light fades in over seven seconds at twice normal brightness, about two jets ahead. Completing it restores the white starfield. Early groups begin 1.5 seconds after the second meal, repeat every eight seconds even if earlier lights were missed, and appear roughly 2.5 jets ahead. Blue group sizes build through 2, 3, 3, and 4 before weighted groups of 2–6 (32%, 28%, 22%, 12%, 6%).

## Harmonic light clusters

Each physical cluster receives a coordinated set of pitches from D-major pentatonic (D, E, F-sharp, A, B), spanning D4–D7. Sets use D major, B minor, D6, Bm7, Dsus2, Asus4, Dadd9, and D6/9. Pairs use open intervals; larger sets add chord tones and octave doublings. Successive chords share at least two pitch classes, and lights keep their assigned notes when captured and swallowed. Larger groups use quieter individual voices.

Theory references: [Open Music Theory: Collections](https://viva.pressbooks.pub/openmusictheory/chapter/collections/), [Music Theory for the 21st-Century Classroom: Sus Chords](https://musictheory.pugetsound.edu/mt21c/SimpleSusChords.html). Run `node --test tests/harmony.test.mjs` for the pitch and voicing checks.
