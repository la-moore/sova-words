<script setup lang="ts">
import { Application, Object2D } from '@cynfas/core'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Effects } from '../game/fx'
import { type BadgeSpec } from './bake'
import { badgePalette } from './palettes'
import { mountBadgeStage, registerBadgeStage } from './stage'

const props = defineProps<{ badge: BadgeSpec; locked?: boolean; celebrate?: boolean }>()
const emit = defineEmits<{ reveal: [] }>()

const host = ref<HTMLElement>()
const failed = ref(false)
let dispose: (() => void) | undefined

onMounted(() => {
  let app: Application | undefined
  try {
    const container = host.value!
    app = new Application({ container, designSize: { width: 360, height: 370 }, autoStart: false })
    const stage = app
    registerBadgeStage(stage.renderer)
    stage.canvas.style.touchAction = 'pan-y'
    if (!props.locked) {
      stage.canvas.tabIndex = 0
      stage.canvas.setAttribute('aria-label', 'Значок. Вращение клавишами со стрелками.')
    }
    const particles = new Object2D({ zIndex: 10, interactiveChildren: false })
    stage.scene.add(particles)
    const effects = new Effects(stage.tweens, particles)
    const palette = badgePalette(props.badge.palette)
    const detach = mountBadgeStage(stage, stage.scene, props.badge, {
      x: 180, y: 173, locked: props.locked, celebrate: props.celebrate,
      onReveal: () => {
        effects.burst(180, 173, true, {
          colors: [palette.light, palette.highlight, palette.mid], count: 44, distance: 150,
        })
        emit('reveal')
      },
      onError: () => { failed.value = true },
    })
    dispose = () => { detach(); stage.destroy() }
    if (props.celebrate) stage.start()
  } catch {
    app?.destroy()
    failed.value = true
  }
})

onBeforeUnmount(() => dispose?.())
</script>

<template>
  <div ref="host" class="badge-preview" :class="{ locked }">
    <p v-if="failed" role="status">Не удалось загрузить значок.</p>
  </div>
</template>
