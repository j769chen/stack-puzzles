# Stack Puzzles

Stacking and sorting puzzles in one Expo / React Native app, rendered in 3D with three.js via react-three-fiber and expo-gl.

- Daily Puzzle: a Ring Sort deal seeded from the local date, so everyone gets the same puzzle each day. Each weekday only accepts deals whose optimal solution falls in its band, from 15–18 moves on Monday to 45–50 on Sunday. Scored with one to three stars against the optimal count, with a streak and a Share button.
- Tower Stack: Tower of Hanoi with 3 to 10 disks across 8 levels. Includes a move counter against the optimal count with live stars, undo, and restart.
- Ring Sort: sort colored rings onto rods, moving one ring at a time onto an empty rod or a ring of the same color. Levels are endless and seeded, so the same level number always deals the same rings. Every level is checked solvable before it is shown. Colors ramp from 3 to 10, then the rods grow to hold 5 rings from level 25 and 6 from level 37, with colors ramping again at each height. A zen mode: a plain move count, no stars. Includes undo, restart, and stuck detection.
- Tower Sort: Ring Sort with Tower of Hanoi sizes. A ring fits on an empty rod or a bigger ring of any color; each color must end on its own rod, largest at the bottom. Levels grow from 3 colors of 3 sizes to 5 colors of 4, each a seeded random layout kept only if a search solves it. Zen like Ring Sort.

Pieces move by dragging from rod to rod or by tapping one rod and then another. Every game gives haptic and sound feedback, each of which can be switched off on the home screen. A color-blind setting draws a distinct pattern on each ring color. Level progress and settings persist with AsyncStorage.

## Run

```
npm install
npx expo install --fix
npx expo start
```

The project includes `expo-dev-client`, so `npx expo start` serves a development build by default. Build one first:

```
npx expo run:ios --device                          # local build, needs Xcode
eas build --profile development --platform ios     # cloud build, installs on registered devices
```

To try it without a build, run `npx expo start --go` (or press `s` in the running server) and scan the QR code with Expo Go, or press `i` / `a` for a simulator.

Expo Go is fine for gameplay, but on iOS it runs the stock expo-gl, which can drop or repeat frames when it presents the 3D view. `patches/expo-gl+57.0.2.patch` (applied by `patch-package` on install) presents each frame as soon as it is drawn. It is compiled into every native build of the app, development and production alike, but Expo Go can't include it.

`expo-gl` is pinned to the exact version the patch was made against. After upgrading it, reapply the change and regenerate the patch with `npx patch-package expo-gl`.

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

The app icon, Android adaptive icon and splash image in `assets` are drawn by `node scripts/generate-icons.mjs`, which needs ImageMagick (`brew install imagemagick`).

Tests live next to the code they cover. Game rules and solvers are plain unit tests, screens use React Native Testing Library with the 3D board swapped for tappable stand-ins, and the 3D pieces, rods and boards render through `@react-three/test-renderer`.

## Release

Store copy, the age rating and privacy answers, and the screenshot list are in `store/listing.md`. The privacy policy is `store/privacy-policy.md`, linked from both store listings.

One-time setup links the project to EAS and creates the store records:

```
npm install -g eas-cli
eas login
eas init                                           # adds the EAS project ID to app.json
```

Then create the app in App Store Connect and the Google Play Console with the bundle ID `com.j769chen.stackpuzzles`. Build numbers are kept by EAS and go up on every production build.

```
eas build --profile preview --platform all         # installable test builds
eas build --profile production --platform all      # store builds
eas submit --profile production --platform ios     # upload to TestFlight
eas submit --profile production --platform android # upload to Play internal testing
```

The first Android upload has to be done by hand in the Play Console. After that, `eas submit` needs a Google service account key.

## CI

GitHub Actions runs on every pull request and on pushes to `main`:

- Typecheck, lint, and tests with coverage, which fail under the thresholds in `package.json`.
- `expo-doctor` plus a production `expo export` for iOS and Android, which catches bundling errors that Jest can't.
