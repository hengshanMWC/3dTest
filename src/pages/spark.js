import { gsap } from 'gsap'

const maxX = window.innerWidth * 2
const maxY = window.innerHeight * 2
window.gsap = gsap
export class Spark {
  constructor(material, particles) {
    this.material = material // 闪烁
    this.particles = particles // 位置
  }

  runMove(options = {}) {
    // const path = []
    // const prevPath = [this.particles.position.x, this.particles.position.y]
    // // 是的话向上飘
    // const isY = Math.random() >= 0.5
    // for (let i = 0; i < 4; i++) {
    // }
    return gsap
      .to(this.particles, {
        motionPath: {
          path: [{ x: maxX, y: maxY }],
        },
        duration: Math.random() * 2 + 8, // 动画持续时间（秒）
        repeat: -1, // 重复次数（-1表示无限重复）
        ...options,
      })
      .play()
  }

  runLight(options = {}) {
    return gsap
      .to(this.material, {
        duration: Math.random() * 0.2 + 1, // 动画持续时间（秒）
        opacity: 0, // 目标透明度
        repeat: -1, // 重复次数（-1表示无限重复）
        yoyo: true, // 循环时是否来回播放
        ...options,
      })
      .play()
  }
}
