import type { CatalogIndex } from "@/features/placeholders/completion"
import { indexCatalog } from "@/features/placeholders/completion"
import type { PlaceholderCatalog } from "@/types/api"

/**
 * Live catalog holder shared with the (registered-once) Monaco providers so
 * metadata can refresh without re-registering anything.
 */

let catalog: PlaceholderCatalog | null = null
let index: CatalogIndex = indexCatalog(undefined)
const listeners = new Set<(catalog: PlaceholderCatalog | null) => void>()

export function getCatalog(): PlaceholderCatalog | null {
  return catalog
}

export function getCatalogIndex(): CatalogIndex {
  return index
}

export function setCatalog(next: PlaceholderCatalog | null): void {
  catalog = next
  index = next ? indexCatalog(next) : indexCatalog(undefined)
  for (const listener of listeners) listener(catalog)
}

export function subscribeCatalog(listener: (catalog: PlaceholderCatalog | null) => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
