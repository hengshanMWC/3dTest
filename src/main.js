import { createApp } from 'vue'
import App from './App'
import { router } from './routes'
import 'normalize.css/normalize.css'
import 'uno.css'
import './styles/variables.css'

const app = createApp(App)
app.use(router)

// 关于 tailwind 的 preflight 样式
const meta = document.createElement('meta')
meta.name = 'naive-ui-style'
document.head.appendChild(meta)

// 优先级比naive-ui高
import('./styles/index.scss')

app.mount('#app')
