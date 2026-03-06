import { reactive, toRef } from 'vue'

interface GameI {
  id: number
  name: string
  description: string
  color: string
  contrast: string
  background: string
  image: string
  card: string
  wordsLength: number
}

interface StateI {
  list: GameI[]
}

const state = reactive<StateI>({
  list: [
    {
      id: 1,
      name: 'Для начала',
      description: '3 буквы',
      color: '#18686b',
      contrast: '#D78095',
      background: '#121529',
      wordsLength: 3,
      image: new URL('~/assets/1/background.svg', import.meta.url).href,
      card: new URL('~/assets/1/card.svg', import.meta.url).href,
    },
    {
      id: 2,
      name: 'Довольно просто',
      description: '4 буквы',
      color: '#763D14',
      contrast: '#A2C62A',
      background: '#070F0C',
      wordsLength: 4,
      image: new URL('~/assets/2/background.svg', import.meta.url).href,
      card: new URL('~/assets/2/card.svg', import.meta.url).href,
    },
    {
      id: 3,
      name: 'Ух, как сложно',
      description: '5 букв',
      color: '#2D7779',
      contrast: '#EBF6FA',
      background: '#041112',
      wordsLength: 5,
      image: new URL('~/assets/3/background.svg', import.meta.url).href,
      card: new URL('~/assets/3/card.svg', import.meta.url).href,
    },
    {
      id: 4,
      name: 'Действительно сложно',
      description: '6 букв',
      color: '#45595F',
      contrast: '#98AD9E',
      background: '#0D0607',
      wordsLength: 6,
      image: new URL('~/assets/4/background.svg', import.meta.url).href,
      card: new URL('~/assets/4/card.svg', import.meta.url).href,
    },
    {
      id: 5,
      name: 'Невозможно',
      description: '7 букв',
      color: '#7E4C12',
      contrast: '#FAC119',
      background: '#110C07',
      wordsLength: 7,
      image: new URL('~/assets/5/background.svg', import.meta.url).href,
      card: new URL('~/assets/5/card.svg', import.meta.url).href,
    },
  ]
})

export function useGames() {
  return {
    list: toRef(state, 'list'),
  }
}
