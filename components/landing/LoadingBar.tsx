'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function LoadingBar() {
  return (
    <div className="w-full max-w-md mx-auto mt-12 space-y-2">
      <div className="flex justify-between text-xs font-mono text-cyan-500/60 uppercase tracking-widest">
        <span>Optimization in progress</span>
        <motion.span
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          Active
        </motion.span>
      </div>
      <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden relative">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-blue-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ 
            duration: 5, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        />
      </div>
    </div>
  );
}
