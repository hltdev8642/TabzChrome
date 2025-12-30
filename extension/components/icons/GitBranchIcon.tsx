'use client'

import { motion, useAnimation, type Variants } from 'motion/react'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import { cn } from '../../lib/utils'

export interface AnimatedIconHandle {
  startAnimation: () => void
  stopAnimation: () => void
}

const pathVariants: Variants = {
  normal: { pathLength: 1, opacity: 1, pathOffset: 0 },
  animate: (delay: number) => ({
    pathLength: [0, 1],
    opacity: [0, 1],
    pathOffset: [1, 0],
    transition: { duration: 0.4, delay }
  })
}

interface GitBranchIconProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number
  isHovered?: boolean
}

const GitBranchIcon = forwardRef<AnimatedIconHandle, GitBranchIconProps>(
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
          <motion.line
            x1="6"
            x2="6"
            y1="3"
            y2="15"
            variants={pathVariants}
            initial="normal"
            animate={controls}
            custom={0}
          />
          <motion.circle
            cx="18"
            cy="6"
            r="3"
            variants={pathVariants}
            initial="normal"
            animate={controls}
            custom={0.1}
          />
          <motion.circle
            cx="6"
            cy="18"
            r="3"
            variants={pathVariants}
            initial="normal"
            animate={controls}
            custom={0.2}
          />
          <motion.path
            d="M18 9a9 9 0 0 1-9 9"
            variants={pathVariants}
            initial="normal"
            animate={controls}
            custom={0.15}
          />
        </svg>
      </div>
    )
  }
)

GitBranchIcon.displayName = 'GitBranchIcon'

export { GitBranchIcon }
