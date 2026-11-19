import { createApp } from 'vue'
import { createWebHashHistory } from 'vue-router'
import App from './App.vue'
import { createGameRouter } from './router'
import './style.css'

createApp(App).use(createGameRouter(createWebHashHistory())).mount('#site')

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(error => {
    console.warn('Could not enable offline play', error)
  })
}
