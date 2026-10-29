export function createRectCache(element: HTMLElement) {
  let rect = element.getBoundingClientRect()

  function sync() {
    rect = element.getBoundingClientRect()
  }

  const observer = new ResizeObserver(sync)
  observer.observe(element)
  window.addEventListener('scroll', sync, true)

  return {
    get current() {
      return rect
    },
    destroy() {
      observer.disconnect()
      window.removeEventListener('scroll', sync, true)
    },
  }
}
