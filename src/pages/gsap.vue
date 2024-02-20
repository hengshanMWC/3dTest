<script setup>
import { gsap } from 'gsap'
import { onMounted } from 'vue'

onMounted(() => {
  const bt = document.querySelector('button')

  const tl = gsap.timeline({ paused: true })
  tl.to('.green', { x: 100, opacity: 0.5, repeat: -1, yoyo: true })
  bt.onclick = () => {
    tl.play()
  }
})
</script>

<template>
  <div>
    <div class="box green"></div>
    <div class="box purple"></div>
    <div class="box blue"></div>
  </div>
  <button>开始</button>
</template>

<style scoped>
.box {
  width: 20px;
  height: 20px;
}

.green {
  background-color: green;
}

.purple {
  background-color: purple;
}

.blue {
  background-color: blue;
}
</style>
