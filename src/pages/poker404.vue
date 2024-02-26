<script setup>
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import Stats from 'three/addons/libs/stats.module.js'
import { useEventListener } from '@vueuse/core'
import { onMounted, ref } from 'vue'
import { AnaglyphEffect } from 'three/addons/effects/AnaglyphEffect.js'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { gsap } from 'gsap'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import Lenis from '@studio-freight/lenis'
import glb from './role03_walk_nostep.glb'

gsap.registerPlugin(ScrollTrigger, MotionPathPlugin)
const bg = '#87110e'
let scene = null // 场景
const dimian = -12
let camera = null // 相机
// const material = null // 材质
let renderer = null // 渲染器对象
// let controls = null //
let currentAnim = null
let model = null

const possibleAnimsRef = ref([])
let mixer = null
let clock = null
let mouseX = 0
let mouseY = 0
const statsRef = ref(null)
let stats = null
const particles = []
const spheres = []
let effect = null
function initSmoothScrolling() {
  const lenis = new Lenis({
    lerp: 0.02, // 值越小平滑效果越明显
    smoothWheel: true, // 为鼠标滚轮事件启用平滑滚动
  })
  // 每次用户滚动时更新ScrollTrigger
  lenis.on('scroll', () => ScrollTrigger.update())
  // 每一帧动画执行
  const scrollFn = time => {
    lenis.raf(time) // lenis中requestAnimationFrame方法
    requestAnimationFrame(scrollFn) // 递归调用
  }
  // return scrollFn
  // 启用动画帧
  requestAnimationFrame(scrollFn)
}
// const scrollFn = initSmoothScrolling()
const mirrorOperations = [
  {
    position: {
      x: 3,
      y: 9,
      z: 12,
    },
    lookAt: {
      x: 0,
      y: 9,
      z: 0,
    },
  },
  {
    position: {
      x: 7.138195444582843,
      y: 7.648529270389185,
      z: 11.160025349206737,
    },
    lookAt: {
      x: 0,
      y: 9,
      z: 0,
    },
  },
  {
    position: {
      x: 12.416683452182289,
      y: 7.809889948321353,
      z: 7.282800508327517,
    },
    lookAt: {
      x: 0,
      y: 9,
      z: 0,
    },
  },
  {
    position: {
      x: 13.356578217133153,
      y: 6.9238888015030575,
      z: 2.7679563208305042,
    },
    lookAt: {
      x: 0,
      y: 9,
      z: 0,
    },
  },
  {
    position: {
      x: 13.968149122734232,
      y: 8.823049699493334,
      z: -6.7781872320138294,
    },
    lookAt: {
      x: 0,
      y: 9,
      z: 0,
    },
  },
  {
    position: {
      x: -4.1616,
      y: 8.86635,
      z: -23.61664,
    },
    lookAt: {
      x: 0,
      y: 9,
      z: 0,
    },
  },
  {
    position: {
      x: -15.42684716554167,
      y: 9.730936946412195,
      z: -22.42972366005828,
    },
    lookAt: {
      x: 0,
      y: 9,
      z: 0,
    },
  },
  {
    position: {
      x: -26.69209433108334,
      y: 10.595523892824389,
      z: -21.24280732011656,
    },
    lookAt: {
      x: 0,
      y: 9,
      z: 0,
    },
  },
  {
    position: {
      x: -34.77226704784853,
      y: 5.002440607117852,
      z: 28.704523582833584,
    },
    lookAt: {
      x: 0,
      y: 9,
      z: 0,
    },
  },
  {
    position: {
      x: -26.06623834522301,
      y: 7.89037385319217,
      z: 50.18228036760577,
    },
    lookAt: {
      x: 0,
      y: 9,
      z: 0,
    },
  },
]
window.mirrorOperations = mirrorOperations

const touched = false
function onDocumentMouseMove(mousecoords) {
  mouseX = mousecoords.x
  mouseY = mousecoords.y
}

/** 创建场景 */
function initScene() {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(bg)
  scene.fog = new THREE.Fog(bg, 60, 100) // 雾化效果
}

/** 创建相机 */
function initCamera() {
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    // 100,
  )
  // camera.setFocalLength(85)
  const position = mirrorOperations[0].position
  // const lookAt = mirrorOperations[0].lookAt
  camera.position.set(position.x, position.y, position.z)
  // camera.lookAt(lookAt.x, lookAt.y, lookAt.z)
  // camera.rotation.set(...cameraRotation)
  // const helper = new THREE.CameraHelper(camera)
  // scene.add(helper)
  window.camera = camera
}

/** 创建渲染器 */
function initRenderer() {
  const canvas = document.querySelector('#c')
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true, // 抗齿距
  })
  renderer.shadowMap.enabled = true // 投射阴影
  renderer.setPixelRatio(window.devicePixelRatio)
  // controls = new OrbitControls(camera, renderer.domElement)
  // controls.maxPolarAngle = Math.PI / 2
  // controls.minPolarAngle = Math.PI / 3
  // controls.enableDamping = true
  // controls.enablePan = false
  // controls.dampingFactor = 0.1
  // controls.autoRotate = false // Toggle this if you'd like the chair to automatically rotate
  // controls.autoRotateSpeed = 0.2 // 30
}

/** 创建网格模型对象 */
function initMesh() {
  const loader = new GLTFLoader()

  // 加载纹理贴图
  // const texture = new THREE.TextureLoader().load(
  //   'https://s3-us-west-2.amazonaws.com/s.cdpn.io/1376484/stacy.jpg',
  // )
  // texture.flipY = false

  /** 材质对象 */
  // material = new THREE.MeshPhongMaterial({
  //   map: texture,
  //   color: 0xffffff,
  //   skinning: true,
  // })

  loader.load(
    // 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/1376484/stacy_lightweight.glb',
    glb,
    gltf => {
      window.model = model = gltf.scene

      model.traverse(o => {
        if (o.isMesh) {
          // 启用投射和接收阴影的能力
          o.castShadow = true
          o.receiveShadow = true
          // o.material = material
        }
      })

      // 放大 7 倍
      model.scale.set(10, 10, 10)
      // model.scale.set(4.1176, 4.1176, 4.1176)
      model.position.y = dimian

      scene.add(model)

      // 创建模型动作混合器
      mixer = new THREE.AnimationMixer(model)

      // 拿到模型中自带的动画数据
      const clips = gltf.animations

      // 遍历动画列表并生成操作对象存储起来
      possibleAnimsRef.value = clips.map(val => {
        let clip = THREE.AnimationClip.findByName(clips, val.name)

        clip = mixer.clipAction(clip)
        return clip
      })

      // 得到动画操作对象
      currentAnim = possibleAnimsRef.value[0]
      currentAnim.play() // 播放空闲动画
    },
    undefined, // We don't need this function
    error => {
      console.error(error)
    },
  )
}

/** 创建光源 */
function initLight() {
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 1)
  hemiLight.position.set(0, 50, 0)
  scene.add(hemiLight)
  // 阴影
  const d = 8.25
  const dirLightShadow = new THREE.DirectionalLight(0xffffff, 0.54)
  dirLightShadow.position.set(-8, 12, 8)
  dirLightShadow.castShadow = true
  dirLightShadow.shadow.mapSize = new THREE.Vector2(1024, 1024)
  dirLightShadow.shadow.camera.near = 0.1
  dirLightShadow.shadow.camera.far = 1500
  dirLightShadow.shadow.camera.left = d * -1
  dirLightShadow.shadow.camera.right = d
  dirLightShadow.shadow.camera.top = d
  dirLightShadow.shadow.camera.bottom = d * -1
  scene.add(dirLightShadow)
  // 左光
  const dirLightLeft = new THREE.SpotLight(0x5786cf, 100)
  dirLightLeft.position.set(-8, 1, 0)
  dirLightLeft.angle = Math.PI / 10
  // const helper = new THREE.SpotLightHelper(dirLightLeft, 1)
  // window.helper = helper
  // scene.add(helper)
  scene.add(dirLightLeft)
  // 右光
  const dirLightRight = new THREE.SpotLight(0xeebe8f, 100)
  dirLightRight.position.set(10, 6, 0)
  dirLightRight.angle = Math.PI / 4
  // const targetObjectRight = new THREE.Object3D()
  // window.dirLightRight = dirLightRight
  // targetObjectRight.position.set(3, 6, 0)
  // scene.add(targetObjectRight)
  // dirLightRight.target = targetObjectRight
  // const helperRight = new THREE.SpotLightHelper(dirLightRight, 1)
  // scene.add(helperRight)
  scene.add(dirLightRight)
}

function getRandomHexColor() {
  // 生成一个随机的0到16777215之间的整数
  const randomColor = Math.floor(Math.random() * 16777215)
  // 将整数转换为十六进制，并在开头补零以确保是六位颜色代码
  return `#${randomColor.toString(16).padStart(6, '0')}`
}
function initParticle() {
  const sphere = new THREE.SphereGeometry(0.2, 8, 4)
  const intensity = 100
  for (let i = 0; i < 10; i++) {
    const bg = getRandomHexColor()
    const particle = new THREE.PointLight(bg, intensity)
    particle.add(
      new THREE.Mesh(sphere, new THREE.MeshBasicMaterial({ color: bg })),
    )
    particles.push({
      particle,
      x: Math.random(),
      y: Math.random(),
      z: Math.random(),
    })
    scene.add(particle)
  }
}
function initBubble() {
  const path = './cube/pisa/'
  const format = '.png'
  const urls = [
    `${path}px${format}`,
    `${path}nx${format}`,
    `${path}py${format}`,
    `${path}ny${format}`,
    `${path}pz${format}`,
    `${path}nz${format}`,
  ]
  const textureCube = new THREE.CubeTextureLoader().load(urls)
  const geometry = new THREE.SphereGeometry(0.2, 32, 16)
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    envMap: textureCube,
  })

  for (let i = 0; i < 5; i++) {
    const mesh = new THREE.Mesh(geometry, material)

    mesh.position.x = Math.random() * 10 - 5
    mesh.position.y = Math.random() * 10 - 5
    mesh.position.z = Math.random() * 10 - 5

    mesh.scale.x = mesh.scale.y = mesh.scale.z = Math.random() * 3 + 1

    scene.add(mesh)

    spheres.push(mesh)
  }
  const width = window.innerWidth || 2
  const height = window.innerHeight || 2
  effect = new AnaglyphEffect(renderer)
  effect.setSize(width, height)
}

/** 创建地面 */
function initFloor() {
  const floorGeometry = new THREE.PlaneGeometry(5000, 5000, 1, 1)
  const floorMaterial = new THREE.MeshPhongMaterial({
    color: bg,
    shininess: 0,
  })

  const floor = new THREE.Mesh(floorGeometry, floorMaterial)
  floor.rotation.x = -0.5 * Math.PI
  floor.receiveShadow = true
  floor.position.y = dimian
  scene.add(floor)
}

function initStats() {
  stats = new Stats()
  statsRef.value.appendChild(stats.dom)
}

/** 初始化 */
function init() {
  initScene()
  initCamera()
  initRenderer()

  clock = new THREE.Clock()
  initMesh()
  initBubble()
  initParticle()
  initLight()
  initFloor()

  initStats()
  initScroll()
  update()
}

function update() {
  if (mixer) {
    // 更新动画 根据clock确保不会因为帧率导致动画变快或变慢
    mixer.update(clock.getDelta())
  }

  if (resizeRendererToDisplaySize(renderer)) {
    const canvas = renderer.domElement
    camera.aspect = canvas.clientWidth / canvas.clientHeight
    camera.updateProjectionMatrix() // 重新计算相机对象的投影矩阵值
  }
  // if (touched) {
  //   const innerWidthCenter = window.innerWidth / 2
  //   const innerHeightCenter = window.innerHeight / 2
  //   camera.position.x =
  //     ((mouseX - innerWidthCenter) * cameraXYZ[0]) / 200 + cameraXYZ[0]
  //   camera.position.y =
  //     ((mouseY - innerHeightCenter) * cameraXYZ[1]) / 1500 + cameraXYZ[1]
  // }
  // 计算相机位置
  // camera.position.x = radius * Math.sin(angle)
  // camera.position.z = radius * Math.cos(angle)
  // camera.lookAt(cube.position)

  // 增加角度，使相机绕着立方体旋转
  // angle += rotationSpeed
  updateBubble()
  updateParticle()
  // camera.lookAt(scene.position)
  // if (model) {
  //   camera.lookAt(model.position)
  // } else {
  //   camera.lookAt(scene.position)
  // }
  // camera.rotation.set(...cameraRotation1)
  camera.lookAt(
    mirrorOperations[0].lookAt.x,
    mirrorOperations[0].lookAt.y,
    mirrorOperations[0].lookAt.z,
  )
  // scrollFn()
  stats.update()

  renderer.render(scene, camera)
  requestAnimationFrame(update)
}

function updateParticle() {
  const time = Date.now() * 0.0005
  particles.forEach(item => {
    const x = Math.sin(time * item.x) * 30
    const y = Math.cos(time * item.y) * 40
    const z = Math.cos(time * item.z) * 30
    item.particle.position.set(x, y, z)
  })
}
function updateBubble() {
  const timer = 0.0001 * Date.now()

  for (let i = 0, il = spheres.length; i < il; i++) {
    const sphere = spheres[i]

    sphere.position.x = 11 * Math.cos(timer + i)
    sphere.position.y = 11 * Math.sin(timer + i * 1.1)
  }

  effect.render(scene, camera)
}
function resizeRendererToDisplaySize(renderer) {
  const canvas = renderer.domElement
  const width = window.innerWidth
  const height = window.innerHeight
  const canvasPixelWidth = canvas.width / window.devicePixelRatio
  const canvasPixelHeight = canvas.height / window.devicePixelRatio

  const needResize = canvasPixelWidth !== width || canvasPixelHeight !== height
  if (needResize) {
    renderer.setSize(width, height, false)
  }
  return needResize
}

function getMousePos(e) {
  return { x: e.clientX, y: e.clientY }
}

/**
 * 切换动画
 * @params form 当前执行的动画
 * @params fSpeed 当前动画过度到下一个动画的时间
 * @params to 下一个要执行的动画
 * @params tSpeed 下一个动画执行完成后回到当前动画的时间
 */
function playModifierAnimation(to) {
  if (to === currentAnim) return
  currentAnim.stop()
  currentAnim = to
  to.play()
}
function palyAnimation(index) {
  playModifierAnimation(possibleAnimsRef.value[index])
}

function initScroll() {
  gsap.to(camera.position, {
    motionPath: {
      path: mirrorOperations.map(item => item.position).slice(1),
    },
    scrollTrigger: {
      trigger: '.box2',
      start: 'top bottom',
      end: 'bottom bottom',
      scrub: true,
      // markers: true,
      id: 'scrub',
    },
  })
}
onMounted(() => {
  init()
  initSmoothScrolling()
})

// useEventListener(document, 'mousemove', e => {
//   touched = true
//   const mousecoords = getMousePos(e)
//   onDocumentMouseMove(mousecoords)
// })

// // You can use a ScrollTrigger in a tween or timeline
</script>

<template>
  <div>
    <div class="wrapper">
      <div ref="statsRef" class="stats"></div>
      <div class="buttons">
        <div
          v-for="(btn, index) in possibleAnimsRef"
          :key="index"
          class="button"
          @click="palyAnimation(index)"
        >
          <span>{{ btn._clip.name }}</span>
        </div>
      </div>
      <canvas id="c"></canvas>
    </div>
    <div class="footer">
      <div style="height: 100vh; background-color: aqua" class="box1"></div>
      <div style="height: 7000px; background-color: aqua" class="box2"></div>
      <div style="position: relative; z-index: 1; height: 50vh">你好</div>
    </div>
  </div>
</template>

<style scoped>
.wrapper {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.footer {
  position: relative;
  z-index: auto;
}

#c {
  position: absolute;
  top: 0;
  display: block;
  width: 100%;
  height: 100%;
}

.buttons {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 999;
}

.button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100px;
  height: 34px;
  margin-bottom: 10px;
  font-size: 16px;
  cursor: pointer;
  background-color: #fff;
  border: 1px solid #eee;
  border-radius: 8px;
}
</style>
