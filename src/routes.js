import { createRouter, createWebHashHistory } from 'vue-router'
import jiqiren from './pages/jiqiren.vue'
import xuehua from './pages/xuehua.vue'

import paomo from './pages/paomo.vue'
import touming from './pages/touming.vue'
import gsap from './pages/gsap.vue'
import webgl_lights_rectarealight from './pages/webgl_lights_rectarealight.vue'

import poker404 from './pages/poker404.vue'

const routes = [
  {
    path: '/3d',
    component: poker404,
    name: '3d',
    // hidden: true,
  },
  {
    path: '/webgl_lights_rectarealight',
    component: webgl_lights_rectarealight,
    name: 'webgl_lights_rectarealight',
    // hidden: true,
  },

  {
    path: '/xuehua',
    component: xuehua,
    name: 'xuehua',
  },
  {
    path: '/jiqiren',
    component: jiqiren,
    name: 'jiqiren',
  },
  {
    path: '/paomo',
    component: paomo,
    name: 'paomo',
  },
  {
    path: '/touming',
    component: touming,
    name: 'touming',
  },
  {
    path: '/gsap',
    component: gsap,
    name: 'gsap',
  },

  // {
  //   path: '/',
  //   redirect: { name: HOME_PAGE_NAME },
  //   // component: Layout,
  //   children: [
  //     {
  //       path: '/3d',
  //       component: poker404,
  //       name: HOME_PAGE_NAME,
  //     },
  //   ],
  // },
  // {
  //   path: '/3d',
  //   component: test,
  //   name: HOME_PAGE_NAME,
  // },
  {
    path: '/:pathMatch(.*)*',
    redirect: { path: '/3d' },
  },
]

export default routes

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach(async (to, from, next) => {
  next()
})
