<script setup lang="ts">
import type { GridRow } from '../game/share'
import { plural } from '../utils/format'

/** One column per word length: the fill shows the share of words found. */
defineProps<{ rows: GridRow[] }>()

function rowLabel({ length, found, total }: GridRow): string {
  return `${length} ${plural(length, ['буква', 'буквы', 'букв'])}: ${found} из ${total}`
}

function fill({ found, total }: GridRow): string {
  return `${total ? 100 * found / total : 0}%`
}
</script>

<template>
  <ul class="result-grid" aria-label="Найденные слова по длине">
    <li
      v-for="row in rows"
      :key="row.length"
      :class="{ 'result-grid-done': row.found === row.total }"
      :aria-label="rowLabel(row)"
    >
      <span class="result-grid-count" aria-hidden="true">{{ row.found }}<small>/{{ row.total }}</small></span>
      <span class="result-grid-bar" aria-hidden="true"><span :style="{ height: fill(row) }"></span></span>
      <span class="result-grid-label" aria-hidden="true">{{ row.length }}</span>
    </li>
  </ul>
</template>
