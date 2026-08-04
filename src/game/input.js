// 방향키 + WASD 입력 상태 관리
// e.code(물리 키 위치)로 받아서 한글 입력 모드에서도 wasd가 먹음
export const createInput = () => {
  const pressed = new Set()

  const onKeyDown = (e) => {
    if (e.key.startsWith('Arrow')) e.preventDefault() // 화면 스크롤 방지
    pressed.add(e.code)
  }
  const onKeyUp = (e) => pressed.delete(e.code)

  const has = (...codes) => codes.some((c) => pressed.has(c))

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
      return (has('ArrowLeft', 'KeyA') ? 1 : 0) - (has('ArrowRight', 'KeyD') ? 1 : 0)
    },
    get pitch() {
      return (has('ArrowUp', 'KeyW') ? 1 : 0) - (has('ArrowDown', 'KeyS') ? 1 : 0)
    },
  }
}
