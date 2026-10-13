# Stack Puzzles

Two stacking puzzles in one Expo / React Native app.

- Tower Stack: Tower of Hanoi with 3 to 10 disks across 8 levels. Includes a move counter against the optimal count, undo, restart, and an optimal next-move hint.
- Ring Sort: sort colored rings onto rods of capacity 4. Levels are endless and seeded, so the same level number always deals the same rings. Every level is checked solvable before it is shown. Colors ramp from 3 to 10. Includes undo, restart, a solver-backed hint, and stuck detection.

Level progress persists with AsyncStorage.

## Run

```
npm install
npx expo install --fix
npx expo start
```

Scan the QR code with Expo Go, or press `i` / `a` for a simulator.
