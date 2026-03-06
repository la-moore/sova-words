import { type RouteRecordRaw } from 'vue-router'

interface RouterProps {
  params: {
    id: string
  }
}

export default [
  {
    path: '/',
    component: () => import('../layouts/main.vue'),
    redirect: { name: 'home' },
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('../views/home-view.vue'),
        meta: {
          title: 'Сова'
        }
      },
      {
        path: '/game/:id',
        name: 'game',
        component: () => import('../views/game-view.vue'),
        props: ({ params }: RouterProps) => ({
          id: parseInt(params.id),
        }),
        meta: {
          title: 'Сова'
        }
      },
    ]
  },
  {
    path: '/:catchAll(.*)?',
    name: '404',
    component: () => import('../views/not-found.vue'),
    meta: {
      title: 'Ошибка'
    }
  }
] as RouteRecordRaw[]
