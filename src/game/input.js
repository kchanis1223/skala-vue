// 방향키 입력 상태 관리 (WASD도 같이 받아줌)
export const createInput = () => {
  const pressed = new Set()

  const onKeyDown = (e) => {
    if (e.key.startsWith('Arrow')) e.preventDefault() // 화면 스크롤 방지
    pressed.add(e.key.toLowerCase())
  }
  const onKeyUp = (e) => pressed.delete(e.key.toLowerCase())

  const has = (...keys) => keys.some((k) => pressed.has(k))

  return {
    attach() {
      window.addEventListener('keydown', onKeyDown)
      window.addEventListener('keyup', onKeyUp)
    },
    detach() {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      pressed.clear()
    },
    get turn() {
      return (has('arrowleft', 'a') ? 1 : 0) - (has('arrowright', 'd') ? 1 : 0)
    },
    get pitch() {
      return (has('arrowup', 'w') ? 1 : 0) - (has('arrowdown', 's') ? 1 : 0)
    },
  }
}
