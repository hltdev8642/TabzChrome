'use client'

import { motion, useAnimation, type Variants } from 'motion/react'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import { cn } from '../../lib/utils'

export interface AnimatedIconHandle {
  startAnimation: () => void
  stopAnimation: () => void
}

const bodyVariants: Variants = {
  normal: { scale: 1 },
  animate: {
    scale: [1, 1.05, 1],
    transition: { duration: 0.4 }
  }
}

interface GithubIconProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number
  isHovered?: boolean
}

const GithubIcon = forwardRef<AnimatedIconHandle, GithubIconProps>(
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
        <motion.svg
          xmlns="http://www.w3.org/2000/svg"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={bodyVariants}
          initial="normal"
          animate={controls}
        >
          <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
          <path d="M9 18c-4.51 2-5-2-7-2" />
        </motion.svg>
      </div>
    )
  }
)

GithubIcon.displayName = 'GithubIcon'

export { GithubIcon }
