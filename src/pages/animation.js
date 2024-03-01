import * as THREE from 'three'

// import { gsap } from 'gsap'

export class AnimationGroup {
  /**
   * @param {AnimationMixer} mixer
   * @param {Array<AnimationAction[]>} animationsGroup
   * @param {AnimationAction} playAnimation
   */
  constructor(mixer, animationsGroup, playAnimation) {
    this.mixer = mixer
    this.animationsGroup = animationsGroup
    if (playAnimation) {
      playAnimation.play()
    }
    this.prevAnimation = playAnimation
    this.animationsIndex = 0
    this.animationIndex = 0
    this.active = false
    this._continuousAnimation = this.continuousAnimation.bind(this)
  }

  get currentAnimations() {
    return this.animationsGroup[this.animationsIndex]
  }

  get currentAnimation() {
    return this.currentAnimations[this.animationIndex]
  }

  get isLastAnimation() {
    return this.currentAnimation === this.currentAnimations.at(-1)
  }

  start() {
    if (this.active) {
      return this
    } else {
      this.active = true
    }
    this.animationIndex = 0
    this.nextAnimations()
    this.fusionRun(true)
    return this
  }

  sustain() {
    this.nextAnimation()
    this.fusionRun()
    return this
  }

  nextAnimations() {
    this.animationIndex = 0
    if (this.animationsIndex >= this.animationsGroup.length - 1) {
      this.animationsIndex = 0
    } else {
      this.animationsIndex++
    }
    return this
  }

  nextAnimation() {
    if (this.animationIndex < this.currentAnimations.length - 1) {
      this.animationIndex++
    }
    return this
  }

  // continuousAnimation() {
  //   this.mixer.removeEventListener('finished', this._continuousAnimation)
  //   if (!this.isLastAnimation) {
  //     this.sustain()
  //   }
  //   return this
  // }
  continuousAnimation(event) {
    if (this.currentAnimation._clip.name === event.action._clip.name) {
      this.mixer.removeEventListener('finished', this._continuousAnimation)
      if (!this.isLastAnimation) {
        this.sustain()
      }
    }
    return this
  }

  fusion(fusionTime) {
    console.log('fusionTime', fusionTime)
    const loop = this.isLastAnimation ? THREE.LoopRepeat : THREE.LoopOnce
    this.currentAnimation
      .setLoop(loop)
      .stop()
      .play()
      .crossFadeFrom(this.prevAnimation, fusionTime)
    this.prevAnimation = this.currentAnimation
    if (this.isLastAnimation) {
      this.active = false
    } else if (!this.isLastAnimation) {
      this.sustain()
    }
  }

  // 让上一个动画跟现有动画融合，保证切换动作的衔接
  fusionRun(immediately = false) {
    const prevAnimationDuration = this.prevAnimation
      .setLoop(THREE.LoopOnce)
      .getClip().duration
    // 动作融合过渡时间
    const coordinationTime = 0.5
    // 获取动画剩余时间
    const remainingTime = prevAnimationDuration - this.prevAnimation.time
    const isMinTime = coordinationTime >= remainingTime
    // debugger
    if (immediately) {
      this.fusion(isMinTime ? remainingTime : coordinationTime)
    } else if (isMinTime) {
      this.fusion(remainingTime)
    } else {
      // seTimeout这些定时器并不会准时
      const fallTime = 100
      console.log(
        'fallTime',
        (remainingTime - coordinationTime) * 1000 - fallTime,
      )
      setTimeout(
        () => {
          this.fusion(coordinationTime)
        },
        (remainingTime - coordinationTime) * 1000 - fallTime,
      )
    }
  }

  // run() {
  //   this.prevAnimation.stop()
  //   let loop
  //   if (this.isLastAnimation) {
  //     this.active = false
  //     loop = THREE.LoopRepeat
  //   } else {
  //     this.mixer.addEventListener('finished', this._continuousAnimation)
  //     loop = THREE.LoopOnce
  //   }
  //   this.currentAnimation.setLoop(loop).play()
  //   this.prevAnimation = this.currentAnimation
  //   return this
  // }
  // run() {
  //   const prevAnimationDuration = this.prevAnimation
  //     .setLoop(THREE.LoopOnce)
  //     .getClip().duration
  //   // 获取动画剩余时间
  //   const remainingTime = prevAnimationDuration - this.prevAnimation.time
  //   // 动画修改weight的时间
  //   const duration = Math.min(1, remainingTime)
  //   // 处理旧动画
  //   gsap.to(this.prevAnimation, {
  //     weight: 0,
  //     duration,
  //     onComplete: () => {
  //       this.prevAnimation.stop()
  //       this.prevAnimation = this.currentAnimation
  //       if (this.isLastAnimation) {
  //         this.active = false
  //       } else {
  //         this.mixer.addEventListener('finished', this._continuousAnimation)
  //       }
  //     },
  //   })
  //   // 处理新动画
  //   const loop = this.isLastAnimation ? THREE.LoopRepeat : THREE.LoopOnce
  //   this.currentAnimation.setLoop(loop).play()
  //   this.currentAnimation.weight = 0
  //   gsap.to(this.currentAnimation, {
  //     weight: 1,
  //     duration,
  //   })
  // }
}
