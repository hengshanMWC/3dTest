import { createRouter, createWebHistory } from 'vue-router'
import NotFound from './pages/404.vue'
import poker404 from './pages/poker404.vue'
import { HOME_PAGE_NAME } from './constant'

const routes = [
  {
    path: '/404',
    component: NotFound,
    name: '404',
    hidden: true,
  },
  {
    path: '/',
    redirect: { name: HOME_PAGE_NAME },
    // component: Layout,
    children: [
      {
        path: '/',
        component: poker404,
        name: HOME_PAGE_NAME,
      },
    ],
  },
  // {
  //   path: '/3d',
  //   component: test,
  //   name: HOME_PAGE_NAME,
  // },
  {
    path: '/:pathMatch(.*)*',
    redirect: { path: '/404' },
  },
]

export default routes

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to, from, next) => {
  next()
})
