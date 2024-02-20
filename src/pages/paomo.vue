<script setup>
import { onMounted } from 'vue'
import * as THREE from 'three'
import { AnaglyphEffect } from 'three/addons/effects/AnaglyphEffect.js'

onMounted(() => {
  let container, camera, scene, renderer, effect

  const spheres = []

  let mouseX = 0
  let mouseY = 0

  let windowHalfX = window.innerWidth / 2
  let windowHalfY = window.innerHeight / 2

  document.addEventListener('mousemove', onDocumentMouseMove)

  init()
  animate()

  async function init() {
    container = document.createElement('div')
    document.body.appendChild(container)

    camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.01,
      100,
    )
    camera.position.z = 3

    const path = '/pisa/'
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

    scene = new THREE.Scene()
    scene.background = textureCube

    const geometry = new THREE.SphereGeometry(0.1, 32, 16)
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      envMap: textureCube,
    })

    for (let i = 0; i < 500; i++) {
      const mesh = new THREE.Mesh(geometry, material)

      mesh.position.x = Math.random() * 10 - 5
      mesh.position.y = Math.random() * 10 - 5
      mesh.position.z = Math.random() * 10 - 5

      mesh.scale.x = mesh.scale.y = mesh.scale.z = Math.random() * 3 + 1

      scene.add(mesh)

      spheres.push(mesh)
    }

    //

    renderer = new THREE.WebGLRenderer()
    renderer.setPixelRatio(window.devicePixelRatio)
    container.appendChild(renderer.domElement)

    const width = window.innerWidth || 2
    const height = window.innerHeight || 2

    effect = new AnaglyphEffect(renderer)
    effect.setSize(width, height)

    //

    window.addEventListener('resize', onWindowResize)
  }

  function onWindowResize() {
    windowHalfX = window.innerWidth / 2
    windowHalfY = window.innerHeight / 2

    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()

    effect.setSize(window.innerWidth, window.innerHeight)
  }

  function onDocumentMouseMove(event) {
    mouseX = (event.clientX - windowHalfX) / 100
    mouseY = (event.clientY - windowHalfY) / 100
  }

  //

  function animate() {
    requestAnimationFrame(animate)

    render()
  }

  function render() {
    const timer = 0.0001 * Date.now()

    camera.position.x += (mouseX - camera.position.x) * 0.05
    camera.position.y += (-mouseY - camera.position.y) * 0.05

    camera.lookAt(scene.position)

    for (let i = 0, il = spheres.length; i < il; i++) {
      const sphere = spheres[i]

      sphere.position.x = 5 * Math.cos(timer + i)
      sphere.position.y = 5 * Math.sin(timer + i * 1.1)
    }

    effect.render(scene, camera)
  }
})
</script>

<template>
  <div id="info">
    <a href="https://threejs.org" target="_blank" rel="noopener">three.js</a> -
    effects - anaglyph<br />
    skybox by
    <a href="https://www.pauldebevec.com/" target="_blank" rel="noopener"
      >Paul Debevec</a
    >
  </div>
</template>

<style scoped>
body {
  margin: 0;
  overscroll-behavior: none;
  font-family: monospace;
  font-size: 13px;
  line-height: 24px;
  color: #fff;
  background-color: #000;
}

a {
  color: #ff0;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

button {
  text-transform: uppercase;
  cursor: pointer;
}

#info {
  position: absolute;
  top: 0;
  z-index: 1; /* TODO Solve this in HTML */
  box-sizing: border-box;
  width: 100%;
  padding: 10px;
  text-align: center;
  pointer-events: none;
  user-select: none;
}

a,
button,
input,
select {
  pointer-events: auto;
}

.lil-gui {
  z-index: 2 !important; /* TODO Solve this in HTML */
}

@media all and (width <= 640px) {
  .lil-gui.root {
    inset: auto auto 0 0;
    max-width: 80%;
    max-height: 50%;
  }
}

#overlay {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 16px;
  background: rgb(0 0 0 / 70%);
}

#overlay button {
  padding: 12px 18px;
  color: #fff;
  text-transform: uppercase;
  cursor: pointer;
  background: transparent;
  border: 0;
  border: 1px solid rgb(255 255 255);
  border-radius: 4px;
}

#notSupported {
  width: 50%;
  padding: 10px;
  margin: auto;
  margin-top: 20px;
  background-color: #f00;
}
</style>
