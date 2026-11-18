import { createApp } from 'vue'
import { createWebHashHistory } from 'vue-router'
import App from './App.vue'
import Home from './Home.vue'
import { createGameRouter } from './routes'
import './style.css'

const router = createGameRouter(createWebHashHistory(), Home)
createApp(App).use(router).mount('#site')

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(error => {
    console.warn('Could not enable offline play', error)
  })
}
