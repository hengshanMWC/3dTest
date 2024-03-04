<script setup>
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import Stats from 'three/addons/libs/stats.module.js'

import { GUI } from 'three/addons/libs/lil-gui.module.min.js'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { AnaglyphEffect } from 'three/addons/effects/AnaglyphEffect.js'

import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { gsap } from 'gsap'
import Lenis from '@studio-freight/lenis'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import glb from '../asset/model/role03_all.glb'
import { AnimationGroup } from './animation'
import { mirrorOperations } from './mirrorOperations'

class WebGL {
  static get VERTEX_SHADER() {
    return (
      '\t\t\tvarying vec2 vUv;\n' +
      '\n' +
      '\t\t\tvoid main() {\n' +
      '\n' +
      '\t\t\t\tvUv = uv;\n' +
      '\n' +
      '\t\t\t\tgl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n' +
      '\n' +
      '\t\t\t}'
    )
  }

  static get FRAGMENT_SHADER() {
    return (
      '\t\t\tuniform sampler2D baseTexture;\n' +
      '\t\t\tuniform sampler2D bloomTexture;\n' +
      '\n' +
      '\t\t\tvarying vec2 vUv;\n' +
      '\n' +
      '\t\t\tvoid main() {\n' +
      '\n' +
      '\t\t\t\tgl_FragColor = ( texture2D( baseTexture, vUv ) + vec4( 1.0 ) * texture2D( bloomTexture, vUv ) );\n' +
      '\n' +
      '\t\t\t}'
    )
  }
}

onMounted(() => {
  // const bg = '#333'
  const scene = new THREE.Scene()
  // scene.background = new THREE.Color(bg)
  // scene.fog = new THREE.Fog(bg, 60, 100) // 雾化效果
  // 场景
  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    // 100,
  )
  camera.position.set(150, 100, 150)
  const canvas = document.querySelector('#c')
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true, // 抗齿距
  })
  renderer.shadowMap.enabled = true // 投射阴影
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight)
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 1)
  hemiLight.position.set(0, 50, 0)
  // setLayoutEnable(hemiLight)
  scene.add(hemiLight)
  new OrbitControls(camera, renderer.domElement)
  // 辉光模型集合
  const glows = []

  // 初始化模型
  initModel()

  // 初始合成器
  const { finalComposer, glowComposer } = initComposer()

  // 渲染逻辑
  const render = () => {
    // 不辉光的先变黑
    scene.traverse(darkenMaterial)
    // 渲染辉光合成器
    glowComposer.render()
    // 还原不会光的材质
    scene.traverse(restoreMaterial)
    // 渲染最终合成器
    finalComposer.render()
    requestAnimationFrame(render)
  }

  /**
   * 非辉光材质颜色设置黑色
   */
  function darkenMaterial(obj) {
    const material = obj.material
    if (material && !glows.includes(obj)) {
      obj.originalMaterial = obj.material
      const Proto = Object.getPrototypeOf(material).constructor
      obj.material = new Proto({ color: scene.background })
    }
  }

  /**
   * 还原材质
   */
  function restoreMaterial(obj) {
    if (!obj.originalMaterial) return
    obj.material = obj.originalMaterial
    delete obj.originalMaterial
  }

  /**
   * 初始化通道
   */
  function initComposer() {
    // 辉光参数
    const params = {
      // 强度
      bloomStrength: 1.5,
      // 阈值
      bloomThreshold: 0,
      // 半径
      bloomRadius: 0,
    }
    // 渲染通道
    const renderPass = new RenderPass(scene, camera)
    // 辉光通道
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      params.bloomStrength,
      params.bloomRadius,
      params.bloomThreshold,
    )

    // 辉光合成器
    const glowComposer = new EffectComposer(renderer)
    glowComposer.renderToScreen = false
    glowComposer.addPass(renderPass)
    glowComposer.addPass(bloomPass)

    // 最终通道
    const finalPass = new ShaderPass(
      new THREE.ShaderMaterial({
        uniforms: {
          baseTexture: { value: null },
          bloomTexture: { value: glowComposer.renderTarget2.texture },
        },
        vertexShader: WebGL.VERTEX_SHADER,
        fragmentShader: WebGL.FRAGMENT_SHADER,
        defines: {},
      }),
      'baseTexture',
    )
    finalPass.needsSwap = true
    // 最终合成器
    const finalComposer = new EffectComposer(renderer)
    finalComposer.addPass(renderPass)
    finalComposer.addPass(finalPass)

    // UI调试
    const gui = new GUI()
    window.gui = gui

    gui
      .add(params, 'bloomThreshold', 0.0, 1.0)
      .step(0.01)
      .name('阈值')
      .onChange(function (value) {
        bloomPass.threshold = Number(value)
      })

    // 强度 在0-10之间可正常看到物体，超过10会因光线过强而看不见物体，步长建议0.01
    gui
      .add(params, 'bloomStrength', 0, 10)
      .step(0.01)
      .name('强度')
      .onChange(function (value) {
        bloomPass.strength = Number(value)
      })

    gui
      .add(params, 'bloomRadius', 0.0, 1.0)
      .step(0.01)
      .name('半径')
      .onChange(function (value) {
        bloomPass.radius = Number(value)
      })

    return { finalComposer, glowComposer }
  }

  /**
   * 初始化模型
   */
  function initModel() {
    const boxGeometry = new THREE.BoxGeometry(100, 100, 100)
    // 创建地面材质
    const boxMaterial = new THREE.MeshPhongMaterial({
      color: '#68a5f1',
      side: 0,
    })

    // 场景随机创建20个盒子
    for (let i = 0; i < 20; i++) {
      const cubeMesh = new THREE.Mesh(boxGeometry.clone(), boxMaterial.clone())
      cubeMesh.position.setY(50)
      cubeMesh.castShadow = true
      cubeMesh.receiveShadow = true
      cubeMesh.position.set(
        random(-500, 400),
        random(-0, 500),
        random(-500, 400),
      )
      // 偶数的为红色，放入辉光容器，奇数为蓝色，不辉光
      if (i % 2 === 0) {
        glows.push(cubeMesh)
        cubeMesh.material.color = new THREE.Color('#fc2d5d')
      }
      scene.add(cubeMesh)
    }
  }
  /**
   * 指定范围生成随机数
   * @param min
   * @param max
   * @returns {number}
   */
  function random(min, max) {
    return Number.parseInt(Math.random() * (max - min) + min)
  }
  render()
})
</script>

<template>
  <div>
    <canvas id="c"></canvas>
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
