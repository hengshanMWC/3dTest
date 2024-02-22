<script setup>
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import Stats from 'three/addons/libs/stats.module.js'
import { useEventListener } from '@vueuse/core'
import { onMounted, ref } from 'vue'
import { AnaglyphEffect } from 'three/addons/effects/AnaglyphEffect.js'
import glb from './role03_walk_nostep.glb'

const bg = '#87110e'
let scene = null // 场景
const dimian = -12
let camera = null // 相机
// const material = null // 材质
let renderer = null // 渲染器对象
let controls = null //
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
const cameraXYZ = [0, -3, 40]
// const cameraXYZ = [0, -7.2857, 97.1428]

const touched = false
function onDocumentMouseMove(mousecoords) {
  mouseX = mousecoords.x
  mouseY = mousecoords.y
}

/** 创建场景 */
function initScene() {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(bg)
  // scene.fog = new THREE.Fog(bg, 60, 100) // 雾化效果
}

/** 创建相机 */
function initCamera() {
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    // 100,
  )
  camera.setFocalLength(85)
  camera.position.set(...cameraXYZ)
  camera.lookAt(0, 1, 0)
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
      model = gltf.scene

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

      // 拿到模型中自带的动画数据
      const fileAnimations = gltf.animations

      // 创建模型动作混合器
      mixer = new THREE.AnimationMixer(model)

      // 处理其他动画
      const clips = fileAnimations

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
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.61)
  hemiLight.position.set(0, 50, 0)
  // Add hemisphere light to scene
  scene.add(hemiLight)

  const d = 8.25
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.54)
  dirLight.position.set(-8, 12, 8)
  dirLight.castShadow = true
  dirLight.shadow.mapSize = new THREE.Vector2(1024, 1024)
  dirLight.shadow.camera.near = 0.1
  dirLight.shadow.camera.far = 1500
  dirLight.shadow.camera.left = d * -1
  dirLight.shadow.camera.right = d
  dirLight.shadow.camera.top = d
  dirLight.shadow.camera.bottom = d * -1
  // Add directional Light to scene
  scene.add(dirLight)
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
  const path = '/cube/pisa/'
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
function initDirectionalLight() {
  const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5)
  directionalLight.position.set(-5, 25, -1)
  directionalLight.castShadow = true
  directionalLight.shadow.camera.near = 0.01
  directionalLight.shadow.camera.far = 500
  directionalLight.shadow.camera.right = 30
  directionalLight.shadow.camera.left = -30
  directionalLight.shadow.camera.top = 30
  directionalLight.shadow.camera.bottom = -30
  directionalLight.shadow.mapSize.width = 1024
  directionalLight.shadow.mapSize.height = 1024
  directionalLight.shadow.radius = 4
  directionalLight.shadow.bias = -0.00006
  scene.add(directionalLight)
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
  if (touched) {
    const innerWidthCenter = window.innerWidth / 2
    const innerHeightCenter = window.innerHeight / 2
    camera.position.x =
      ((mouseX - innerWidthCenter) * cameraXYZ[0]) / 200 + cameraXYZ[0]
    camera.position.y =
      ((mouseY - innerHeightCenter) * cameraXYZ[1]) / 1500 + cameraXYZ[1]
  }

  //
  updateBubble()
  updateParticle()
  // camera.lookAt(scene.position)
  // if (model) {
  //   camera.lookAt(model.position)
  // } else {
  //   camera.lookAt(scene.position)
  // }
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
onMounted(() => {
  init()
})
// useEventListener(document, 'mousemove', e => {
//   touched = true
//   const mousecoords = getMousePos(e)
//   onDocumentMouseMove(mousecoords)
// })
</script>

<template>
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
</template>

<style scoped>
.wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
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
