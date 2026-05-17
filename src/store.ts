import { AsyncLocalStorage } from 'node:async_hooks'
import type { RequestData } from './types.ts'

export const storage = new AsyncLocalStorage<RequestData>()

export class RingBuffer {
  readonly #data = new Map<string, RequestData>()
  readonly #max: number

  constructor(max = 100) {
    this.#max = max
  }

  push(entry: RequestData): void {
    if (this.#data.size >= this.#max) {
      const oldest = this.#data.keys().next().value
      if (oldest !== undefined) this.#data.delete(oldest)
    }
    this.#data.set(entry.id, entry)
  }

  get(id: string): RequestData | undefined {
    return this.#data.get(id)
  }

  list(): RequestData[] {
    return [...this.#data.values()].reverse()
  }
}

export const ringBuffer = new RingBuffer()
