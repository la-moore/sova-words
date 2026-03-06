<template>
  <div class="relative flex-1">
    <div class="absolute inset-0 bg-center bg-contain bg-no-repeat"
         :style="{ backgroundImage: `url(${selectedGame?.image})`, backgroundColor: selectedGame?.background }" />

    <div ref="canvasEl" class="absolute inset-0 max-w-2xl mx-auto" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue"
import { Renderer, Viewport, Scene, Container, GridHelper, BoxHelper, Color, Vector, TextShape, LineShape, Sprite } from "@pixme/canvas"
import { PointerControl, CustomPointerEvent } from "@pixme/canvas/controls"
import { ImageLoader } from "@pixme/canvas/loaders"
import anime from 'animejs/lib/anime.es.js'
import { useGames } from "~/state/games.ts"
import { generator } from '~/state/generator.ts'
import { useAnagrams } from '~/state/anagrams.ts'
import words from '~/assets/words.json?raw'

const props = defineProps({
  id: {
    type: Number,
    default: 1
  }
})

const CELL_SIZE = 10

const { list } = useGames()
const { getAnagrams } = useAnagrams()

const canvasEl = ref<HTMLElement>()
const lib = ref(JSON.parse(words))
const cells = ref<[number, number, Container][]>([])

const selectedGame = computed(() => list.value.find(({ id }) => id === props.id) || list.value[0]!)

let { anagrams, chars } = getAnagrams(lib.value, selectedGame.value.wordsLength, 3)
let game = generator(anagrams, chars)

if (!game) {
  const newWords = getAnagrams(lib.value, selectedGame.value.wordsLength, 3)
  anagrams = newWords.anagrams
  chars = newWords.chars
  game = generator(anagrams, chars)
}

const renderer = new Renderer()
const scene = new Scene()
const viewport = new Viewport()
const controls = new Container()
const grid = new Container()
const charsContainer = new Container()
const selectionLines = new Container()

const VECTOR_HALF = new Vector(2, 2)
const tmpLocal = new Vector()
const tmpCenter = new Vector()
const tmpDelta = new Vector()
const tmpStartWorld = new Vector()
const tmpEndWorld = new Vector()
const tmpScreen = new Vector()

const controlsHelper = new BoxHelper(0, 0, Color.red())
const sceneHelper = new BoxHelper(0, 0, Color.red())
const gridHelper = new GridHelper(new Vector(CELL_SIZE, CELL_SIZE), Color.red())

scene.add(sceneHelper)

scene.add(selectionLines)
scene.add(controls)
scene.add(controlsHelper)

scene.add(grid)
scene.add(gridHelper)

grid.add(charsContainer)

const openedWords = new Set<string>()
const isPointerDown = ref(false)
const pointerWorld = new Vector()
const selectedControls = ref<Container[]>([])

let pointerControl: PointerControl | undefined
let winShown = false
let rafId: number | undefined

const linePool: LineShape[] = []
let activeLines = 0

let charSpriteImage: HTMLImageElement | undefined
let tileSpriteImage: HTMLImageElement | undefined

onMounted(async () => {
  if (canvasEl.value) {
    canvasEl.value.appendChild(renderer.domElement)
  }

  hideHelpers()
  updateSizes()

  const level = String(selectedGame.value.id ?? props.id)
  const charUrl = new URL(`../assets/${level}/char.svg`, import.meta.url).href
  const tileUrl = new URL(`../assets/${level}/tile.svg`, import.meta.url).href
  const loader = new ImageLoader()
  ;[charSpriteImage, tileSpriteImage] = await Promise.all([
    loadImage(loader, charUrl),
    loadImage(loader, tileUrl)
  ])

  const table = game.ownerMap
  for (let y = 0; y < table.length; y++) {
    const row = table[y] || []

    for (let x = 0; x < row.length; x++) {
      if (!row[x]) continue

      const char = new Container()
      char.size.set(CELL_SIZE * 0.8, CELL_SIZE * 0.8)
      char.position.set((x * CELL_SIZE) + (CELL_SIZE * 0.1), (y * CELL_SIZE) + (CELL_SIZE * 0.1))

      const charBg = createSprite(tileSpriteImage!, char.size)
      const charFg = new TextShape(CELL_SIZE * 0.8, CELL_SIZE * 0.8, row[x].letter)
      charFg.visible = false
      charFg.size.copy(char.size)
      charFg.position.y += 0.2
      charFg.fontSize = CELL_SIZE * 0.5
      charFg.align = 'center'
      charFg.verticalAlign = 'middle'

      char.add(charBg)
      char.add(charFg)

      charsContainer.add(char)
      cells.value.push([x, y, char])
    }
  }

  animateGridIntro()

  for (let i = 0; i < chars.length; i++) {
    const size = controls.size.x * 0.2
    const char = chars[i]
    const control = new Container()
    ;(control as any).letter = char
    control.size.set(size, size)

    const pos = getArcPosition(i, (controls.size.y - size) / 2, chars.length)
    control.position.set((pos.x - (size / 2)) + controls.size.x / 2, (pos.y - (size / 2)) + controls.size.y / 2)

    const controlBg = createSprite(charSpriteImage!, control.size)

    const controlFg = new TextShape(CELL_SIZE * 0.8, CELL_SIZE * 0.8, char)
    controlFg.size.copy(control.size)
    controlFg.position.y += 0.2
    controlFg.fontSize = size * 0.5
    controlFg.align = 'center'
    controlFg.verticalAlign = 'middle'

    control.add(controlBg)
    control.add(controlFg)

    controls.add(control)
  }

  animateControlsIntro()

  pointerControl = new PointerControl(renderer.domElement)
  pointerControl.on('down', onPointerDown)
  pointerControl.on('move', onPointerMove)
  pointerControl.on('up', onPointerUp)

  window.addEventListener('resize', onResize)

  fitAndCenter()
  animate()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  pointerControl?.clear()

  if (rafId !== undefined) {
    window.cancelAnimationFrame(rafId)
    rafId = undefined
  }
})

function hideHelpers() {
  controlsHelper.visible = false
  sceneHelper.visible = false
  gridHelper.visible = false
}

function onResize() {
  updateSizes()
  fitAndCenter()
  render()
}

function updateSizes() {
  const width = canvasEl.value?.clientWidth || 0
  const height = canvasEl.value?.clientHeight || 0

  renderer.setSize(width, height)
  scene.size.set(width, height)

  sceneHelper.size.copy(scene.size)

  const controlsSize = Math.min(scene.size.y / 3, scene.size.x)
  controls.size.set(controlsSize, controlsSize)
  controls.position.x = (scene.size.x / 2) - controls.size.x / 2
  controls.position.y = scene.size.y - controlsSize
  controlsHelper.size.copy(controls.size)
  controlsHelper.position.copy(controls.position)

  grid.size.set(game.width * CELL_SIZE, game.height * CELL_SIZE)

  const availableWidth = scene.size.x
  const availableHeight = scene.size.y - (scene.size.y / 3) - 100
  const scaleFactor = Math.min(availableWidth / grid.size.x, availableHeight / grid.size.y)

  grid.scale.set(scaleFactor, scaleFactor)
  gridHelper.scale.set(scaleFactor, scaleFactor)

  grid.position.set(scene.size.x / 2, (scene.size.y / 3))
    .sub(grid.size.clone().scale(gridHelper.scale).divide(new Vector(2, 2)))

  gridHelper.size.copy(grid.size)
  gridHelper.position.copy(grid.position)

  for (let i = 0; i < controls.children.length; i++) {
    const control = controls.children[i]
    const size = controls.size.x * 0.2
    const pos = getArcPosition(i, (controls.size.y - size) / 2, chars.length)

    control?.size.set(size, size)
    control?.getChildren().forEach((child) => child.size.set(size, size))
    control?.position.set((pos.x - (size / 2)) + controls.size.x / 2, (pos.y - (size / 2)) + controls.size.y / 2)

    const bg = control?.getChildren().find((ch) => ch instanceof Sprite) as Sprite | undefined
    if (bg && charSpriteImage) {
      fitSpriteToSize(bg, charSpriteImage, control!.size)
    }
  }
}

function animateControlsIntro() {
  const delayStep = 70
  const duration = 650

  const cx = controls.size.x / 2
  const cy = controls.size.y / 2

  const startAngle = -Math.PI / 2
  const items = controls.children.map((node) => {
    const control = node as Container
    const centerX = control.position.x + control.size.x / 2
    const centerY = control.position.y + control.size.y / 2
    const dx = centerX - cx
    const dy = centerY - cy
    const angle = (Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI * 2)
    const angleFromTop = (angle - startAngle + Math.PI * 2) % (Math.PI * 2)
    return { control, angleFromTop }
  })

  items.sort((a, b) => a.angleFromTop - b.angleFromTop)

  for (let i = 0; i < items.length; i++) {
    const control = items[i]!.control
    const delay = i * delayStep

    control.opacity = 0
    control.scale.set(0, 0)

    anime({
      targets: control,
      opacity: [0, 1],
      delay,
      duration: 250,
      easing: 'linear'
    })

    anime({
      targets: control.scale,
      x: [0, 1],
      y: [0, 1],
      delay,
      duration,
      easing: 'easeOutElastic(1, .6)'
    })
  }
}

function fitAndCenter() {
  viewport.fitToNode(scene, renderer, 0.95)
  viewport.centerToNode(scene, renderer)
}

function render() {
  renderer.render(scene, viewport)
}

function animate() {
  updateSelectionLines()
  render()
  rafId = window.requestAnimationFrame(animate)
}

function onPointerDown(ev: CustomPointerEvent) {
  isPointerDown.value = true
  updatePointerWorld(ev)

  const hit = getControlUnderPointer(pointerWorld)
  if (hit) {
    if (!selectedControls.value.includes(hit)) {
      selectedControls.value.push(hit)
    }
  }
}

function onPointerMove(ev: CustomPointerEvent) {
  updatePointerWorld(ev)

  const hit = getControlUnderPointer(pointerWorld)
  if (!hit) return

  if (!isPointerDown.value) return

  if (!selectedControls.value.includes(hit)) {
    selectedControls.value.push(hit)
  } else if (selectedControls.value[selectedControls.value.length - 1] === hit) {
    selectedControls.value.pop()
  }
}

function onPointerUp(ev: CustomPointerEvent) {
  updatePointerWorld(ev)
  isPointerDown.value = false

  checkWord()
  selectedControls.value = []
}

function updatePointerWorld(ev: CustomPointerEvent) {
  const x = ev.x / renderer.pixelRatio
  const y = ev.y / renderer.pixelRatio
  tmpScreen.set(x, y)
  pointerWorld.copy(viewport.screenToWorld(tmpScreen.x, tmpScreen.y))
}

function getControlUnderPointer(worldPos: Vector) {
  tmpLocal.copy(worldPos).sub(controls.position)

  for (let i = 0; i < controls.children.length; i++) {
    const control = controls.children[i]
    if (!control) continue

    tmpCenter.copy(control.size).divide(VECTOR_HALF).add(control.position)
    const mX = tmpLocal.x - tmpCenter.x
    const mY = tmpLocal.y - tmpCenter.y
    const dist = Math.sqrt((mY * mY) + (mX * mX))
    const radius = Math.min(control.size.x, control.size.y) * 0.5

    if (dist < radius) return control
  }
}

function updateSelectionLines() {
  const lineColor = new Color(selectedGame.value.contrast)
  const strokeWidth = 3

  activeLines = 0

  const count = selectedControls.value.length
  if (count === 0) {
    for (let i = 0; i < selectionLines.children.length; i++) {
      selectionLines.children[i]!.visible = false
    }
    return
  }

  for (let i = 0; i < count - 1; i++) {
    setControlCenterWorld(tmpStartWorld, selectedControls.value[i]!)
    setControlCenterWorld(tmpEndWorld, selectedControls.value[i + 1]!)
    drawSelectionSegment(tmpStartWorld, tmpEndWorld, lineColor, strokeWidth)
  }

  if (isPointerDown.value) {
    setControlCenterWorld(tmpStartWorld, selectedControls.value[count - 1]!)
    drawSelectionSegment(tmpStartWorld, pointerWorld, lineColor, strokeWidth)
  }

  for (let i = activeLines; i < selectionLines.children.length; i++) {
    selectionLines.children[i]!.visible = false
  }
}

function setControlCenterWorld(out: Vector, control: Container) {
  out.copy(control.size).divide(VECTOR_HALF)
  out.add(control.position)
  out.add(controls.position)
}

function drawSelectionSegment(start: Vector, end: Vector, color: Color, strokeWidth: number) {
  tmpDelta.copy(end).sub(start)

  let line = linePool[activeLines]
  if (!line) {
    line = new LineShape(tmpDelta.x, tmpDelta.y, color)
    linePool[activeLines] = line
    selectionLines.add(line)
  }

  line.visible = true
  line.color = color
  line.strokeWidth = strokeWidth
  line.size.set(tmpDelta.x, tmpDelta.y)
  line.position.copy(start)

  activeLines++
}

function loadImage(loader: ImageLoader, url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    loader.load(
      url,
      (img) => resolve(img),
      undefined,
      (err) => reject(err)
    )
  })
}

function createSprite(image: HTMLImageElement, targetSize: Vector) {
  const sprite = new Sprite()
  sprite.image = image
  sprite.loaded = true
  fitSpriteToSize(sprite, image, targetSize)
  return sprite
}

function fitSpriteToSize(sprite: Sprite, image: HTMLImageElement, targetSize: Vector) {
  const iw = image.naturalWidth || image.width || 1
  const ih = image.naturalHeight || image.height || 1
  sprite.scale.set(targetSize.x / iw, targetSize.y / ih)
}

function animateGridIntro() {
  const delayStep = 45
  const duration = 650

  for (const [x, y, tile] of cells.value) {
    tile.opacity = 0
    tile.scale.set(0, 0)

    const delay = (x + y) * delayStep

    anime({
      targets: tile,
      opacity: [0, 1],
      delay,
      duration: 250,
      easing: 'linear'
    })

    anime({
      targets: tile.scale,
      x: [0, 1],
      y: [0, 1],
      delay,
      duration,
      easing: 'easeOutElastic(1, .6)'
    })
  }
}

function checkWord() {
  const word = selectedControls.value
    .map((c) => String((c as any).letter || ''))
    .join('')
    .toLowerCase()

  if (!word) return
  if (openedWords.has(word)) return

  const exists = game.positionObjArr.some((p: any) => p.wordStr === word)
  if (!exists) return

  openedWords.add(word)

  for (const [x, y, node] of cells.value) {
    const cell = (game.ownerMap?.[y]?.[x])
    if (!cell?.words?.includes(word)) continue

    const textNode = node.getChildren().find((ch) => ch instanceof TextShape) as TextShape | undefined
    if (textNode) textNode.visible = true
  }

  const totalWords = game.positionObjArr.length
  if (!winShown && openedWords.size >= totalWords) {
    winShown = true
    if (confirm('Вы победили! Хотите начать новый уровень?')) {
      resetLevel()
    }
  }
}

function resetLevel() {
  openedWords.clear()
  winShown = false
  
  const newWords = getAnagrams(lib.value, selectedGame.value.wordsLength, 3)
  anagrams = newWords.anagrams
  chars = newWords.chars
  game = generator(anagrams, chars)
  
  if (!game) {
    const fallbackWords = getAnagrams(lib.value, selectedGame.value.wordsLength, 3)
    anagrams = fallbackWords.anagrams
    chars = fallbackWords.chars
    game = generator(anagrams, chars)
  }
  
  charsContainer.children = []
  controls.children = []
  cells.value = []
  
  const table = game.ownerMap
  for (let y = 0; y < table.length; y++) {
    const row = table[y] || []

    for (let x = 0; x < row.length; x++) {
      if (!row[x]) continue

      const char = new Container()
      char.size.set(CELL_SIZE * 0.8, CELL_SIZE * 0.8)
      char.position.set((x * CELL_SIZE) + (CELL_SIZE * 0.1), (y * CELL_SIZE) + (CELL_SIZE * 0.1))

      const charBg = createSprite(tileSpriteImage!, char.size)
      const charFg = new TextShape(CELL_SIZE * 0.8, CELL_SIZE * 0.8, row[x].letter)
      charFg.visible = false
      charFg.size.copy(char.size)
      charFg.position.y += 0.2
      charFg.fontSize = CELL_SIZE * 0.5
      charFg.align = 'center'
      charFg.verticalAlign = 'middle'

      char.add(charBg)
      char.add(charFg)

      charsContainer.add(char)
      cells.value.push([x, y, char])
    }
  }

  animateGridIntro()

  for (let i = 0; i < chars.length; i++) {
    const size = controls.size.x * 0.2
    const char = chars[i]
    const control = new Container()
    ;(control as any).letter = char
    control.size.set(size, size)

    const pos = getArcPosition(i, (controls.size.y - size) / 2, chars.length)
    control.position.set((pos.x - (size / 2)) + controls.size.x / 2, (pos.y - (size / 2)) + controls.size.y / 2)

    const controlBg = createSprite(charSpriteImage!, control.size)

    const controlFg = new TextShape(CELL_SIZE * 0.8, CELL_SIZE * 0.8, char)
    controlFg.size.copy(control.size)
    controlFg.position.y += 0.2
    controlFg.fontSize = size * 0.5
    controlFg.align = 'center'
    controlFg.verticalAlign = 'middle'

    control.add(controlBg)
    control.add(controlFg)

    controls.add(control)
  }

  animateControlsIntro()
}

function getArcPosition(i: number, radius: number, chars: number) {
  const angle = 360 / chars

  let x = radius * Math.sin(Math.PI * 2 * (angle * i) / 360)
  let y = radius * Math.cos(Math.PI * 2 * (angle * i) / 360)

  x = Math.round(x * 100) / 100
  y = Math.round(y * 100) / 100

  return {
    radius,
    x,
    y
  }
}
</script>
