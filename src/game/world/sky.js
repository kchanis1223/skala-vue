import * as THREE from 'three'

// 날씨/밤낮에 따라 하늘색, 안개, 조명 세팅
const SKY_PRESETS = {
  clear: { sky: '#87ceeb', fog: 950, sun: 1.0, ambient: 0.75 },
  clouds: { sky: '#9fb3bf', fog: 750, sun: 0.6, ambient: 0.65 },
  rain: { sky: '#5f7682', fog: 480, sun: 0.35, ambient: 0.55 },
  snow: { sky: '#c3ced6', fog: 420, sun: 0.5, ambient: 0.7 },
  mist: { sky: '#b9c2c8', fog: 260, sun: 0.4, ambient: 0.65 },
}

export const setupSky = (scene, { theme = 'clear', isNight = false }) => {
  const preset = SKY_PRESETS[theme] ?? SKY_PRESETS.clear
  const skyColor = new THREE.Color(preset.sky)
  if (isNight) skyColor.multiplyScalar(0.28)

  scene.background = skyColor
  scene.fog = new THREE.Fog(skyColor, 80, isNight ? preset.fog * 0.7 : preset.fog)

  const hemi = new THREE.HemisphereLight(
    '#ffffff',
    '#6b7f5e',
    preset.ambient * (isNight ? 0.35 : 1) * 2.2,
  )
  const sun = new THREE.DirectionalLight(
    isNight ? '#aabbdd' : '#fff4d6',
    preset.sun * (isNight ? 0.3 : 1) * 1.8,
  )
  sun.position.set(120, 260, 80)
  scene.add(hemi, sun)

  return {
    dispose() {
      scene.remove(hemi, sun)
      hemi.dispose()
      sun.dispose()
    },
  }
}
