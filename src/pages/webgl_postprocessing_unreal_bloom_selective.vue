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
  const BLOOM_SCENE = 1

  const bloomLayer = new THREE.Layers()
  bloomLayer.set(BLOOM_SCENE)

  const params = {
    threshold: 0,
    strength: 1,
    radius: 0.5,
    exposure: 1,
  }
  const particles = []

  const darkMaterial = new THREE.MeshBasicMaterial({ color: 'black' })
  const materials = {}

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.toneMapping = THREE.ReinhardToneMapping
  document.body.appendChild(renderer.domElement)

  const bg = '#333'
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(bg)
  scene.fog = new THREE.Fog(bg, 60, 100) // 雾化效果
  const camera = new THREE.PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    1,
    200,
  )
  camera.position.set(0, 0, 20)
  camera.lookAt(0, 0, 0)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.maxPolarAngle = Math.PI * 0.5
  controls.minDistance = 1
  controls.maxDistance = 100
  controls.addEventListener('change', render)

  const renderScene = new RenderPass(scene, camera)

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5,
    0.4,
    0.85,
  )
  bloomPass.threshold = params.threshold
  bloomPass.strength = params.strength
  bloomPass.radius = params.radius

  const bloomComposer = new EffectComposer(renderer)
  // bloomComposer.renderToScreen = false
  bloomComposer.addPass(renderScene)
  bloomComposer.addPass(bloomPass)

  const mixPass = new ShaderPass(
    new THREE.ShaderMaterial({
      uniforms: {
        baseTexture: { value: null },
        bloomTexture: { value: bloomComposer.renderTarget2.texture },
      },
      vertexShader: `varying vec2 vUv;

void main() {

  vUv = uv;

  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

}`,
      fragmentShader: `uniform sampler2D baseTexture;
			uniform sampler2D bloomTexture;

			varying vec2 vUv;

			void main() {

				gl_FragColor = ( texture2D( baseTexture, vUv ) + vec4( 1.0 ) * texture2D( bloomTexture, vUv ) );

			}`,
      defines: {},
    }),
    'baseTexture',
  )
  mixPass.needsSwap = true

  const outputPass = new OutputPass()

  const finalComposer = new EffectComposer(renderer)
  finalComposer.addPass(renderScene)
  finalComposer.addPass(mixPass)
  finalComposer.addPass(outputPass)

  const raycaster = new THREE.Raycaster()

  const mouse = new THREE.Vector2()

  // window.addEventListener('pointerdown', onPointerDown)

  const gui = new GUI()

  const bloomFolder = gui.addFolder('bloom')

  bloomFolder.add(params, 'threshold', 0.0, 1.0).onChange(function (value) {
    bloomPass.threshold = Number(value)
    // render()
  })

  bloomFolder.add(params, 'strength', 0.0, 3).onChange(function (value) {
    bloomPass.strength = Number(value)
    // render()
  })

  bloomFolder
    .add(params, 'radius', 0.0, 1.0)
    .step(0.01)
    .onChange(function (value) {
      bloomPass.radius = Number(value)
      // render()
    })

  const toneMappingFolder = gui.addFolder('tone mapping')

  toneMappingFolder.add(params, 'exposure', 0.1, 2).onChange(function (value) {
    renderer.toneMappingExposure = value ** 4.0
    // render()
  })

  setupScene()

  function onPointerDown(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObjects(scene.children, false)
    if (intersects.length > 0) {
      const object = intersects[0].object
      object.layers.toggle(BLOOM_SCENE)
      // render()
    }
  }

  window.onresize = function () {
    const width = window.innerWidth
    const height = window.innerHeight

    camera.aspect = width / height
    camera.updateProjectionMatrix()

    renderer.setSize(width, height)

    bloomComposer.setSize(width, height)
    finalComposer.setSize(width, height)

    render()
  }
  function setupScene() {
    scene.traverse(disposeMaterial)
    scene.children.length = 0

    const geometry = new THREE.IcosahedronGeometry(1, 15)

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
      scene.add(sphere)
      particles.push({
        // particle,
        particle: sphere,
        x: Math.random(),
        y: Math.random(),
        z: Math.random(),
      })
      sphere.layers.set(BLOOM_SCENE)
    }

    // render()
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
  function disposeMaterial(obj) {
    if (obj.material) {
      obj.material.dispose()
    }
  }
  renderer.autoClear = false // 这个一定要加上 !!!!!!!
  function render() {
    updateGroundParticle()
    // render layer0 boom
    renderer.clear()
    camera.layers.set(0)
    bloomComposer.render()

    // render layer1 normal
    renderer.clearDepth()
    camera.layers.set(1)
    renderer.render(scene, camera)

    // scene.traverse(darkenNonBloomed)
    // camera.layers.set(1)
    // bloomComposer.render()
    // scene.traverse(restoreMaterial)

    // render the entire scene, then render bloom scene on top
    // finalComposer.render()
    // renderer.render()
    requestAnimationFrame(render)
  }

  function darkenNonBloomed(obj) {
    if (obj.isMesh && bloomLayer.test(obj.layers) === false) {
      materials[obj.uuid] = obj.material
      obj.material = darkMaterial
    }
  }

  function restoreMaterial(obj) {
    if (materials[obj.uuid]) {
      obj.material = materials[obj.uuid]
      delete materials[obj.uuid]
    }
  }
  render()
})
</script>

<template>
  <div id="info"></div>
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
