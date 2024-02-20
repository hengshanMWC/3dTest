import { createRouter, createWebHashHistory } from 'vue-router'
import jiqiren from './pages/jiqiren.vue'
import paomo from './pages/paomo.vue'
import touming from './pages/touming.vue'

import poker404 from './pages/poker404.vue'
import { HOME_PAGE_NAME } from './constant'

const routes = [
  {
    path: '/3d',
    component: poker404,
    name: '3d',
    // hidden: true,
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
