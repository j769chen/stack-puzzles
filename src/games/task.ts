export type Task<T> = Generator<void, T, void>;

export function runTask<T>(task: Task<T>): T {
  for (;;) {
    const step = task.next();
    if (step.done) return step.value;
  }
}

export async function runInSlices<T>(task: Task<T>, sliceMs = 8): Promise<T> {
  let deadline = Date.now() + sliceMs;
  for (;;) {
    const step = task.next();
    if (step.done) return step.value;
    if (Date.now() >= deadline) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      deadline = Date.now() + sliceMs;
    }
  }
}
