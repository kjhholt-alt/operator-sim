/**
 * Tiny binary min-heap. Used by Dijkstra in pathfinding.ts.
 *
 * Items are pairs of (key: number, val: T). pop() returns the val with the
 * smallest key. Lazy-deletion is fine — we just push duplicate entries and
 * dedupe on pop with a visited set, so no decrease-key needed.
 */

interface Entry<T> {
  k: number;
  v: T;
}

export class MinHeap<T> {
  private h: Entry<T>[] = [];

  get size(): number {
    return this.h.length;
  }

  push(key: number, val: T): void {
    this.h.push({ k: key, v: val });
    this.siftUp(this.h.length - 1);
  }

  pop(): T | undefined {
    if (this.h.length === 0) return undefined;
    const top = this.h[0];
    const last = this.h.pop()!;
    if (this.h.length > 0) {
      this.h[0] = last;
      this.siftDown(0);
    }
    return top.v;
  }

  peekKey(): number | undefined {
    return this.h[0]?.k;
  }

  private siftUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.h[parent].k <= this.h[i].k) break;
      [this.h[parent], this.h[i]] = [this.h[i], this.h[parent]];
      i = parent;
    }
  }

  private siftDown(i: number): void {
    const n = this.h.length;
    for (;;) {
      const l = i * 2 + 1;
      const r = i * 2 + 2;
      let smallest = i;
      if (l < n && this.h[l].k < this.h[smallest].k) smallest = l;
      if (r < n && this.h[r].k < this.h[smallest].k) smallest = r;
      if (smallest === i) break;
      [this.h[smallest], this.h[i]] = [this.h[i], this.h[smallest]];
      i = smallest;
    }
  }
}
