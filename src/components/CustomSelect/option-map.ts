import { type Option } from '@inkjs/ui'
import { optionHeaderKey, type OptionHeader } from './select'

interface OptionMapEntry {
  previous: OptionMapEntry | undefined
  next: OptionMapEntry | undefined
  index: number
}

type OptionMapItem = (Option | OptionHeader) & OptionMapEntry

class OptionMap extends Map<string, OptionMapItem> {
  readonly first: OptionMapItem | undefined

  constructor(optionsList: (Option | OptionHeader)[]) {
    const mapEntries: Array<[string, OptionMapItem]> = []
    let initialItem: OptionMapItem | undefined
    let previousEntry: OptionMapItem | undefined
    let currentIndex = 0

    for (const optionItem of optionsList) {
      const mapEntry: OptionMapItem = {
        ...optionItem,
        previous: previousEntry,
        next: undefined,
        index: currentIndex,
      }

      if (previousEntry !== undefined) {
        previousEntry.next = mapEntry
      }

      if (initialItem === undefined) {
        initialItem = mapEntry
      }

      const entryKey = 'value' in optionItem ? optionItem.value : optionHeaderKey(optionItem)
      mapEntries.push([entryKey, mapEntry])
      
      currentIndex++
      previousEntry = mapEntry
    }

    super(mapEntries)
    this.first = initialItem
  }
}

export default OptionMap
