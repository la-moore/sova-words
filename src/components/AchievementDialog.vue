<script setup lang="ts">
import closeIcon from '@scarlab-icons/icons/base/x-lg.svg?raw'
import { useId, useTemplateRef } from 'vue'
import type { Achievement } from '../game/achievements'
import RawIcon from './RawIcon.vue'

/** Modal card for one badge. Slots: `header` above the preview, `preview`, and the default one below the text. */
defineProps<{ award?: Pick<Achievement, 'title' | 'description'> }>()
const emit = defineEmits<{ close: [] }>()

const dialogElement = useTemplateRef<HTMLDialogElement>('dialog')
const titleId = useId()

defineExpose({
  /** Shows the dialog and focuses the element matching `focus`, the close button by default. */
  open(focus = '.achievement-close') {
    const element = dialogElement.value
    if (!element?.isConnected) return
    if (!element.open) element.showModal()
    element.querySelector<HTMLElement>(focus)?.focus()
  },
  close() {
    dialogElement.value?.close()
  },
})
</script>

<template>
  <dialog ref="dialog" class="achievement-dialog" :aria-labelledby="titleId" @close="emit('close')">
    <template v-if="award">
      <button type="button" class="achievement-close" aria-label="Закрыть" @click="dialogElement?.close()">
        <RawIcon :svg="closeIcon" />
      </button>
      <slot name="header" />
      <slot name="preview" />
      <h2 :id="titleId">{{ award.title }}</h2>
      <p>{{ award.description }}</p>
      <slot />
    </template>
  </dialog>
</template>
