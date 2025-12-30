'use client'

import { motion, useAnimation, type Variants } from 'motion/react'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import { cn } from '../../lib/utils'

export interface AnimatedIconHandle {
  startAnimation: () => void
  stopAnimation: () => void
}

const waveVariants: Variants = {
  normal: { opacity: 1 },
  animate: (delay: number) => ({
    opacity: [1, 0.4, 1],
    transition: { duration: 0.6, delay, repeat: 1 }
  })
}

interface VolumeIconProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number
  isHovered?: boolean
}

const VolumeIcon = forwardRef<AnimatedIconHandle, VolumeIconProps>(
  ({ className, size = 20, isHovered, ...props }, ref) => {
    const controls = useAnimation()
    const isControlledRef = useRef(false)

    useEffect(() => {
      if (isHovered !== undefined) {
        isControlledRef.current = true
        controls.start(isHovered ? 'animate' : 'normal')
      }
    }, [isHovered, controls])

    useImperativeHandle(ref, () => ({
      startAnimation: () => {
        isControlledRef.current = true
        controls.start('animate')
      },
      stopAnimation: () => {
        isControlledRef.current = false
        controls.start('normal')
      }
    }))

    const handleMouseEnter = useCallback(() => {
      if (!isControlledRef.current && isHovered === undefined) {
        controls.start('animate')
      }
    }, [controls, isHovered])

    const handleMouseLeave = useCallback(() => {
      if (!isControlledRef.current && isHovered === undefined) {
        controls.start('normal')
      }
    }, [controls, isHovered])

    return (
      <div
        className={cn('select-none', className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" />
          <motion.path
            d="M16 9a5 5 0 0 1 0 6"
            variants={waveVariants}
            initial="normal"
            animate={controls}
            custom={0}
          />
          <motion.path
            d="M19.364 18.364a9 9 0 0 0 0-12.728"
            variants={waveVariants}
            initial="normal"
            animate={controls}
            custom={0.15}
          />
        </svg>
      </div>
    )
  }
)

VolumeIcon.displayName = 'VolumeIcon'

export { VolumeIcon }
