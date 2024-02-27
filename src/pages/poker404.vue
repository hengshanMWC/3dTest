<script setup>
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import Stats from 'three/addons/libs/stats.module.js'
import { useEventListener } from '@vueuse/core'
import { computed, onMounted, ref } from 'vue'
import { AnaglyphEffect } from 'three/addons/effects/AnaglyphEffect.js'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { gsap } from 'gsap'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import Lenis from '@studio-freight/lenis'
import glb from '../asset/model/role03_all.glb'
import showstandGlb from '../asset/model/role00_showstand_01.glb'
import mirrorOperations from './mirrorOperations.json'

gsap.registerPlugin(ScrollTrigger, MotionPathPlugin)
const bg = '#333'
let scene = null // 场景
const dimian = -12
let camera = null // 相机
// const material = null // 材质
let renderer = null // 渲染器对象
let controls = null //
let currentAnim = null
let model = null

const possibleAnimsRef = ref([])
// 按键以后甩剑并进入站立idle
const possibleAnimsIdleRef = ref([])
// 再按键通过walk_read回到walk(走路)的状态
const possibleAnimsWalkRef = ref([])
// 0: walk,1: idle
let currentPossibleAnimsStatus = 0
let activateCallback = null
const activateId = 0
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

      model.scale.set(10, 10, 10)
      model.position.y = dimian + 1

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
      console.log('possibleAnims', possibleAnims)
      possibleAnimsRef.value = [
        possibleAnims[1],
        possibleAnims[3],
        possibleAnims[0],
        possibleAnims[2],
      ]
      /**
       * 初始为走路
       * 按键以后甩剑并进入站立idle
       * 再按键通过walk_read回到walk(走路)的状态
       * walk  -  walk_swor  -  idle  -  walk_read  - walk
       */
      // 按键以后甩剑并进入站立idle
      possibleAnimsIdleRef.value = window.possibleAnimsIdleRef = [
        possibleAnims[3],
        possibleAnims[0],
      ]
      // 再按键通过walk_read回到walk(走路)的状态
      possibleAnimsWalkRef.value = window.possibleAnimsWalkRef = [
        possibleAnims[2],
        possibleAnims[1],
      ]
      // 初始为走路
      window.vv = currentAnim = possibleAnimsWalkRef.value[1]
      currentAnim.play() // 播放空闲动画
      // mixer.addEventListener('finished', continuousAnimation)
    },
    undefined, // We don't need this function
    error => {
      console.error(error)
    },
  )
}

// function continuousAnimation() {
//   const nextAnim = getAnimationLoopNext()
//   currentAnim.stop()
//   currentAnim = nextAnim.play()
// }

function getAnimationMaxIndex(possibleAnims) {
  // 找到目前动作的index
  const index = possibleAnims.findIndex(
    possibleAnim => possibleAnim === currentAnim,
  )
  // index 如果是最后一个，那就回到第一个动作
  if (index === possibleAnims.length - 1) {
    return index
  } else {
    // 下一个动作
    return index + 1
  }
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
  const dirLightLeft = new THREE.DirectionalLight(0x5786cf, 3)
  window.dirLightLeft = dirLightLeft
  dirLightLeft.position.set(-7, 0, 1)
  const targetLeftObject = new THREE.Object3D()
  targetLeftObject.position.set(6, 7, 3)
  window.targetLeftObject = targetLeftObject
  // const helperLeft = new THREE.DirectionalLightHelper(dirLightLeft, 1)
  // scene.add(helperLeft)
  scene.add(targetLeftObject)
  scene.add(dirLightLeft)
  // 正面光
  const dirLightFront = new THREE.DirectionalLight(0xeebe8f, 8)
  window.dirLightFront = dirLightFront
  dirLightFront.position.set(5, 7, 5)
  const targetFrontObject = new THREE.Object3D()
  targetFrontObject.position.set(2, 7, 0)
  window.targetFrontObject = targetFrontObject
  scene.add(targetFrontObject)

  dirLightFront.target = targetFrontObject

  // const helperFront = new THREE.DirectionalLightHelper(dirLightFront, 1)
  // scene.add(helperFront)
  scene.add(dirLightFront)
  // 背面光
  const dirLightVerso = new THREE.DirectionalLight(0xeebe8f, 6)
  window.dirLightVerso = dirLightVerso
  dirLightVerso.position.set(0, 4, -8)
  const targetVersoObject = new THREE.Object3D()
  targetVersoObject.position.set(0, 4, 0)
  window.targetVersoObject = targetVersoObject
  scene.add(targetVersoObject)

  dirLightVerso.target = targetVersoObject

  // const helperVerson = new THREE.DirectionalLightHelper(dirLightVerso, 1)
  // scene.add(helperVerson)
  scene.add(dirLightVerso)
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

  // 加载GLB模型作为地面
  const loader = new GLTFLoader()
  loader.load(showstandGlb, function (gltf) {
    const ground = gltf.scene
    // 调整地面位置和缩放
    ground.position.set(0, dimian + 1, 0)
    ground.scale.set(3, 3, 3) // 根据需要调整缩放
    window.ground = ground
    scene.add(ground)
  })
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
  // initControls()

  clock = new THREE.Clock()
  initFloor()
  initMesh()
  // initBubble()
  // initParticle()
  initLight()

  initStats()
  initScroll()
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
  // updateBubble()
  // updateParticle()
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
function handleActivate() {
  let currentPossibleAnims = []
  if (currentPossibleAnimsStatus === 0) {
    currentPossibleAnims = possibleAnimsIdleRef.value
    currentPossibleAnimsStatus = 1
  } else {
    currentPossibleAnims = possibleAnimsWalkRef.value
    currentPossibleAnimsStatus = 0
  }
  window.currentPossibleAnims = currentPossibleAnims
  currentAnim.setLoop(THREE.LoopOnce)

  function continuousAnimation() {
    const maxIndex = getAnimationMaxIndex(currentPossibleAnims)
    const maxAnim = currentPossibleAnims[maxIndex]
    currentAnim.setLoop(THREE.LoopRepeat)
    currentAnim.stop()
    if (maxAnim === currentAnim) {
      mixer.removeEventListener('finished', activateCallback)
    } else {
      maxAnim.setLoop(THREE.LoopOnce)
      currentAnim = maxAnim
    }
    currentAnim.play()
  }

  mixer.removeEventListener('finished', activateCallback)
  activateCallback = continuousAnimation
  mixer.addEventListener('finished', continuousAnimation)
}
/**
 * 切换动画
 * @params form 当前执行的动画
 * @params fSpeed 当前动画过度到下一个动画的时间
 * @params to 下一个要执行的动画
 * @params tSpeed 下一个动画执行完成后回到当前动画的时间
 */
// function playModifierAnimation(to) {
//   if (to === currentAnim) return
//   currentAnim.stop()
//   currentAnim = to
//   to.play()
// }
// function palyAnimation(index) {
//   playModifierAnimation(possibleAnimsRef.value[index])
// }

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
