import React from 'react'

interface InfoTooltipProps {
  tooltip: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export default function InfoTooltip({ tooltip, position = 'top' }: InfoTooltipProps) {
  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  }

  const arrowClasses = {
    top: 'top-full left-1/2 transform -translate-x-1/2 -mt-1',
    bottom: 'bottom-full left-1/2 transform -translate-x-1/2 -mb-1',
    left: 'left-full top-1/2 transform -translate-y-1/2 -ml-1',
    right: 'right-full top-1/2 transform -translate-y-1/2 -mr-1'
  }

  return (
    <div className="inline-block group relative">
      <span className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400 cursor-help ml-1 text-sm">
        ℹ️
      </span>
      <div
        className={`invisible group-hover:visible absolute z-[9999] w-64 p-3 text-xs
                    bg-gray-900 text-white rounded-lg shadow-xl ${positionClasses[position]}
                    pointer-events-none transition-opacity duration-200`}
      >
        <div className="relative">
          {tooltip}
        </div>
        {/* Arrow */}
        <div className={`absolute w-2 h-2 bg-gray-900 transform rotate-45 ${arrowClasses[position]}`}></div>
      </div>
    </div>
  )
}
