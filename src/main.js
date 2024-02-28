import { createApp } from 'vue'
import App from './App'
import { router } from './routes'
import 'normalize.css/normalize.css'
import 'uno.css'
import './styles/variables.css'
import './styles/index.scss'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { gsap } from 'gsap'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'

const app = createApp(App)
app.use(router)

app.mount('#app')
gsap.registerPlugin(ScrollTrigger, MotionPathPlugin)
