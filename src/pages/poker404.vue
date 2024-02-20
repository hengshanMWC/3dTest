<script>
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

import glb from './Soldier.glb'

let gScene = null // 场景
const dimian = -9
export default {
  data() {
    return {
      // scene: null, // 场景
      camera: null, // 相机
      material: null, // 材质
      mesh: null, // 网格模型对象Mesh
      renderer: null, // 渲染器对象
      controls: null, //
      currentAnim: null,
      // neck: null,
      // waist: null,
      possibleAnims: null,
      mixer: null,
      clock: null,
      mouseX: 0,
      mouseY: 0,

      currentlyAnimating: false, // Used to check whether characters neck is being used in another anim
      raycaster: new THREE.Raycaster(), // Used to detect the click on our character
    }
  },
  mounted() {
    this.init()
    document.addEventListener('mousemove', e => {
      const mousecoords = this.getMousePos(e)
      this.onDocumentMouseMove(mousecoords)
    })
  },
  methods: {
    onDocumentMouseMove(mousecoords) {
      this.mouseX = (mousecoords.x - window.innerWidth / 2) / 60
      this.mouseY = (mousecoords.y - window.innerHeight / 2) / 120
    },
    handleMousemove(mousecoords) {
      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2
      const rotationX = ((mousecoords.y - centerY) / centerY) * 0.007
      const rotationY = ((mousecoords.x - centerX) / centerX) * 0.03
      this.camera.rotation.x = rotationX + 0.09966865249116202
      this.camera.rotation.y = rotationY
    },
    /** 创建场景 */
    initScene() {
      const backgroundColor = 'red'
      const scene = new THREE.Scene()
      scene.background = new THREE.Color(backgroundColor)
      scene.fog = new THREE.Fog(backgroundColor, 60, 100) // 雾化效果
      gScene = scene
    },

    /** 创建相机 */
    initCamera() {
      const camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        1,
        100,
      )
      camera.position.set(1, 2, -30)
      camera.lookAt(0, 1, 0)

      this.camera = camera
    },

    /** 创建渲染器 */
    initRenderer() {
      const canvas = document.querySelector('#c')
      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true, // 抗齿距
      })
      renderer.shadowMap.enabled = true // 投射阴影
      renderer.setPixelRatio(window.devicePixelRatio)
      this.renderer = renderer
      const controls = new OrbitControls(this.camera, renderer.domElement)
      controls.maxPolarAngle = Math.PI / 2
      controls.minPolarAngle = Math.PI / 3
      controls.enableDamping = true
      controls.enablePan = false
      controls.dampingFactor = 0.1
      controls.autoRotate = false // Toggle this if you'd like the chair to automatically rotate
      controls.autoRotateSpeed = 0.2 // 30
    },

    /** 创建材质对象 */
    initTexture() {
      // 加载纹理贴图
      const texture = new THREE.TextureLoader().load(
        'https://s3-us-west-2.amazonaws.com/s.cdpn.io/1376484/stacy.jpg',
      )
      texture.flipY = false

      /** 材质对象 */
      const material = new THREE.MeshPhongMaterial({
        map: texture,
        color: 0xffffff,
        skinning: true,
      })

      this.material = material
    },

    /** 创建网格模型对象 */
    initMesh() {
      const loader = new GLTFLoader()

      // 加载纹理贴图
      const texture = new THREE.TextureLoader().load(
        'https://s3-us-west-2.amazonaws.com/s.cdpn.io/1376484/stacy.jpg',
      )
      texture.flipY = false

      /** 材质对象 */
      const material = new THREE.MeshPhongMaterial({
        map: texture,
        color: 0xffffff,
        skinning: true,
      })

      loader.load(
        glb,
        gltf => {
          console.log('mwc-gltf', gltf)
          const model = gltf.scene

          model.traverse(o => {
            if (o.isMesh) {
              // 启用投射和接收阴影的能力
              o.castShadow = true
              o.receiveShadow = true
              o.material = material
            }
          })

          // 放大 7 倍
          model.scale.set(10, 10, 10)
          model.position.y = dimian

          gScene.add(model)

          // 拿到模型中自带的动画数据
          const fileAnimations = gltf.animations

          // 创建模型动作混合器
          const mixer = new THREE.AnimationMixer(model)

          // 处理其他动画
          const clips = fileAnimations

          // 遍历动画列表并生成操作对象存储起来
          const possibleAnims = clips.map(val => {
            let clip = THREE.AnimationClip.findByName(clips, val.name)

            clip = mixer.clipAction(clip)
            return clip
          })

          // 得到动画操作对象
          this.currentAnim = possibleAnims[3]
          this.currentAnim.play() // 播放空闲动画

          this.possibleAnims = possibleAnims
          this.mixer = mixer
          window.vue = this

          console.log('mwc-possibleAnims', this.possibleAnims)
        },
        undefined, // We don't need this function
        error => {
          console.error(error)
        },
      )
    },

    /** 创建光源 */
    initLight() {
      const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.61)
      hemiLight.position.set(0, 50, 0)
      // Add hemisphere light to scene
      gScene.add(hemiLight)

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
      gScene.add(dirLight)
    },

    /** 创建地面 */
    initFloor() {
      const floorGeometry = new THREE.PlaneGeometry(5000, 5000, 1, 1)
      const floorMaterial = new THREE.MeshPhongMaterial({
        color: 'red',
        shininess: 0,
      })

      const floor = new THREE.Mesh(floorGeometry, floorMaterial)
      floor.rotation.x = -0.5 * Math.PI
      floor.receiveShadow = true
      floor.position.y = dimian
      gScene.add(floor)
    },

    /** 初始化 */
    init() {
      this.initScene()
      this.initCamera()
      this.initRenderer()

      this.clock = new THREE.Clock()
      this.initMesh()
      this.initLight()
      this.initFloor()

      this.update()
    },

    update() {
      if (this.mixer) {
        // 更新动画 根据clock确保不会因为帧率导致动画变快或变慢
        this.mixer.update(this.clock.getDelta())
      }

      if (this.resizeRendererToDisplaySize(this.renderer)) {
        const canvas = this.renderer.domElement
        this.camera.aspect = canvas.clientWidth / canvas.clientHeight
        this.camera.updateProjectionMatrix() // 重新计算相机对象的投影矩阵值
      }

      this.camera.position.x += (this.mouseX - this.camera.position.x) * 0.05
      this.camera.position.y += (-this.mouseY - this.camera.position.y) * 0.05
      this.camera.lookAt(gScene.position)

      this.renderer.render(gScene, this.camera)
      requestAnimationFrame(this.update)
    },

    resizeRendererToDisplaySize(renderer) {
      const canvas = renderer.domElement
      const width = window.innerWidth
      const height = window.innerHeight
      const canvasPixelWidth = canvas.width / window.devicePixelRatio
      const canvasPixelHeight = canvas.height / window.devicePixelRatio

      const needResize =
        canvasPixelWidth !== width || canvasPixelHeight !== height
      if (needResize) {
        renderer.setSize(width, height, false)
      }
      return needResize
    },

    getMousePos(e) {
      return { x: e.clientX, y: e.clientY }
    },

    /**
     * 切换动画
     * @params form 当前执行的动画
     * @params fSpeed 当前动画过度到下一个动画的时间
     * @params to 下一个要执行的动画
     * @params tSpeed 下一个动画执行完成后回到当前动画的时间
     */
    playModifierAnimation(to) {
      if (to === this.currentAnim) return
      this.currentAnim.stop()
      this.currentAnim = to
      to.play()
    },

    palyAnimation(index) {
      this.playModifierAnimation(this.possibleAnims[index])
    },
  },
}
</script>

<template>
  <div class="wrapper">
    <div class="buttons">
      <div
        v-for="(btn, index) in possibleAnims"
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
  left: 0;
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
