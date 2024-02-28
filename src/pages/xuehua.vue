<script setup>
import * as THREE from 'three'

import Stats from 'three/addons/libs/stats.module.js'

import { GUI } from 'three/addons/libs/lil-gui.module.min.js'
import { onMounted } from 'vue'
import { Spark } from './spark'

onMounted(() => {
  let camera, scene, renderer, stats, parameters
  let mouseX = 0
  let mouseY = 0
  const sparks = []

  let windowHalfX = window.innerWidth / 2
  let windowHalfY = window.innerHeight / 2

  const materials = []

  init()
  animate()

  function init() {
    camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      1,
      2000,
    )
    camera.position.z = 1000

    scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x000000, 0.0008)

    const textureLoader = new THREE.TextureLoader()

    const assignSRGB = texture => {
      texture.colorSpace = THREE.LinearSRGBColorSpace
    }

    const vertices = []
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * 2000 - 1000
      const y = Math.random() * 2000 - 1000
      const z = 1

      vertices.push(x, y, z)
    }
    const geometry = new THREE.BufferGeometry()

    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(vertices, 3),
    )

    const sprite1 = textureLoader.load('./beam_177_tex_eff.png', assignSRGB)

    parameters = Array.from({ length: 10 }).fill([sprite1, 80])
    window.particlesList = []
    for (let i = 0; i < parameters.length; i++) {
      const sprite = parameters[i][0]
      const size = parameters[i][1]

      const colors = [new THREE.Color(0xff6700), new THREE.Color(0xffdda0)]
      materials[i] = new THREE.PointsMaterial({
        size,
        map: sprite,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        transparent: true,
      })
      materials[i].color.lerpColors(colors[0], colors[1], 0)

      const particles = new THREE.Points(geometry, materials[i])

      particles.position.x =
        Math.random() * (windowHalfX * 0.5 + windowHalfX * 1.8) -
        windowHalfX * 1.8
      // particles.position.x =
      // Math.random() * (windowHalfX * 2.2) - windowHalfX * 1.8
      particles.position.y = Math.random() * (windowHalfY + 2) - 2
      particles.position.z = 1
      particlesList.push(particles)
      const spark = new Spark(materials[i], particles)
      // spark.runLight()
      // spark.runMove()
      window.particles = particles

      scene.add(particles)
    }
    window.materials = materials
    //

    renderer = new THREE.WebGLRenderer()
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    document.body.appendChild(renderer.domElement)

    //

    stats = new Stats()
    document.body.appendChild(stats.dom)

    //

    const gui = new GUI()

    const params = {
      texture: true,
    }

    gui.add(params, 'texture').onChange(function (value) {
      for (let i = 0; i < materials.length; i++) {
        materials[i].map = value === true ? parameters[i][1] : null
        materials[i].needsUpdate = true
      }
    })

    gui.open()

    document.body.style.touchAction = 'none'
    document.body.addEventListener('pointermove', onPointerMove)

    //

    window.addEventListener('resize', onWindowResize)
  }

  function onWindowResize() {
    windowHalfX = window.innerWidth / 2
    windowHalfY = window.innerHeight / 2

    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()

    renderer.setSize(window.innerWidth, window.innerHeight)
  }

  function onPointerMove(event) {
    if (event.isPrimary === false) return

    mouseX = event.clientX - windowHalfX
    mouseY = event.clientY - windowHalfY
  }

  //

  function animate() {
    requestAnimationFrame(animate)

    render()
    stats.update()
  }

  function render() {
    const time = Date.now() * 0.00005

    // camera.position.x += (mouseX - camera.position.x) * 0.05
    // camera.position.y += (-mouseY - camera.position.y) * 0.05

    // camera.lookAt(scene.position)

    // for (let i = 0; i < scene.children.length; i++) {
    //   const object = scene.children[i]

    //   if (object instanceof THREE.Points) {
    //     object.rotation.y = time * (i < 4 ? i + 1 : -(i + 1))
    //   }
    // }

    // for (let i = 0; i < sparks.length; i++) {
    //   sparks[i].setLight()
    // }

    renderer.render(scene, camera)
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
