<script setup lang="ts">
import type { GridRow } from '../game/share'

/** One column per word length: the fill shows the share of words found. */
defineProps<{ rows: GridRow[] }>()

function letters(count: number): string {
  const last = count % 10
  const tens = count % 100
  if (last === 1 && tens !== 11) return 'буква'
  return last >= 2 && last <= 4 && (tens < 12 || tens > 14) ? 'буквы' : 'букв'
}
</script>

<template>
  <ul class="result-grid" aria-label="Найденные слова по длине">
    <li v-for="row in rows" :key="row.length" :class="{ 'result-grid-done': row.found === row.total }"
      :aria-label="`${row.length} ${letters(row.length)}: ${row.found} из ${row.total}`">
      <span class="result-grid-count" aria-hidden="true">{{ row.found }}<small>/{{ row.total }}</small></span>
      <span class="result-grid-bar" aria-hidden="true">
        <span :style="{ height: `${row.total ? 100 * row.found / row.total : 0}%` }"></span>
      </span>
      <span class="result-grid-label" aria-hidden="true">{{ row.length }}</span>
    </li>
  </ul>
</template>
