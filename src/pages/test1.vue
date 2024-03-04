<script setup>
import * as THREE from 'three'

import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { onMounted } from 'vue'

onMounted(() => {
  const el = document.getElementById('box')
  function initThree(options) {
    let scene, camera, renderer, viewer
    viewer = {}
    const width = el.offsetWidth
    const height = el.offsetHeight
    const asp = width / height
    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    el.append(renderer.domElement)
    renderer.setClearColor('#000')
    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(45, asp, 1, 10000)
    camera.position.set(10, 10, 10)
    camera.lookAt(0, 0, 0)
    scene.add(camera)
    viewer.scene = scene
    viewer.camera = camera
    viewer.renderer = renderer
    const controls = new OrbitControls(camera, renderer.domElement)
    // 如果使用animate方法时，将此函数删除
    controls.addEventListener('change', () => {
      renderer.render(scene, camera)
    })
    viewer.controls = controls
    renderer.render(scene, camera)

    return viewer
  }
  const app = new initThree()
  const scene = app.scene
  const renderer = app.renderer
  const camera = app.camera
  const controls = app.controls
  const clock = new THREE.Clock()

  const group1 = new THREE.Group()
  group1.layers.set(1)
  const group2 = new THREE.Group()

  scene.add(group1, group2)

  // add light
  const directionalLight = new THREE.DirectionalLight('#fff')
  directionalLight.position.set(30, 30, 30).normalize()
  scene.add(directionalLight)
  const ambientLight = new THREE.AmbientLight('#fff', 0.3) // obj 唯一 id
  scene.add(ambientLight)

  // add status
  /*  **** **** ****   ****/
  // renderer.toneMapping = THREE.ReinhardToneMapping;

  const box = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ color: 'red' }),
  )
  group1.add(box)
  // 如果是如果 需要 深度遍历 设置layers
  group1.traverse(e => {
    e.layers.set(1)
  })
  const geometry = new THREE.IcosahedronGeometry(1, 4)
  for (let i = 0; i < 10; i++) {
    const color = new THREE.Color()
    color.setHSL(Math.random(), 0.7, Math.random() * 0.2 + 0.05)

    const material = new THREE.MeshBasicMaterial({ color })
    const sphere = new THREE.Mesh(geometry, material)
    sphere.position.x = Math.random() * 10 - 5
    sphere.position.y = Math.random() * 10 - 5
    sphere.position.z = Math.random() * 10 - 5
    sphere.position.normalize().multiplyScalar(Math.random() * 4.0 + 2.0)
    sphere.scale.setScalar(Math.random() * Math.random() + 0.5)
    group2.add(sphere)

    // if ( Math.random() < 0.25 ) sphere.layers.enable( 2 ); // set layer
  }

  // 创建 RenderPass
  const renderScene = new RenderPass(scene, camera)

  // 创建 bloomPass
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(el.offsetWidth, el.offsetHeight),
    1.5,
    0.4,
    0.85,
  )
  // bloomPass.renderToScreen = true;
  bloomPass.renderToScreen = true
  bloomPass.threshold = 0
  bloomPass.strength = 5
  bloomPass.radius = 0

  // 创建 EffectComposer
  const bloomComposer = new EffectComposer(renderer)
  bloomComposer.setSize(el.offsetWidth, el.offsetHeight)
  bloomComposer.addPass(renderScene)
  // 眩光通道bloomPass插入到composer
  bloomComposer.addPass(bloomPass)

  bloomComposer.render()

  // set controls
  // controls.addEventListener( 'change', function () {
  //     bloomComposer.render()
  // } )
  // controls.autoRotate = false

  // when window resize
  renderer.autoClear = false // 这个一定要加上 !!!!!!!

  function render() {
    // render layer0 boom
    renderer.clear()
    camera.layers.set(0)
    bloomComposer.render()

    // render layer1 normal
    renderer.clearDepth()
    camera.layers.set(1)
    renderer.render(scene, camera)

    controls.update(clock.getDelta())
    requestAnimationFrame(render)
  }
  render()
})
</script>

<template>
  <div id="bo2x">
    <div id="box"></div>
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
