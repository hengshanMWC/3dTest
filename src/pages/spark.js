import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { gsap } from 'gsap'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import * as THREE from 'three'

gsap.registerPlugin(ScrollTrigger, MotionPathPlugin)

const maxX = window.innerWidth
const maxY = window.innerHeight * 2
window.gsap = gsap
export class Spark {
  constructor(camera, material, particle) {
    this.material = material // 透明
    this.particle = particle // 位置
    this.camera = camera // 位置
  }

  runMove(options = {}) {
    const path = []
    let prevPath = { x: this.particle.position.x, y: this.particle.position.y }
    let nextPath
    // // 是的话向上飘
    // const isY = Math.random() >= 0.5
    for (let i = 0; i < 3; i++) {
      nextPath = {
        x: getRandomInRange(prevPath.x, 30, 45),
        y: getRandomInRange(prevPath.y, -0.5, 5),
      }
      path.push(nextPath)
      prevPath = nextPath
    }
    path.push({
      x: 80,
      y: getRandomInRange(prevPath.y, -1, 150),
    })
    gsap
      .to(this.particle.position, {
        motionPath: {
          path,
        },
        duration: getRandomInRange(10, 0, 20), // 15-20
        repeat: -1, // 重复次数（-1表示无限重复）
        ...options,
      })
      .play()
    return this
  }

  runLight(options = {}) {
    const tl = gsap.timeline({
      duration: Math.random() * 0.2 + 0.9,
      repeat: -1, // 重复次数（-1表示无限重复）
      yoyo: true, // 循环时是否来回播放
      ...options,
    })
    tl.to(this.material, {
      opacity: 0, // 动画持续时间（秒）
    }).to(this.particle, {
      intensity: 0, // 动画持续时间（秒）
    })
    return this
  }
}
export function getRandomInRange(value, rangeStart, rangeEnd) {
  // 获取0到1之间的随机数
  const randomValue = Math.random()
  // 计算范围大小
  const rangeSize = rangeEnd - rangeStart
  // 将随机数映射到 [0, rangeSize] 范围内
  const scaledValue = randomValue * rangeSize
  // 返回结果加上 value
  return value + rangeStart + scaledValue
}

// export function positionObjectOutsideLeftFrustum(camera, object, x) {
//   // 计算相机左侧平面的法线
//   const normal = new THREE.Vector3(x, 0, 0) // 相机左侧是朝向负 x 轴的

//   // 计算物体到相机的距离
//   const distance = camera.position.distanceTo(object.position)

//   // 将物体移动到相机左侧足够远的位置
//   const newPosition = camera.position
//     .clone()
//     .add(normal.multiplyScalar(distance * 2)) // 这里可以根据需要调整乘数以确保物体足够远

//   return newPosition
// }
