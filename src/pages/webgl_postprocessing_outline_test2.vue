<script setup>
import * as THREE from 'three'

import Stats from 'three/addons/libs/stats.module.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'
import Lenis from '@studio-freight/lenis'

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { onMounted, ref } from 'vue'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { gsap } from 'gsap'
import glb from '../asset/model/role03_all.glb'
import { AnimationGroup } from './animation'
import { mirrorOperations } from './mirrorOperations'

const statsRef = ref(null)

onMounted(() => {
  const bg = '#333'
  const lizibg = 0xf5bc6a
  let stats
  let camera, scene, renderer
  let composer, effectFXAA, outlinePass
  let animationGroup, model, mixer, clock
  const particles = []
  const isHelp = false
  const dimian = -11
  const mirrorOperationsIndex = 0
  let lenis = null
  const currentCameraLookAt = JSON.parse(
    JSON.stringify(mirrorOperations[mirrorOperationsIndex].lookAt),
  )
  const currentCameraPosition = JSON.parse(
    JSON.stringify(mirrorOperations[mirrorOperationsIndex].position),
  )

  const params = {
    edgeStrength: 3.0,
    edgeGlow: 0.0,
    edgeThickness: 1.0,
    pulsePeriod: 0,
    rotate: false,
    usePatternTexture: false,
  }

  // Init gui

  const gui = new GUI({ width: 280 })

  gui.add(params, 'edgeStrength', 0.01, 10).onChange(function (value) {
    outlinePass.edgeStrength = Number(value)
  })

  gui.add(params, 'edgeGlow', 0.0, 1).onChange(function (value) {
    outlinePass.edgeGlow = Number(value)
  })

  gui.add(params, 'edgeThickness', 1, 4).onChange(function (value) {
    outlinePass.edgeThickness = Number(value)
  })

  gui.add(params, 'pulsePeriod', 0.0, 5).onChange(function (value) {
    outlinePass.pulsePeriod = Number(value)
  })

  gui.add(params, 'rotate')

  gui.add(params, 'usePatternTexture').onChange(function (value) {
    outlinePass.usePatternTexture = value
  })

  function Configuration() {
    this.visibleEdgeColor = '#ffffff'
    this.hiddenEdgeColor = '#190a05'
  }

  const conf = new Configuration()

  gui.addColor(conf, 'visibleEdgeColor').onChange(function (value) {
    outlinePass.visibleEdgeColor.set(value)
  })

  gui.addColor(conf, 'hiddenEdgeColor').onChange(function (value) {
    outlinePass.hiddenEdgeColor.set(value)
  })
  // initScene()
  // initCamera()
  // initRenderer()
  init()
  initMesh()
  initLight()
  initGroundParticle()
  initScroll()
  initFloor()
  initSmoothScrolling()
  animate()
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
  /** 创建渲染器 */
  function initRenderer() {
    const canvas = document.querySelector('#c')
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true, // 抗齿距
    })
    renderer.shadowMap.enabled = true // 投射阴影
    renderer.autoClear = false
    renderer.setPixelRatio(window.devicePixelRatio)
  }
  function init() {
    const width = window.innerWidth
    const height = window.innerHeight

    const canvas = document.querySelector('#c')
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true, // 抗齿距
    })
    renderer.shadowMap.enabled = true
    // todo - support pixelRatio in this demo
    renderer.setSize(width, height)
    // renderer.autoClear = false
    renderer.setPixelRatio(window.devicePixelRatio)

    scene = new THREE.Scene()
    scene.background = new THREE.Color(bg)
    scene.fog = new THREE.Fog(bg, 60, 100) // 雾化效果

    camera = new THREE.PerspectiveCamera(45, width / height, 1)
    setCameraPosition()
    window.camera = camera

    //
    clock = new THREE.Clock()

    stats = new Stats()
    statsRef.value.appendChild(stats.dom)

    composer = new EffectComposer(renderer)

    const renderPass = new RenderPass(scene, camera)
    composer.addPass(renderPass)

    outlinePass = new OutlinePass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      scene,
      camera,
    )
    outlinePass.edgeStrength = params.edgeStrength // 宽度
    outlinePass.edgeGlow = params.edgeGlow // 辉光
    outlinePass.edgeThickness = params.edgeThickness // 清晰度
    outlinePass.pulsePeriod = params.pulsePeriod // 脉冲周期
    outlinePass.visibleEdgeColor = new THREE.Color(lizibg)
    composer.addPass(outlinePass)

    const textureLoader = new THREE.TextureLoader()
    textureLoader.load('./tri_pattern.jpg', function (texture) {
      outlinePass.patternTexture = texture
      texture.wrapS = THREE.RepeatWrapping
      texture.wrapT = THREE.RepeatWrapping
    })

    const outputPass = new OutputPass()
    composer.addPass(outputPass)

    // effectFXAA = new ShaderPass(FXAAShader)
    // effectFXAA.uniforms.resolution.value.set(
    //   1 / window.innerWidth,
    //   1 / window.innerHeight,
    // )
    // composer.addPass(effectFXAA)

    window.addEventListener('resize', onWindowResize)

    renderer.domElement.style.touchAction = 'none'
  }
  function updateMixer() {
    if (mixer) {
      // 更新动画 根据clock确保不会因为帧率导致动画变快或变慢
      mixer.update(clock.getDelta())
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
  function setCameraPosition() {
    camera.position.set(
      currentCameraPosition.x,
      currentCameraPosition.y,
      currentCameraPosition.z,
    )
  }
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
    const geometry = new THREE.IcosahedronGeometry(0.06, 15)
    const mtl = new THREE.MeshLambertMaterial({ color: lizibg })
    // const mtl = new THREE.MeshBasicMaterial({ color: 0xf5bc6a })
    const intensity = 100
    for (let i = 0; i < 20; i++) {
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
  function updateGroundParticle() {
    const time = Date.now() * 0.0007
    particles.forEach(item => {
      const x = Math.sin(time * item.x) * 30
      const y = Math.cos(time * item.y) * 40
      const z = Math.cos(time * item.z) * 30
      item.particle.position.set(x, y, z)
    })
  }

  function animate() {
    updateMixer()

    camera.lookAt(
      currentCameraLookAt.x,
      currentCameraLookAt.y,
      currentCameraLookAt.z,
    )
    // updateMixer()
    updateGroundParticle()
    stats.update()
    composer.render()
    // renderer.render(scene, camera)
    requestAnimationFrame(animate)
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
  function initScroll() {
    const options = {
      scrollTrigger: {
        trigger: '.box2',
        start: 'top bottom',
        end: 'bottom bottom',
        scrub: true,
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
})
</script>

<template>
  <div>
    <div class="wrapper">
      <div ref="statsRef" class="stats"></div>
      <canvas id="c"></canvas>
    </div>
    <div class="footer">
      <div style="height: 7000px; background-color: aqua" class="box2"></div>
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
