import { useEffect, useRef } from 'react'

/** While `enabled`, calls `onOutside` for any pointer press that `isInside` doesn't claim. */
export function usePressOutside(enabled: boolean, isInside: (e: PointerEvent) => boolean, onOutside: () => void) {
  // Latest callbacks, so the listener isn't re-attached on every render.
  const callbacksRef = useRef({ isInside, onOutside })
  useEffect(() => {
    callbacksRef.current = { isInside, onOutside }
  })

  useEffect(() => {
    if (!enabled)
      return
    const onPointerDown = (e: PointerEvent) => {
      if (!callbacksRef.current.isInside(e))
        callbacksRef.current.onOutside()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [enabled])
}
