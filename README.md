# Stack Puzzles

Two stacking puzzles in one Expo / React Native app, rendered in 3D with three.js via react-three-fiber and expo-gl.

- Tower Stack: Tower of Hanoi with 3 to 10 disks across 8 levels. Includes a move counter against the optimal count, undo, restart, and an optimal next-move hint.
- Ring Sort: sort colored rings onto rods, moving one ring at a time onto an empty rod or a ring of the same color. Levels are endless and seeded, so the same level number always deals the same rings. Every level is checked solvable before it is shown. Colors ramp from 3 to 10, then the rods grow to hold 5 rings from level 25 and 6 from level 37, with colors ramping again at each height. Includes undo, restart, shortest-path hints, a best move count, and stuck detection.

Both games give haptic and sound feedback, each of which can be switched off on the home screen. Level progress and settings persist with AsyncStorage.

## Run

```
npm install
npx expo install --fix
npx expo start
```

Scan the QR code with Expo Go, or press `i` / `a` for a simulator.

## Develop

Use the Node version in `.nvmrc`.

```
npm run typecheck       # tsc
npm run lint            # expo lint
npm test                # jest
npm run test:coverage   # jest with coverage thresholds
npm run check           # typecheck, lint and tests
```

Sound effects in `assets/sounds` are synthesized by `node scripts/generate-sounds.mjs`; tweak the tones there and rerun it.

Tests live next to the code they cover. Game rules and solvers are plain unit tests, screens use React Native Testing Library with the 3D board swapped for tappable stand-ins, and the 3D pieces, rods and boards render through `@react-three/test-renderer`.

## CI

GitHub Actions runs on every pull request and on pushes to `main`:

- Typecheck, lint, and tests with coverage, which fail under the thresholds in `package.json`.
- `expo-doctor` plus a production `expo export` for iOS and Android, which catches bundling errors that Jest can't.
