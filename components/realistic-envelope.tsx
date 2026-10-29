'use client'

import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'

// ============================================================================
// 1. 3D TRAJECTORY & GEOMETRY CONSTANTS (Giữ nguyên API xuất khẩu chuẩn)
// ============================================================================
export const PERSPECTIVE = 1200         // Độ sâu 3D perspective của stage (>= 1200 trên Desktop)
export const LETTER_RISE_H = 260        // H0: Chiều cao trồi thẳng đứng lên khỏi miệng túi (px)
export const ARC_RADIUS = 90            // R: Bán kính cua 1/4 đường tròn trong mặt phẳng Y-Z (px)
export const Z_END = 450                // Z_END chuẩn trên desktop (px)
export const LANDED_LETTER_Y = -14      // Độ dịch Y khi đáp trên desktop (-14px bù trừ căn giữa hoàn hảo)

export const FLAP_OPEN_DURATION_MS = 400 // Mở nắp hướng lên trên (0° -> 180°)
export const FLIGHT_DURATION_MS = 2400   // Quỹ đạo bay 4 giai đoạn mượt mà (ms)

// Kích thước hệ toạ độ thiết kế gốc của phong bì (Design Coordinate System)
export const ENVELOPE_WIDTH = 410
export const ENVELOPE_HEIGHT = 272
export const FLAP_HEIGHT = 160

// Kích thước lá thư khi nằm lọt lòng trong túi phong bì (cam kết không thò ra ngoài)
export const LETTER_POCKET_WIDTH = 340   // Hẹp hơn bìa thư 70px (lọt lòng 35px mỗi bên)
export const LETTER_POCKET_HEIGHT = 200  // Chiều cao nhỏ lại gọn gàng (200px thay vì 240px), nằm lọt sâu an toàn trong túi thư

// Kích thước tối đa của lá thư sau khi đáp trên desktop
export const LANDED_LETTER_MAX_WIDTH = Math.round(ENVELOPE_WIDTH * 1.0)  // 410px (100% chiều rộng bìa thư)
export const LANDED_LETTER_MAX_HEIGHT = Math.round(ENVELOPE_HEIGHT * 2.0) // 544px (200% chiều cao bìa thư)

// ============================================================================
// BREAKPOINT & NGƯỠNG CO GIÃN RESPONSIVE
// ============================================================================
export const BREAKPOINTS = {
  mobileSmall: 375, // iPhone SE / Mini
  mobile: 430,      // iPhone Pro Max / Android tiêu chuẩn
  tablet: 1024,     // iPad / Tablet
} as const

export const SCALE_LIMITS = {
  min: 0.6,    // Mobile nhỏ nhất (320px) không co dưới 0.6
  max: 1.25,   // Tablet được phép phóng to phong bì lên tối đa 1.25
} as const

export interface RealisticEnvelopeProps {
  children?: ReactNode
  hovering?: boolean
  opening?: boolean
  onHover?: (hovering: boolean) => void
  onOpen?: () => void
  onFlightDone?: () => void
  onClose?: () => void
}

interface ResponsiveMetrics {
  envScale: number
  targetWidth: number
  targetHeight: number
  zEnd: number
  landedY: number
  letterRiseH: number
  arcRadius: number
  envelopeYOffset: number
  perspective: number
  isMobile: boolean
  isLandscape: boolean
}

export function RealisticEnvelope({
  children,
  hovering: controlledHover,
  onHover,
  onOpen,
  onFlightDone,
}: RealisticEnvelopeProps) {
  const noiseId = useId().replace(/[^a-zA-Z0-9_-]/g, '')

  // Refs phục vụ hiệu năng 60fps & dọn dẹp bộ nhớ
  const containerRef = useRef<HTMLDivElement | null>(null)
  const envelopeWrapperRef = useRef<HTMLDivElement | null>(null)
  const envelopeBackRef = useRef<HTMLDivElement | null>(null)
  const envelopeFoldsRef = useRef<HTMLDivElement | null>(null)
  const flapRef = useRef<HTMLDivElement | null>(null)
  const waxRef = useRef<HTMLDivElement | null>(null)
  const letterRef = useRef<HTMLDivElement | null>(null)

  const rafId = useRef<number | null>(null)
  const timeoutsRef = useRef<NodeJS.Timeout[]>([])

  // Helper đặt setTimeout an toàn có thể hủy toàn bộ khi unmount
  const addSafeTimeout = useCallback((fn: () => void, delayMs: number) => {
    const id = setTimeout(() => {
      timeoutsRef.current = timeoutsRef.current.filter((t) => t !== id)
      fn()
    }, delayMs)
    timeoutsRef.current.push(id)
    return id
  }, [])

  // Interaction State
  const [isHovered, setIsHovered] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isLanded, setIsLanded] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  // Lưu trữ metrics tính toán được để dùng chung giữa Render và RAF
  const [metrics, setMetrics] = useState<ResponsiveMetrics>(() => ({
    envScale: 1.0,
    targetWidth: LANDED_LETTER_MAX_WIDTH,
    targetHeight: LANDED_LETTER_MAX_HEIGHT,
    zEnd: Z_END,
    landedY: LANDED_LETTER_Y,
    letterRiseH: LETTER_RISE_H,
    arcRadius: ARC_RADIUS,
    envelopeYOffset: 85,
    perspective: PERSPECTIVE,
    isMobile: false,
    isLandscape: false,
  }))

  const metricsRef = useRef(metrics)
  metricsRef.current = metrics

  // ==========================================================================
  // 2. PHÁT HIỆN THIẾT BỊ & MEDIA QUERIES (matchMedia, hover/pointer)
  // ==========================================================================
  useEffect(() => {
    if (typeof window === 'undefined') return

    const pointerMedia = window.matchMedia('(hover: hover) and (pointer: fine)')
    const motionMedia = window.matchMedia('(prefers-reduced-motion: reduce)')

    const handlePointerChange = () => setIsTouchDevice(!pointerMedia.matches)
    const handleMotionChange = () => setPrefersReducedMotion(motionMedia.matches)

    handlePointerChange()
    handleMotionChange()

    pointerMedia.addEventListener('change', handlePointerChange)
    motionMedia.addEventListener('change', handleMotionChange)

    return () => {
      pointerMedia.removeEventListener('change', handlePointerChange)
      motionMedia.removeEventListener('change', handleMotionChange)
    }
  }, [])

  // ==========================================================================
  // 3. TÍNH TOÁN RESPONSIVE CHÍNH XÁC (Tránh giật giật khi đáp)
  // ==========================================================================
  const calculateMetrics = useCallback((): ResponsiveMetrics => {
    if (typeof window === 'undefined') {
      return {
        envScale: 1.0,
        targetWidth: LANDED_LETTER_MAX_WIDTH,
        targetHeight: LANDED_LETTER_MAX_HEIGHT,
        zEnd: Z_END,
        landedY: LANDED_LETTER_Y,
        letterRiseH: LETTER_RISE_H,
        arcRadius: ARC_RADIUS,
        envelopeYOffset: 85,
        perspective: PERSPECTIVE,
        isMobile: false,
        isLandscape: false,
      }
    }

    const vv = window.visualViewport
    const vw = vv ? vv.width : window.innerWidth
    const vh = vv ? vv.height : window.innerHeight

    const isDesktop = vw >= BREAKPOINTS.tablet
    const isLandscape = vw > vh && vh < 460
    const isMobile = vw < 768

    // 1. Tính hệ số co giãn phong bì: envScale = clamp(containerW / 410, 0.6, 1.25)
    let envScale = 1.0
    if (isDesktop) {
      envScale = 1.0 // Desktop giữ nguyên 100% không đổi
    } else if (isLandscape) {
      const scaleByH = (vh * 0.70) / ENVELOPE_HEIGHT
      const scaleByW = (vw * 0.55) / ENVELOPE_WIDTH
      envScale = Math.max(SCALE_LIMITS.min, Math.min(1.0, Math.min(scaleByW, scaleByH)))
    } else if (vw >= 768) {
      const scaleByW = (vw * 0.85) / ENVELOPE_WIDTH
      envScale = Math.max(0.9, Math.min(SCALE_LIMITS.max, scaleByW))
    } else {
      const scaleByW = (vw * 0.90) / ENVELOPE_WIDTH
      const scaleByH = (vh * 0.40) / ENVELOPE_HEIGHT
      envScale = Math.max(SCALE_LIMITS.min, Math.min(1.0, Math.min(scaleByW, scaleByH)))
    }

    // 2. Perspective & Z_END
    const P = isDesktop ? PERSPECTIVE : 1000
    let zEnd = 450
    let landedY = -14

    if (isDesktop) {
      zEnd = 450
      landedY = -14
    } else if (isLandscape) {
      zEnd = Math.round(P * 0.25)
      landedY = 0
    } else if (vw >= 768) {
      zEnd = Math.round(P * 0.35)
      landedY = Math.round(-14 * envScale)
    } else {
      zEnd = Math.round(P * 0.30)
      landedY = Math.round(-10 * envScale)
    }

    // Ràng buộc an toàn tránh đâm xuyên mặt phẳng camera
    const safetyBuffer = P - zEnd - 250
    if (safetyBuffer <= 50) {
      zEnd = Math.max(0, P - 320)
    }

    // Hệ số phối cảnh 3D tại điểm đáp
    const k = P / (P - zEnd)

    // 3. Tính targetWidth, targetHeight theo công thức: W_screen = targetWidth * k * envScale
    // Nhờ đó, kích thước thị giác lúc bay cuối cùng và lúc đáp là 100% TRÙNG KHỚP TUYỆT ĐỐI (không giật dù chỉ 1px)
    let targetWidth = 410
    let targetHeight = 544

    if (isDesktop) {
      targetWidth = 410
      targetHeight = 544
    } else if (isLandscape) {
      const maxHScreen = Math.min(vh * 0.86, 360)
      const maxWScreen = Math.round(maxHScreen * (410 / 544))
      targetHeight = Math.round(maxHScreen / (k * envScale))
      targetWidth = Math.round(maxWScreen / (k * envScale))
    } else if (vw >= 768) {
      const maxWScreen = Math.min(vw * 0.86, 560)
      targetWidth = Math.round(maxWScreen / (k * envScale))
      targetHeight = Math.round(targetWidth * (544 / 410))
    } else {
      const maxWScreen = Math.min(vw * 0.90, 420)
      targetWidth = Math.round(maxWScreen / (k * envScale))
      targetHeight = Math.round(targetWidth * (544 / 410))
    }

    const letterRiseH = Math.round(LETTER_RISE_H * envScale)
    const arcRadius = Math.round(ARC_RADIUS * envScale)
    const envelopeYOffset = Math.round(85 * envScale)

    return {
      envScale,
      targetWidth,
      targetHeight,
      zEnd,
      landedY,
      letterRiseH,
      arcRadius,
      envelopeYOffset,
      perspective: P,
      isMobile,
      isLandscape,
    }
  }, [])

  // Cập nhật metrics khi mount và lắng nghe resize/orientationchange có debounce 100ms
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout | null = null

    const handleResize = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        const next = calculateMetrics()
        setMetrics(next)
      }, 100)
    }

    handleResize()

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize)
    }

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize)
      }
    }
  }, [calculateMetrics])

  // Tỉ lệ thu nhỏ lá thư ban đầu để nhét vừa khít túi phong bì 340x240
  const scaleX_start = LETTER_POCKET_WIDTH / metrics.targetWidth
  const scaleY_start = LETTER_POCKET_HEIGHT / metrics.targetHeight

  // Khóa cuộn trang toàn màn hình khi lá thư đang mở để trải nghiệm cuộn lá thư tốt nhất
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prevOverflow
      }
    }
  }, [isOpen])

  // Sync external hover
  useEffect(() => {
    if (controlledHover !== undefined && !isOpen) {
      setIsHovered(controlledHover)
    }
  }, [controlledHover, isOpen])

  // Click outside phong bì trên Touch Device để thu hé nắp
  useEffect(() => {
    if (!isTouchDevice || isOpen || !isHovered) return

    const handlePointerDown = (e: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsHovered(false)
        onHover?.(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [isTouchDevice, isOpen, isHovered, onHover])

  // Clean up toàn bộ RAF và Timeout khi unmount
  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current)
      timeoutsRef.current.forEach((t) => clearTimeout(t))
      timeoutsRef.current = []
    }
  }, [])

  // ==========================================================================
  // 4. QUY TRÌNH MỞ PHONG BÌ & QUỸ ĐẠO BAY 3D TỐI ƯU HOÁ HIỆU NĂNG 60FPS
  // ==========================================================================
  const startOpenSequence = useCallback(() => {
    if (isOpen) return

    onOpen?.()

    // Hỗ trợ prefers-reduced-motion: đáp ngay không chuyển động
    if (prefersReducedMotion) {
      setIsOpen(true)
      setIsLanded(true)
      onFlightDone?.()
      return
    }

    setIsOpen(true)

    // 1. Mở nắp phong bì: 0° -> 180°
    if (flapRef.current) {
      flapRef.current.style.transition = `transform ${FLAP_OPEN_DURATION_MS}ms cubic-bezier(0.25, 1, 0.5, 1)`
      flapRef.current.style.transform = `translate3d(0, 0px, 3px) rotateX(180deg)`
    }

    // 2. Làm mờ con dấu sáp
    addSafeTimeout(() => {
      if (waxRef.current) {
        waxRef.current.style.transition = 'opacity 180ms ease-out'
        waxRef.current.style.opacity = '0'
      }
    }, 180)

    // 3. Đảo z-index của nắp ra sau lưng khi nắp gập qua 90° (KHÔNG set lại transform để không restart transition)
    addSafeTimeout(() => {
      if (flapRef.current) {
        flapRef.current.style.zIndex = '0'
      }
    }, FLAP_OPEN_DURATION_MS * 0.5)

    // 4. BẮT ĐẦU QUỸ ĐẠO BAY 4 GIAI ĐOẠN (Thao tác trực tiếp qua Ref để đạt 60fps)
    // Tắt transition trên nắp trước khi bay để nắp di chuyển đồng bộ 100% với thân bìa thư
    addSafeTimeout(() => {
      if (flapRef.current) {
        flapRef.current.style.transition = 'none'
      }
    }, FLAP_OPEN_DURATION_MS)

    const startTime = performance.now() + FLAP_OPEN_DURATION_MS

    const runFlight = (now: number) => {
      const elapsed = Math.max(0, now - startTime)

      if (elapsed <= 0) {
        rafId.current = requestAnimationFrame(runFlight)
        return
      }

      const p = Math.min(1, elapsed / FLIGHT_DURATION_MS)

      // Lấy metrics cập nhật mới nhất (ngay cả khi người dùng xoay màn hình khi đang bay)
      const curMetrics = metricsRef.current
      const curScaleX_start = LETTER_POCKET_WIDTH / curMetrics.targetWidth
      const curScaleY_start = LETTER_POCKET_HEIGHT / curMetrics.targetHeight

      const startApexY = -curMetrics.letterRiseH - curMetrics.arcRadius

      // Cập nhật zIndex qua ref tránh React re-render
      if (letterRef.current) {
        if (p < 0.22) {
          letterRef.current.style.zIndex = '5'
        } else {
          letterRef.current.style.zIndex = '50'
        }
      }

      let curY = 0
      let curZ = 0
      let curScaleX = curScaleX_start
      let curScaleY = curScaleY_start
      let curRotY = 0

      if (p < 0.22) {
        // GIAI ĐOẠN 1 (p 0 -> 0.22): Đi thẳng đứng lên, y: 0 -> -H0
        const t1 = p / 0.22
        const ease1 = 1 - Math.pow(1 - t1, 3)
        curY = -ease1 * curMetrics.letterRiseH
        curZ = 0
        curScaleX = curScaleX_start
        curScaleY = curScaleY_start
      } else if (p < 0.45) {
        // GIAI ĐOẠN 2 (p 0.22 -> 0.45): Cua 1/4 đường tròn trong mặt phẳng Y–Z
        const t2 = (p - 0.22) / 0.23
        const ease2 = 0.5 - 0.5 * Math.cos(t2 * Math.PI)
        const phi = ease2 * (Math.PI / 2)
        curY = -curMetrics.letterRiseH - curMetrics.arcRadius * Math.sin(phi)
        curZ = curMetrics.arcRadius * (1 - Math.cos(phi))

        const tExp = (p - 0.22) / 0.78
        const easeExp = 0.5 - 0.5 * Math.cos(tExp * Math.PI)
        curScaleX = curScaleX_start + (1 - curScaleX_start) * easeExp
        curScaleY = curScaleY_start + (1 - curScaleY_start) * easeExp
      } else {
        // GIAI ĐOẠN 3 (p 0.45 -> 1.00): Lao thẳng về phía camera, y hạ về landedY
        const t3 = (p - 0.45) / 0.55
        const ease3 = 0.5 - 0.5 * Math.cos(t3 * Math.PI)
        curY = startApexY + (curMetrics.landedY - startApexY) * ease3
        curZ = curMetrics.arcRadius + (curMetrics.zEnd - curMetrics.arcRadius) * ease3

        const tExp = (p - 0.22) / 0.78
        const easeExp = 0.5 - 0.5 * Math.cos(tExp * Math.PI)
        curScaleX = curScaleX_start + (1 - curScaleX_start) * easeExp
        curScaleY = curScaleY_start + (1 - curScaleY_start) * easeExp
      }

      // XOAY 360° ĐỒNG THỜI
      if (p < 0.22) {
        curRotY = 0
      } else {
        const tSpin = Math.min(1, (p - 0.22) / 0.78)
        const easeSpin = 0.5 - 0.5 * Math.cos(tSpin * Math.PI)
        curRotY = easeSpin * 360
      }

      // Ghi trực tiếp lên GPU transform của lá thư
      if (letterRef.current) {
        letterRef.current.style.transform = `translate3d(0, ${curY}px, ${curZ}px) rotateY(${curRotY}deg) scale(${curScaleX}, ${curScaleY})`
      }

      // Bìa thư và nắp rơi xuống và mờ dần đồng bộ
      let curEnvY = 0
      let curEnvOpacity = 1

      if (p < 0.12) {
        curEnvY = 0
        curEnvOpacity = 1
      } else if (p < 0.60) {
        const tEnv = (p - 0.12) / 0.48
        const easeEnv = 1 - Math.pow(1 - tEnv, 2)
        curEnvY = easeEnv * curMetrics.envelopeYOffset
        curEnvOpacity = Math.max(0, 1 - easeEnv)
      } else {
        curEnvY = curMetrics.envelopeYOffset
        curEnvOpacity = 0
      }

      if (envelopeBackRef.current) {
        envelopeBackRef.current.style.transform = `translate3d(0, ${curEnvY}px, -1px)`
        envelopeBackRef.current.style.opacity = `${curEnvOpacity}`
      }
      if (envelopeFoldsRef.current) {
        envelopeFoldsRef.current.style.transform = `translate3d(0, ${curEnvY}px, 2px)`
        envelopeFoldsRef.current.style.opacity = `${curEnvOpacity}`
      }
      if (flapRef.current) {
        flapRef.current.style.transform = `translate3d(0, ${curEnvY}px, -1px) rotateX(180deg)`
        flapRef.current.style.opacity = `${curEnvOpacity}`
      }

      // KẾT THÚC: Lá thư giữ nguyên 100% toạ độ đích, không thay đổi transform, không giật
      if (p >= 1) {
        setIsLanded(true)
        onFlightDone?.()
        return
      }

      rafId.current = requestAnimationFrame(runFlight)
    }

    rafId.current = requestAnimationFrame(runFlight)
  }, [
    isOpen,
    prefersReducedMotion,
    onOpen,
    onFlightDone,
    addSafeTimeout,
  ])

  // Keyboard accessibility
  const handleEnvelopeKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      startOpenSequence()
    }
  }

  // Pointer hover handlers
  const handlePointerEnter = () => {
    if (isTouchDevice || isOpen) return
    setIsHovered(true)
    onHover?.(true)
  }

  const handlePointerLeave = () => {
    if (isTouchDevice || isOpen) return
    setIsHovered(false)
    onHover?.(false)
  }

  const handleEnvelopeClick = () => {
    if (isTouchDevice && !isOpen) {
      if (!isHovered) {
        setIsHovered(true) // 1st tap = hé nắp
      } else {
        startOpenSequence() // 2nd tap = mở thư
      }
    } else {
      startOpenSequence()
    }
  }

  // Bọc memo children để khi bay 3D không bị re-render nội dung
  const memoizedChildren = useMemo(() => children, [children])

  // Cập nhật flap khi hover lúc chưa mở
  const flapAngle = !isOpen ? (isHovered ? 18 : 0) : 180
  const letterPeekY = !isOpen ? (isHovered ? -10 : 0) : 0

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center select-none w-full"
      style={{
        minHeight: '100svh',
        height: '100dvh',
        perspective: metrics.perspective,
        perspectiveOrigin: '50% 50%',
        padding:
          'env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px) env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px)',
        overflow: 'hidden',
      }}
    >
      {/* SVG Texture Noise Filter (Tối ưu 1 octave trên mobile để đạt 60fps) */}
      <svg className="pointer-events-none absolute size-0">
        <defs>
          <filter id={noiseId} x="0" y="0" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency={metrics.isMobile ? '0.75' : '0.85'}
              numOctaves={metrics.isMobile ? 1 : 2}
            />
          </filter>
        </defs>
      </svg>

      {/* =================================================================== */}
      {/* 1. KHUNG CO GIÃN ĐỒNG BỘ PHONG BÌ (WRAPPER SIZING & SCALE)           */}
      {/* =================================================================== */}
      <div
        ref={envelopeWrapperRef}
        className="relative flex items-center justify-center"
        style={{
          width: Math.round(ENVELOPE_WIDTH * metrics.envScale),
          height: Math.round(ENVELOPE_HEIGHT * metrics.envScale),
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Khung toạ độ thiết kế chuẩn 410x272 */}
        <div
          role={!isOpen ? 'button' : undefined}
          tabIndex={!isOpen ? 0 : -1}
          aria-label={
            !isOpen
              ? 'Phong bì thư mời tốt nghiệp IUH 2026. Nhấn Enter hoặc chạm để mở.'
              : undefined
          }
          onClick={handleEnvelopeClick}
          onKeyDown={handleEnvelopeKeyDown}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          className={[
            'relative cursor-pointer outline-none select-none',
            'transition-transform duration-300 ease-out',
            !isOpen && isHovered ? 'scale-[1.02]' : '',
            isLanded ? 'pointer-events-none' : '',
          ].join(' ')}
          style={{
            width: ENVELOPE_WIDTH,
            height: ENVELOPE_HEIGHT,
            transformOrigin: 'center center',
            transform: `scale(${metrics.envScale})`,
            transformStyle: 'preserve-3d',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {/* =============================================================== */}
          {/* LAYER 1: ENVELOPE BACK BODY & LINING                            */}
          {/* =============================================================== */}
          <div
            ref={envelopeBackRef}
            className="absolute inset-0 rounded-b-[6px] rounded-t-none bg-[linear-gradient(155deg,#3c5177,#283857)] shadow-[0_24px_35px_-12px_rgba(15,25,50,0.55)]"
            style={{
              zIndex: 1,
              transformStyle: 'preserve-3d',
              transform: 'translate3d(0, 0px, -1px)',
              opacity: 1,
              willChange: isOpen && !isLanded ? 'transform, opacity' : undefined,
            }}
          >
            <svg className="pointer-events-none absolute inset-0 size-full mix-blend-soft-light opacity-55">
              <rect width="100%" height="100%" filter={`url(#${noiseId})`} />
            </svg>
            <div className="absolute inset-0 rounded-b-[6px] rounded-t-none bg-[#1c2942]/65" />
          </div>

          {/* =============================================================== */}
          {/* LAYER 2: LÁ THƯ (GIỮ NGUYÊN TOẠ ĐỘ VÀ KÍCH THƯỚC KHI ĐÁP, KHÔNG GIẬT) */}
          {/* =============================================================== */}
          <div
            ref={letterRef}
            className="absolute"
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: metrics.targetWidth,
              height: metrics.targetHeight,
              marginLeft: -metrics.targetWidth / 2,
              marginTop: -metrics.targetHeight / 2,
              transformStyle: 'preserve-3d',
              zIndex: isLanded ? 50 : 5,
              transform: isLanded
                ? `translate3d(0, ${metrics.landedY}px, ${metrics.zEnd}px) rotateY(360deg)`
                : `translate3d(0, ${letterPeekY}px, 0px) scale(${scaleX_start}, ${scaleY_start})`,
              transition: !isOpen
                ? 'transform 350ms cubic-bezier(0.16, 1, 0.3, 1)'
                : undefined,
              willChange: isOpen && !isLanded ? 'transform' : undefined,
              pointerEvents: isLanded ? 'auto' : 'none',
            }}
          >
            {/* MẶT TRƯỚC LÁ THƯ (Chứa toàn bộ nội dung lời mời, gallery, countdown) */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                transform: 'rotateY(0deg) translateZ(0.5px)',
                transformStyle: 'preserve-3d',
                backfaceVisibility: isLanded ? 'visible' : 'hidden',
                WebkitBackfaceVisibility: isLanded ? 'visible' : 'hidden',
              }}
            >
              <div
                className="envelope-letter-card"
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 18,
                  overflowY: isLanded ? 'auto' : 'hidden',
                  overflowX: 'hidden',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  boxShadow:
                    '0 24px 60px -12px rgba(18, 36, 74, 0.32), 0 8px 24px rgba(18, 36, 74, 0.14)',
                  background: 'var(--paper, #faf6ee)',
                  WebkitOverflowScrolling: 'touch',
                  overscrollBehavior: 'contain',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    pointerEvents: isLanded ? 'auto' : 'none',
                  }}
                >
                  {memoizedChildren}
                </div>
              </div>
            </div>

            {/* MẶT SAU LÁ THƯ (Lưng giấy cao cấp khi lật 360 độ trong không gian) */}
            {!isLanded && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  transform: 'rotateY(180deg) translateZ(0.5px)',
                  transformStyle: 'preserve-3d',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                }}
              >
                <div
                  className="envelope-letter-card"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 18,
                    overflow: 'hidden',
                    boxShadow:
                      '0 24px 60px -12px rgba(18, 36, 74, 0.32), 0 8px 24px rgba(18, 36, 74, 0.14)',
                    background: '#ffffff',
                  }}
                >
                  <div
                    className="relative size-full"
                    style={{
                      background: 'linear-gradient(145deg, #ffffff 0%, #faf8f5 100%)',
                    }}
                  >
                    <svg className="pointer-events-none absolute inset-0 size-full opacity-15 mix-blend-multiply">
                      <rect width="100%" height="100%" filter={`url(#${noiseId})`} />
                    </svg>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* =============================================================== */}
          {/* LAYER 3: CÁC NẾP GẤP TÚI TRƯỚC (zIndex: 10)                     */}
          {/* =============================================================== */}
          <div
            ref={envelopeFoldsRef}
            className="pointer-events-none absolute inset-0 size-full overflow-hidden rounded-b-[6px] rounded-t-none"
            style={{
              zIndex: 10,
              transformStyle: 'preserve-3d',
              transform: 'translate3d(0, 0px, 2px)',
              opacity: 1,
              willChange: isOpen && !isLanded ? 'transform, opacity' : undefined,
            }}
          >
            <svg
              viewBox="0 0 410 272"
              className="size-full overflow-visible"
              fill="none"
            >
              <defs>
                <linearGradient id={`${noiseId}-fold-left`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#3d537b" />
                  <stop offset="100%" stopColor="#2b3b5a" />
                </linearGradient>
                <linearGradient id={`${noiseId}-fold-right`} x1="1" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3a4f76" />
                  <stop offset="100%" stopColor="#283856" />
                </linearGradient>
                <linearGradient id={`${noiseId}-fold-bottom`} x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#243450" />
                  <stop offset="100%" stopColor="#34486d" />
                </linearGradient>
              </defs>

              <path
                d="M 0,0 L 205,140 L 0,272 Z"
                fill={`url(#${noiseId}-fold-left)`}
                style={{ filter: 'drop-shadow(2px 0 3px rgba(10,20,40,0.25))' }}
              />
              <path
                d="M 410,0 L 205,140 L 410,272 Z"
                fill={`url(#${noiseId}-fold-right)`}
                style={{ filter: 'drop-shadow(-2px 0 3px rgba(10,20,40,0.25))' }}
              />
              <path
                d="M 0,272 L 205,124 L 410,272 Z"
                fill={`url(#${noiseId}-fold-bottom)`}
                style={{ filter: 'drop-shadow(0 -3px 5px rgba(10,20,40,0.32))' }}
              />
              <path
                d="M 0,272 L 205,124 L 410,272"
                stroke="rgba(255, 255, 255, 0.16)"
                strokeWidth="1.2"
                fill="none"
              />
            </svg>
          </div>

          {/* =============================================================== */}
          {/* LAYER 4: NẮP BÌA THƯ & DẤU SÁP CỘT NƠ                            */}
          {/* =============================================================== */}
          <div
            ref={flapRef}
            className="pointer-events-none absolute inset-x-0 top-0 h-[160px]"
            style={{
              transformOrigin: 'top center',
              transformStyle: 'preserve-3d',
              transform: `translate3d(0, 0px, ${isOpen ? -1 : 3}px) rotateX(${flapAngle}deg)`,
              zIndex: isOpen ? 0 : 25,
              opacity: 1,
              transition: !isOpen
                ? 'transform 350ms cubic-bezier(0.16, 1, 0.3, 1)'
                : undefined,
              willChange: isOpen && !isLanded ? 'transform, opacity' : undefined,
            }}
          >
            {/* Mặt ngoài của nắp */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
              }}
            >
              <svg
                viewBox="0 0 410 160"
                className="size-full overflow-visible"
                style={{ filter: 'drop-shadow(0 6px 8px rgba(10,20,45,0.45))' }}
              >
                <defs>
                  <linearGradient id={`${noiseId}-flap`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f6791" />
                    <stop offset="100%" stopColor="#3c5077" />
                  </linearGradient>
                </defs>
                <path d="M 0,-1.5 L 410,-1.5 L 205,160 Z" fill={`url(#${noiseId}-flap)`} />
                <line x1="0" y1="0.5" x2="410" y2="0.5" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" />
                <path d="M 0,0 L 205,160 L 410,0" stroke="rgba(255,255,255,0.18)" strokeWidth="1" fill="none" />
              </svg>
            </div>

            {/* Mặt trong của nắp (lót vàng kim, có gối đè 2px lên mép bản lề để triệt tiêu seam/khoảng hở trên mobile) */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                transform: 'rotateY(180deg)',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
              }}
            >
              <svg viewBox="0 0 410 160" className="size-full overflow-visible">
                <rect x="0" y="-3" width="410" height="4" fill="#2a3b5c" />
                <path d="M 0,-3 L 410,-3 L 205,160 Z" fill="#2a3b5c" />
                <path d="M 12,2 L 205,152 L 398,2" stroke="rgba(249, 178, 0, 0.28)" strokeWidth="1.2" fill="none" />
              </svg>
            </div>

            {/* Dấu sáp hồng cột nơ */}
            <div
              ref={waxRef}
              className="pointer-events-none absolute size-[62px] rounded-full"
              style={{
                left: '50%',
                top: 156,
                transform: 'translate(-50%, -50%)',
                background:
                  'radial-gradient(circle at 34% 30%, #fbdcdd 0%, #e3a9ae 46%, #c98a92 100%)',
                boxShadow:
                  'inset 0 2px 3px rgba(255,255,255,0.7), inset 0 -3px 5px rgba(150,70,85,0.5), 0 5px 9px rgba(0,0,0,0.38)',
                opacity: 1,
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
              }}
            >
              <img
                src="/img/bow.svg"
                alt="Bow"
                width={42}
                height={42}
                className="m-auto mt-2 size-[42px] drop-shadow-[0_1px_1px_rgba(120,50,65,0.6)]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* GỢI Ý TƯƠNG TÁC CHẠM / NHẤP MỞ PHONG BÌ */}
      {!isOpen && (
        <div
          className={[
            'envelope-hint-pill pointer-events-none absolute',
            'transition-all duration-300 ease-out',
            isHovered ? 'scale-105 opacity-100' : 'opacity-85',
          ].join(' ')}
          style={{
            bottom: 'max(24px, env(safe-area-inset-bottom, 24px))',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 40,
          }}
        >
          <span className="envelope-badge shadow-sm">
            {isTouchDevice
              ? isHovered
                ? 'Chạm lần nữa để mở thư'
                : 'Chạm để mở phong bì'
              : 'Nhấp để mở phong bì'}
          </span>
        </div>
      )}
    </div>
  )
}
