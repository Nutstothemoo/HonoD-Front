'use client';

import React from 'react';
import { motion } from 'framer-motion';

const nodes = [
  { id: 1, x: 100, y: 100 },
  { id: 2, x: 300, y: 150 },
  { id: 3, x: 500, y: 100 },
  { id: 4, x: 700, y: 200 },
  { id: 5, x: 600, y: 400 },
  { id: 6, x: 400, y: 350 },
  { id: 7, x: 200, y: 450 },
  { id: 8, x: 150, y: 300 },
];

const path = "M 100 100 L 300 150 L 500 100 L 700 200 L 600 400 L 400 350 L 200 450 L 150 300 Z";

export default function VrpVisualization() {
  return (
    <div className="relative w-full max-w-4xl aspect-[16/9] mx-auto overflow-hidden rounded-xl bg-zinc-900/50 border border-zinc-800 shadow-2xl">
      {/* Map Grid Background */}
      <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 800 500">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-zinc-500" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 500">
        {/* Scanning Line */}
        <motion.rect
          width="800"
          height="2"
          fill="rgba(6, 182, 212, 0.2)"
          initial={{ y: -10 }}
          animate={{ y: 510 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          style={{ filter: "blur(2px)" }}
        />

        {/* Connections */}
        <motion.path
          d={path}
          fill="none"
          stroke="rgba(6, 182, 212, 0.2)"
          strokeWidth="2"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 2, ease: "easeInOut" }}
        />

        {/* Optimal Path Pulse */}
        <motion.path
          d={path}
          fill="none"
          stroke="url(#pulseGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0, pathOffset: 0, opacity: 0 }}
          animate={{ 
            pathLength: [0.1, 0.2, 0.1],
            pathOffset: [0, 1],
            opacity: [0, 1, 0]
          }}
          transition={{ 
            duration: 4, 
            repeat: Infinity, 
            ease: "linear" 
          }}
        />

        <defs>
          <linearGradient id="pulseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
          
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Nodes */}
        {nodes.map((node) => (
          <g key={node.id}>
            {/* Glow effect */}
            <motion.circle
              cx={node.x}
              cy={node.y}
              r="6"
              fill="#06b6d4"
              className="opacity-40"
              filter="url(#glow)"
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity, 
                delay: node.id * 0.2 
              }}
            />
            {/* Actual Node */}
            <circle
              cx={node.x}
              cy={node.y}
              r="3"
              fill="#fff"
              className="shadow-sm"
            />
          </g>
        ))}
      </svg>
    </div>
  );
}
