'use client'

import { motion, useAnimation, type Variants } from 'motion/react'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import { cn } from '../../lib/utils'

export interface AnimatedIconHandle {
  startAnimation: () => void
  stopAnimation: () => void
}

const rectVariants: Variants = {
  normal: { scale: 1, opacity: 1 },
  animate: (delay: number) => ({
    scale: [1, 0.8, 1],
    opacity: [1, 0.6, 1],
    transition: { duration: 0.3, delay }
  })
}

interface GridIconProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number
  isHovered?: boolean
}

const GridIcon = forwardRef<AnimatedIconHandle, GridIconProps>(
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
          {/* 3x3 grid of rects */}
          <motion.rect x="2" y="2" width="5" height="5" rx="1" variants={rectVariants} initial="normal" animate={controls} custom={0} />
          <motion.rect x="9.5" y="2" width="5" height="5" rx="1" variants={rectVariants} initial="normal" animate={controls} custom={0.05} />
          <motion.rect x="17" y="2" width="5" height="5" rx="1" variants={rectVariants} initial="normal" animate={controls} custom={0.1} />
          <motion.rect x="2" y="9.5" width="5" height="5" rx="1" variants={rectVariants} initial="normal" animate={controls} custom={0.05} />
          <motion.rect x="9.5" y="9.5" width="5" height="5" rx="1" variants={rectVariants} initial="normal" animate={controls} custom={0.1} />
          <motion.rect x="17" y="9.5" width="5" height="5" rx="1" variants={rectVariants} initial="normal" animate={controls} custom={0.15} />
          <motion.rect x="2" y="17" width="5" height="5" rx="1" variants={rectVariants} initial="normal" animate={controls} custom={0.1} />
          <motion.rect x="9.5" y="17" width="5" height="5" rx="1" variants={rectVariants} initial="normal" animate={controls} custom={0.15} />
          <motion.rect x="17" y="17" width="5" height="5" rx="1" variants={rectVariants} initial="normal" animate={controls} custom={0.2} />
        </svg>
      </div>
    )
  }
)

GridIcon.displayName = 'GridIcon'

export { GridIcon }
