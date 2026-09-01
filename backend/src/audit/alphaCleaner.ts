/**
 * Utility to eliminate faint semi-transparent haze and tiny disconnected
 * floating debris/artifacts from transparent icon buffers.
 */

export function cleanAlphaDebrisAndIslands(
  data: Buffer | Uint8Array,
  width: number,
  height: number,
  minAlphaThreshold = 35,
  minIslandRatio = 0.05
): void {
  const totalPixels = width * height;

  // 1. Zero out faint semi-transparent dust/haze
  for (let i = 0; i < totalPixels; i++) {
    if (data[i * 4 + 3] < minAlphaThreshold) {
      data[i * 4 + 3] = 0;
    }
  }

  // 2. BFS connected component labeling for remaining non-transparent pixels
  const visited = new Uint8Array(totalPixels);
  const components: number[][] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (visited[idx] || data[idx * 4 + 3] === 0) continue;

      const comp: number[] = [];
      const queue = [idx];
      visited[idx] = 1;

      while (queue.length > 0) {
        const curr = queue.pop()!;
        comp.push(curr);
        const cy = Math.floor(curr / width);
        const cx = curr % width;

        if (cx > 0) {
          const n = curr - 1;
          if (!visited[n] && data[n * 4 + 3] > 0) { visited[n] = 1; queue.push(n); }
        }
        if (cx < width - 1) {
          const n = curr + 1;
          if (!visited[n] && data[n * 4 + 3] > 0) { visited[n] = 1; queue.push(n); }
        }
        if (cy > 0) {
          const n = curr - width;
          if (!visited[n] && data[n * 4 + 3] > 0) { visited[n] = 1; queue.push(n); }
        }
        if (cy < height - 1) {
          const n = curr + width;
          if (!visited[n] && data[n * 4 + 3] > 0) { visited[n] = 1; queue.push(n); }
        }
      }
      components.push(comp);
    }
  }

  if (components.length <= 1) return;

  components.sort((a, b) => b.length - a.length);
  const largestSize = components[0]?.length || 0;

  // 3. Zero out small disconnected floating islands (< minIslandRatio of largest)
  for (let i = 1; i < components.length; i++) {
    if (components[i].length < largestSize * minIslandRatio) {
      for (const idx of components[i]) {
        data[idx * 4 + 3] = 0;
      }
    }
  }
}
