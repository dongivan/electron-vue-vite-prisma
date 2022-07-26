import { createApp } from 'vue'
import App from './App.vue'

window.database.initialize().then(() => {
  createApp(App)
    .mount('#app')
    .$nextTick(() => {
      postMessage({ payload: 'removeLoading' }, '*')
    })
})

