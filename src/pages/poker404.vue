<script setup>
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import Stats from 'three/addons/libs/stats.module.js'

import { onBeforeUnmount, onMounted, ref } from 'vue'

import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { gsap } from 'gsap'
import Lenis from '@studio-freight/lenis'
import glb from '../asset/model/role03_all.glb'
import { AnimationGroup } from './animation'
import { mirrorOperations } from './mirrorOperations'

const bg = '#333'
let scene = null // 场景
const dimian = -5
let camera = null // 相机
let renderer = null // 渲染器对象
let controls = null //
let model = null
const isHelp = false
const mirrorOperationsIndex = 0
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
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    // 100,
  )
  setCameraPosition()
  window.camera = camera
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
}
function initControls() {
  controls = new OrbitControls(camera, renderer.domElement)
  controls.maxPolarAngle = Math.PI / 2
  controls.minPolarAngle = Math.PI / 3
  controls.enableDamping = true
  controls.enablePan = false
  controls.dampingFactor = 0.1
  controls.autoRotate = false // Toggle this if you'd like the chair to automatically rotate
  controls.autoRotateSpeed = 0.2 // 30
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
/** 创建光源 */
function initLight() {
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 1)
  hemiLight.position.set(0, 50, 0)
  scene.add(hemiLight)
  // 阴影
  const d = 8.25
  const dirLightShadow = new THREE.DirectionalLight(0xffffff, 0.5)
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
  const dirLightLeft = new THREE.DirectionalLight(0x50b2df, 3)
  window.dirLightLeft = dirLightLeft
  dirLightLeft.position.set(-7, 0, 3)
  const targetLeftObject = new THREE.Object3D()
  targetLeftObject.position.set(0, 0, -3)
  window.targetLeftObject = targetLeftObject
  dirLightLeft.target = targetLeftObject
  if (isHelp) {
    const helperLeft = new THREE.DirectionalLightHelper(dirLightLeft, 1)
    scene.add(helperLeft)
  }
  scene.add(targetLeftObject)
  scene.add(dirLightLeft)
  // 右黄光
  const dirRightFront = new THREE.DirectionalLight(0xf5b768, 10)
  window.dirRightFront = dirRightFront
  dirRightFront.position.set(7, 5, 0)
  const targetRightObject = new THREE.Object3D()
  targetRightObject.position.set(0, 5, 2)
  window.targetRightObject = targetRightObject
  scene.add(targetRightObject)

  dirRightFront.target = targetRightObject
  if (isHelp) {
    const helperRight = new THREE.DirectionalLightHelper(dirRightFront, 1)
    scene.add(helperRight)
  }
  scene.add(dirRightFront)
  // 正面光
  const dirLightFront = new THREE.DirectionalLight(0xeebe8f, 5)
  window.dirLightFront = dirLightFront
  dirLightFront.position.set(5, 7, 5)
  const targetFrontObject = new THREE.Object3D()
  targetFrontObject.position.set(2, 7, 0)
  window.targetFrontObject = targetFrontObject
  scene.add(targetFrontObject)

  dirLightFront.target = targetFrontObject
  if (isHelp) {
    const helperFront = new THREE.DirectionalLightHelper(dirLightFront, 1)
    scene.add(helperFront)
  }
  scene.add(dirLightFront)
  // 背面光
  const dirLightVerso = new THREE.DirectionalLight(0x50b2df, 1)
  window.dirLightVerso = dirLightVerso
  dirLightVerso.position.set(0, 4, -8)
  const targetVersoObject = new THREE.Object3D()
  targetVersoObject.position.set(6, 4, 0)
  window.targetVersoObject = targetVersoObject
  scene.add(targetVersoObject)

  dirLightVerso.target = targetVersoObject
  if (isHelp) {
    const helperVerson = new THREE.DirectionalLightHelper(dirLightVerso, 1)
    scene.add(helperVerson)
  }
  scene.add(dirLightVerso)
}

function initGroundParticle() {
  const sphere = new THREE.SphereGeometry(0.2, 8, 4)
  const intensity = 100
  const bg = 0xf5bc6a
  for (let i = 0; i < 10; i++) {
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
  initFloor()
  initMesh()
  initGroundParticle()
  initLight()

  initStats()
  // initControls()
  initScroll()
  initSmoothScrolling()
  update()
}
function updateMixer() {
  if (mixer) {
    // 更新动画 根据clock确保不会因为帧率导致动画变快或变慢
    mixer.update(clock.getDelta())
  }
}
function update() {
  updateMixer()

  if (resizeRendererToDisplaySize(renderer)) {
    const canvas = renderer.domElement
    camera.aspect = canvas.clientWidth / canvas.clientHeight
    camera.updateProjectionMatrix() // 重新计算相机对象的投影矩阵值
  }
  updateGroundParticle()
  camera.lookAt(
    currentCameraLookAt.x,
    currentCameraLookAt.y,
    currentCameraLookAt.z,
  )
  // setCameraPosition()

  // updateSpark()
  stats.update()

  renderer.render(scene, camera)
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
