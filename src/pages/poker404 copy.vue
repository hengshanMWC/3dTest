<script setup>
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import Stats from 'three/addons/libs/stats.module.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { AnaglyphEffect } from 'three/addons/effects/AnaglyphEffect.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { gsap } from 'gsap'
import Lenis from '@studio-freight/lenis'
import glb from '../asset/model/role03_all.glb'
import { AnimationGroup } from './animation'
import { mirrorOperations } from './mirrorOperations'

const bg = '#333'
let scene = null // 场景
const dimian = -11
let camera = null // 相机
let renderer = null // 渲染器对象
let controls = null //
let model = null
const isHelp = false
const mirrorOperationsIndex = 0
const spheres = []
let effect = null
const currentCameraLookAt = JSON.parse(
  JSON.stringify(mirrorOperations[mirrorOperationsIndex].lookAt),
)
const currentCameraPosition = JSON.parse(
  JSON.stringify(mirrorOperations[mirrorOperationsIndex].position),
)
window.currentCameraPosition = currentCameraPosition
window.currentCameraLookAt = currentCameraLookAt

let mixer = null
let clock = null
const statsRef = ref(null)
let stats = null
const particles = []
let lenis = null
let composerBloom
// 动作切换控制
let animationGroup = null

function handleLenisScrroll() {
  ScrollTrigger.update()
}
function initSmoothScrolling() {
  lenis = new Lenis({
    lerp: 0.1, // 值越小平滑效果越明显
    smoothWheel: true, // 为鼠标滚轮事件启用平滑滚动
  })
  // 每次用户滚动时更新ScrollTrigger
  lenis.on('scroll', handleLenisScrroll)
  // 每一帧动画执行
  const scrollFn = time => {
    lenis.raf(time) // lenis中requestAnimationFrame方法
    requestAnimationFrame(scrollFn) // 递归调用
  }
  // return scrollFn
  // 启用动画帧
  requestAnimationFrame(scrollFn)
}

/** 创建场景 */
function initScene() {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(bg)
  scene.fog = new THREE.Fog(bg, 60, 100) // 雾化效果
}

/** 创建相机 */
function initCamera() {
  // 场景
  scene = new THREE.Scene()
  // 相机
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    // 100000,
  )
  setCameraPosition()
  window.camera = camera
  // camera.position.set(50, 50, 50)
  // camera.position.y = 50
  // 渲染器
  const canvas = document.querySelector('#c')
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
  })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight)
  // 环境光
  const light = new THREE.AmbientLight(0xffffff, 0.6)
  light.layers.enable(0)
  light.layers.enable(1)
  scene.add(light)
  // 控制器
  const controls = new OrbitControls(camera, renderer.domElement)
  scene.add(new THREE.AxesHelper(100))
  window.onresize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight)
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
  }
}

function setCameraPosition() {
  camera.position.set(
    currentCameraPosition.x,
    currentCameraPosition.y,
    currentCameraPosition.z,
  )
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
  renderer.setSize(window.innerWidth, window.innerHeight)
}
function initControls() {
  controls = new OrbitControls(camera, renderer.domElement)
  scene.add(new THREE.AxesHelper(100))
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

  loader.load(
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

      model.scale.set(10, 10, 10)
      model.position.y = dimian

      scene.add(model)

      // 创建模型动作混合器
      mixer = new THREE.AnimationMixer(model)

      // 拿到模型中自带的动画数据
      const clips = gltf.animations.slice(0, -1)

      // 遍历动画列表并生成操作对象存储起来
      const possibleAnims = clips.map(val => {
        let clip = THREE.AnimationClip.findByName(clips, val.name)

        clip = mixer.clipAction(clip)
        // clip.setLoop(THREE.LoopOnce)
        return clip
      })

      // window.possibleAnims = possibleAnims
      // const prev = 3
      // const next = 0
      // possibleAnims[prev].play()
      // const t = 2
      // const value = possibleAnims[prev].getClip().duration
      // setTimeout(
      //   () => {
      //     possibleAnims[next].play().crossFadeFrom(possibleAnims[prev], t)
      //   },
      //   (value - t) * 1000,
      // )
      /**
       * 初始为走路
       * 按键以后甩剑并进入站立idle
       * 再按键通过walk_read回到walk(走路)的状态
       * walk  -  walk_swor  -  idle  -  walk_read  - walk
       */
      // 按键以后甩剑并进入站立idle
      const possibleAnimsIdle = [possibleAnims[3], possibleAnims[0]]
      // 再按键通过walk_read回到walk(走路)的状态
      const possibleAnimsWalk = [possibleAnims[2], possibleAnims[1]]
      const currentAnim = possibleAnimsWalk[1]
      animationGroup = new AnimationGroup(
        mixer,
        [possibleAnimsWalk, possibleAnimsIdle],
        currentAnim,
      )
      window.animationGroup = animationGroup
    },
    undefined, // We don't need this function
    error => {
      console.error(error)
    },
  )
}
function enableAll(item) {
  item.layers.enable(0)
  item.layers.enable(1)
}
/** 创建光源 */
function initLight() {
  const light = new THREE.AmbientLight(0xffffff, 0.6)
  light.layers.enable(0)
  light.layers.enable(1)
  scene.add(light)
}

function initGroundParticle() {
  const geometry = new THREE.IcosahedronGeometry(1, 15)
  const mtl = new THREE.MeshLambertMaterial({ color: 0xf5bc6a })
  for (let i = 0; i < 1; i++) {
    const particle = new THREE.Mesh(geometry, mtl)
    particles.push({
      particle,
      x: Math.random(),
      y: Math.random(),
      z: Math.random(),
    })
    particle.layers.set(1)
    scene.add(particle)
  }
  window.particles = particles
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

  // 加载GLB模型作为地面
  // const loader = new GLTFLoader()
  // loader.load(showstandGlb, function (gltf) {
  //   const ground = gltf.scene
  //   const scale = 4
  //   // 调整地面位置和缩放
  //   ground.position.set(0, dimian + 1, 0)
  //   ground.scale.set(scale, scale, scale) // 根据需要调整缩放
  //   window.ground = ground
  //   scene.add(ground)
  // })
}

function initBloomPass() {
  const params = {
    exposure: 0,
    bloomStrength: 1.5,
    bloomThreshold: 0,
    bloomRadius: 0,
  }
  composerBloom = new EffectComposer(renderer)

  const renderScene = new RenderPass(scene, camera)
  // 光晕
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    3,
    0.4,
    0.85,
  )
  bloomPass.threshold = params.bloomThreshold
  bloomPass.strength = params.bloomStrength
  bloomPass.radius = params.bloomRadius
  composerBloom.addPass(renderScene)
  composerBloom.addPass(bloomPass)
}
function initBubble() {
  const geometry = new THREE.SphereGeometry(0.2, 32, 16)
  const material = new THREE.MeshBasicMaterial({
    color: 0x000000,
  })

  for (let i = 0; i < 5; i++) {
    const mesh = new THREE.Mesh(geometry, material)

    mesh.position.x = Math.random() * 10 - 5
    mesh.position.y = Math.random() * 10 - 5
    mesh.position.z = Math.random() * 10 - 20

    mesh.scale.x = mesh.scale.y = mesh.scale.z = Math.random() * 3 + 1

    scene.add(mesh)

    spheres.push(mesh)
  }
  const width = window.innerWidth || 2
  const height = window.innerHeight || 2
  effect = new AnaglyphEffect(renderer)
  effect.setSize(width, height)
}

function initStats() {
  stats = new Stats()
  statsRef.value.appendChild(stats.dom)
}

/** 初始化 */
function init() {
  // initScene()
  initCamera()
  // initRenderer()
  initBloomPass()

  clock = new THREE.Clock()
  // initFloor()
  // initMesh()
  // initBubble()
  initGroundParticle()
  // initLight()

  // initStats()
  // initControls()
  // initScroll()
  // initSmoothScrolling()
  update()
}
function updateMixer() {
  if (mixer) {
    // 更新动画 根据clock确保不会因为帧率导致动画变快或变慢
    mixer.update(clock.getDelta())
  }
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
function update() {
  // updateMixer()

  // if (resizeRendererToDisplaySize(renderer)) {
  //   const canvas = renderer.domElement
  //   camera.aspect = canvas.clientWidth / canvas.clientHeight
  //   camera.updateProjectionMatrix() // 重新计算相机对象的投影矩阵值
  // }
  // camera.lookAt(
  //   currentCameraLookAt.x,
  //   currentCameraLookAt.y,
  //   currentCameraLookAt.z,
  // )
  // setCameraPosition()

  // updateSpark()
  // updateGroundParticle()
  // updateBubble()
  // stats.update()

  renderer.autoClear = false
  renderer.clear()
  camera.layers.set(1)
  composerBloom.render()

  renderer.clearDepth() // 清除深度缓存

  camera.layers.set(0)
  renderer.render(scene, camera)
  // updateBloom()
  requestAnimationFrame(update)
}

function updateGroundParticle() {
  const time = Date.now() * 0.0005
  particles.forEach(item => {
    const x = Math.sin(time * item.x) * 30
    const y = Math.cos(time * item.y) * 40
    const z = Math.cos(time * item.z) * 30
    item.particle.position.set(x, y, z)
  })
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

function handleActivate() {
  animationGroup.start()
}

function initScroll() {
  const options = {
    // ease: 'none',
    scrollTrigger: {
      trigger: '.box2',
      start: 'top bottom',
      end: 'bottom bottom',
      scrub: true,
      // markers: true,
      id: 'scrub',
    },
  }
  const tlLookAt = gsap.timeline(options)
  const tlPosition = gsap.timeline(options)
  mirrorOperations.forEach(mirrorOperation => {
    tlLookAt.to(currentCameraLookAt, {
      ...mirrorOperation.lookAt,
    })
    tlPosition.to(camera.position, {
      ...mirrorOperation.position,
    })
  })
}
onMounted(() => {
  init()
})
onBeforeUnmount(() => {
  cancelAnimationFrame(update)
  lenis.off('scroll', handleLenisScrroll)
  scene.remove(...scene.children)
})
</script>

<template>
  <div>
    <div class="wrapper">
      <div ref="statsRef" class="stats"></div>
      <div class="buttons">
        <!-- <div
          v-for="(btn, index) in possibleAnimsRef"
          :key="index"
          class="button"
          @click="palyAnimation(index)"
        >
          <span>{{ btn._clip.name }}</span>
        </div> -->
        <div class="button" @click="handleActivate">
          <span>activate</span>
        </div>
      </div>
      <canvas id="c"></canvas>
    </div>
    <div class="footer">
      <!-- <div style="height: 100vh; background-color: aqua" class="box1"></div> -->
      <div style="height: 7000px; background-color: aqua" class="box2"></div>
      <!-- <div style="position: relative; z-index: 1; height: 50vh">你好</div> -->
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
