<script setup>
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import Stats from 'three/addons/libs/stats.module.js'

import { onBeforeUnmount, onMounted, ref } from 'vue'
import { AnaglyphEffect } from 'three/addons/effects/AnaglyphEffect.js'

import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { gsap } from 'gsap'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import Lenis from '@studio-freight/lenis'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js'
import glb from '../asset/model/role03_all.glb'
import { AnimationGroup } from './animation'
import { mirrorOperations } from './mirrorOperations'

const bg = '#333'
const lizibg = 0xf5bc6a
let scene = null // 场景
const dimian = -11
let camera = null // 相机
let renderer = null // 渲染器对象
let controls = null //
let model = null
const isHelp = false
const mirrorOperationsIndex = 0
const spheres = []
// const effect = null
const effectFXAA = null
const currentCameraLookAt = JSON.parse(
  JSON.stringify(mirrorOperations[mirrorOperationsIndex].lookAt),
)
const currentCameraPosition = JSON.parse(
  JSON.stringify(mirrorOperations[mirrorOperationsIndex].position),
)
let composer, finalComposer, outlinePass

let mixer = null
let clock = null
const statsRef = ref(null)
let stats = null
const particles = []
let lenis = null
// 动作切换控制
let animationGroup = null
window.addEventListener('resize', onWindowResize)
function onWindowResize() {
  const width = window.innerWidth
  const height = window.innerHeight

  camera.aspect = width / height
  camera.updateProjectionMatrix()

  renderer.setSize(width, height)
  composer.setSize(width, height)

  effectFXAA.uniforms.resolution.value.set(
    1 / window.innerWidth,
    1 / window.innerHeight,
  )
}
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
  // scene.backgroundBlurriness = 0.5
  scene.fog = new THREE.Fog(bg, 60, 100) // 雾化效果
}

/** 创建相机 */
function initCamera() {
  // 场景
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
  const width = window.innerWidth
  const height = window.innerHeight
  const canvas = document.querySelector('#c')
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true, // 抗齿距
  })
  renderer.shadowMap.enabled = true // 投射阴影
  renderer.setSize(width, height)
  renderer.setPixelRatio(window.devicePixelRatio)
}
function initControls() {
  controls = new OrbitControls(camera, renderer.domElement)
  controls.minDistance = 5
  controls.maxDistance = 20
  controls.enablePan = false
  controls.enableDamping = true
  controls.dampingFactor = 0.05
}
function random(min, max) {
  return Number.parseInt(Math.random() * (max - min) + min)
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
      // model.layers.set(1)
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
function initGroundParticle() {
  const geometry = new THREE.IcosahedronGeometry(0.04, 15)
  const mtl = new THREE.MeshLambertMaterial({ color: lizibg })
  // const mtl = new THREE.MeshBasicMaterial({ color: 0xf5bc6a })
  const intensity = 10
  for (let i = 0; i < 15; i++) {
    const particle = new THREE.PointLight(lizibg, intensity)
    const mesh = new THREE.Mesh(geometry, mtl)
    particle.add(mesh)
    particles.push({
      particle,
      // particle: mesh,
      x: Math.random(),
      y: Math.random(),
      z: Math.random(),
    })
    scene.add(particle)
    outlinePass.selectedObjects.push(mesh)
  }
  // outlinePass.selectedObjects.push(...particles.map(item => item.particle))
  window.outlinePass = outlinePass
  window.particles = particles
}
function setLayoutEnable(item) {
  item.layers.enable(0)
  item.layers.enable(1)
}
/** 创建光源 */
function initLight() {
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 1)
  hemiLight.position.set(0, 50, 0)
  // setLayoutEnable(hemiLight)
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
  dirLightLeft.position.set(-7, 0, 3)
  const targetLeftObject = new THREE.Object3D()
  targetLeftObject.position.set(0, 0, -3)
  dirLightLeft.target = targetLeftObject
  if (isHelp) {
    const helperLeft = new THREE.DirectionalLightHelper(dirLightLeft, 1)
    scene.add(helperLeft)
  }
  scene.add(targetLeftObject)
  scene.add(dirLightLeft)
  // 右黄光
  const dirRightFront = new THREE.DirectionalLight(0xf5b768, 10)
  dirRightFront.position.set(7, 5, 0)
  const targetRightObject = new THREE.Object3D()
  targetRightObject.position.set(0, 5, 2)

  dirRightFront.target = targetRightObject
  if (isHelp) {
    const helperRight = new THREE.DirectionalLightHelper(dirRightFront, 1)
    scene.add(helperRight)
  }
  scene.add(targetRightObject)
  scene.add(dirRightFront)
  // 正面光
  const dirLightFront = new THREE.DirectionalLight(0xeebe8f, 5)
  dirLightFront.position.set(5, 7, 5)
  const targetFrontObject = new THREE.Object3D()
  targetFrontObject.position.set(2, 7, 0)

  dirLightFront.target = targetFrontObject
  if (isHelp) {
    const helperFront = new THREE.DirectionalLightHelper(dirLightFront, 1)
    scene.add(helperFront)
  }
  scene.add(targetFrontObject)
  scene.add(dirLightFront)
  // 背面光
  const dirLightVerso = new THREE.DirectionalLight(0x50b2df, 1)
  dirLightVerso.position.set(0, 4, -8)
  const targetVersoObject = new THREE.Object3D()
  targetVersoObject.position.set(6, 4, 0)

  dirLightVerso.target = targetVersoObject
  if (isHelp) {
    const helperVerson = new THREE.DirectionalLightHelper(dirLightVerso, 1)
    scene.add(helperVerson)
  }
  scene.add(targetVersoObject)
  scene.add(dirLightVerso)
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
  // const width = window.innerWidth || 2
  // const height = window.innerHeight || 2
  // effect = new AnaglyphEffect(renderer)
  // effect.setSize(width, height)
}

function initStats() {
  stats = new Stats()
  statsRef.value.appendChild(stats.dom)
}
function initBloomPass() {
  // const params = {
  //   threshold: 0.15,
  //   strength: 0.6,
  //   radius: 0.27,
  //   exposure: 1,
  // }
  composer = new EffectComposer(renderer)

  const renderPass = new RenderPass(scene, camera)
  composer.addPass(renderPass)
  const outputPass = new OutputPass()
  composer.addPass(outputPass)
  outlinePass = new OutlinePass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    scene,
    camera,
  )
  outlinePass.edgeStrength = 1 // 宽度
  outlinePass.edgeGlow = 10 // 辉光
  outlinePass.edgeThickness = 1 // 清晰度
  outlinePass.pulsePeriod = 3 // 脉冲周期
  outlinePass.visibleEdgeColor = new THREE.Color(lizibg)

  composer.addPass(outlinePass)

  // effectFXAA = new ShaderPass(FXAAShader)
  // effectFXAA.uniforms.resolution.value.set(
  //   1 / window.innerWidth,
  //   1 / window.innerHeight,
  // )
  // composer.addPass(effectFXAA)
  // 光晕
  // const bloomPass = new UnrealBloomPass(
  //   new THREE.Vector2(window.innerWidth, window.innerHeight),
  //   1,
  //   0.4,
  //   0.85,
  // )
  // bloomPass.threshold = params.threshold
  // bloomPass.strength = params.strength
  // bloomPass.radius = params.radius
  // bloomPass.exposure = params.exposure
  // composer.addPass(renderPass)
  // composer.addPass(bloomPass)
  // window.bloomPass = bloomPass
  // const effectFXAA = new ShaderPass(FXAAShader)
  // effectFXAA.uniforms.resolution.value.set(
  //   1 / window.innerWidth,
  //   1 / window.innerHeight,
  // )
  // const mixPass = new ShaderPass(
  //   new THREE.ShaderMaterial({
  //     uniforms: {
  //       baseTexture: { value: null },
  //       bloomTexture: { value: composer.renderTarget2.texture },
  //     },
  //     vertexShader: `varying vec2 vUv;

  // void main() {

  //   vUv = uv;

  //   gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

  // }`,
  //     fragmentShader: `uniform sampler2D baseTexture;
  // 			uniform sampler2D bloomTexture;

  // 			varying vec2 vUv;

  // 			void main() {

  // 				gl_FragColor = ( texture2D( baseTexture, vUv ) + vec4( 1.0 ) * texture2D( bloomTexture, vUv ) );

  // 			}`,
  //     defines: {},
  //   }),
  //   'baseTexture',
  // )
  // mixPass.needsSwap = true
  // composer.addPass(mixPass)

  //   const outputPass = new OutputPass()

  //   finalComposer = new EffectComposer(renderer)
  //   finalComposer.addPass(renderPass)
  //   finalComposer.addPass(mixPass)
  //   finalComposer.addPass(outputPass)
  // const gui = new GUI()

  // const bloomFolder = gui.addFolder('bloom')

  // bloomFolder.add(params, 'threshold', 0.0, 1.0).onChange(function (value) {
  //   bloomPass.threshold = Number(value)
  //   // update()
  // })

  // bloomFolder.add(params, 'strength', 0.0, 3).onChange(function (value) {
  //   bloomPass.strength = Number(value)
  //   // update()
  // })

  // bloomFolder
  //   .add(params, 'radius', 0.0, 1.0)
  //   .step(0.01)
  //   .onChange(function (value) {
  //     bloomPass.radius = Number(value)
  //     // update()
  //   })

  // const toneMappingFolder = gui.addFolder('tone mapping')

  // toneMappingFolder.add(params, 'exposure', 0.1, 2).onChange(function (value) {
  //   renderer.toneMappingExposure = value ** 4.0
  //   // update()
  // })
}
/** 初始化 */
function init() {
  initScene()
  initCamera()
  initRenderer()
  initBloomPass()

  clock = new THREE.Clock()
  initFloor()
  initMesh()
  initBubble()
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
function updateBubble() {
  const timer = 0.0001 * Date.now()

  for (let i = 0, il = spheres.length; i < il; i++) {
    const sphere = spheres[i]

    sphere.position.x = 11 * Math.cos(timer + i)
    sphere.position.y = 11 * Math.sin(timer + i * 1.1)
  }

  // effect.render(scene, camera)
}
function update() {
  updateMixer()

  // if (resizeRendererToDisplaySize(renderer)) {
  //   const canvas = renderer.domElement
  //   camera.aspect = canvas.clientWidth / canvas.clientHeight
  //   camera.updateProjectionMatrix() // 重新计算相机对象的投影矩阵值
  // }
  camera.lookAt(
    currentCameraLookAt.x,
    currentCameraLookAt.y,
    currentCameraLookAt.z,
  )
  // setCameraPosition()

  // updateSpark()
  updateGroundParticle()
  updateBubble()
  stats.update()

  // renderer.clear()
  // camera.layers.set(1)
  composer.render()

  // renderer.clearDepth() // 清除深度缓存

  // camera.layers.set(0)
  // renderer.render(scene, camera)
  requestAnimationFrame(update)
}

function updateGroundParticle() {
  const time = Date.now() * 0.0007
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
  scene.remove(...scene.children)
  window.removeEventListener('resize', onWindowResize)
  lenis.off('scroll', handleLenisScrroll)
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
