'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import VrpVisualization from '@/components/landing/VrpVisualization';

const BackgroundParticles = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-cyan-500/30 rounded-full"
          initial={{ 
            x: Math.random() * 100 + "%", 
            y: Math.random() * 100 + "%",
            opacity: Math.random() * 0.5
          }}
          animate={{ 
            y: [null, Math.random() * 100 + "%"],
            opacity: [0, 0.5, 0]
          }}
          transition={{ 
            duration: Math.random() * 10 + 10, 
            repeat: Infinity, 
            ease: "linear" 
          }}
        />
      ))}
    </div>
  );
};

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-8 overflow-hidden font-sans relative">
      <BackgroundParticles />
      
      {/* Background Decorative Accents */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
        className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-900/10 blur-[150px] rounded-full -z-10" 
      />
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2, delay: 0.5 }}
        className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-fuchsia-900/10 blur-[150px] rounded-full -z-10" 
      />

      <div className="w-full max-w-6xl z-10 flex flex-col items-center gap-12">
        
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <motion.h1
            initial={{ opacity: 0, y: -30, letterSpacing: "0.5em" }}
            animate={{ opacity: 1, y: 0, letterSpacing: "0.3em" }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="text-6xl md:text-8xl font-black text-white uppercase"
          >
            VELOCE
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="text-cyan-400 font-mono text-sm md:text-base tracking-[0.4em] uppercase"
          >
            Logistique & Routage Dynamique
          </motion.p>
        </div>

        {/* Central Visualization */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, rotateX: 20 }}
          animate={{ opacity: 1, scale: 1, rotateX: 0 }}
          transition={{ duration: 1.5, delay: 0.4, ease: "easeOut" }}
          className="w-full relative px-4 perspective-1000"
        >
          <div className="absolute inset-0 bg-cyan-500/5 blur-[120px] rounded-full" />
          <VrpVisualization />
        </motion.div>

        {/* Bottom CTA */}
        <div className="flex flex-col items-center gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.2 }}
          >
            <Link 
              href="/control-center"
              className="relative group px-16 py-5 rounded-full bg-white text-black font-bold tracking-widest uppercase text-xs transition-all duration-500 hover:bg-cyan-500 hover:text-white overflow-hidden shadow-[0_0_30px_rgba(255,255,255,0.1)]"
            >
              <span className="relative z-10">Accéder au Dashboard</span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </Link>
          </motion.div>
          
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            transition={{ delay: 1.5 }}
            className="text-[10px] text-white uppercase tracking-[0.3em]"
          >
            Smart Optimization Engine v1.0
          </motion.span>
        </div>
      </div>

      <style jsx global>{`
        .perspective-1000 {
          perspective: 1000px;
        }
      `}</style>
    </main>
  );
}
