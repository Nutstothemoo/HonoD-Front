'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRightIcon } from '@radix-ui/react-icons';
import ShaderBackground from '@/components/ui/shader-background';
import BackgroundPaths from '@/components/ui/background-paths';

export default function LandingPage() {
  const router = useRouter();
  const [isExiting, setIsExiting] = useState(false);

  const handleEnter = () => {
    if (isExiting) return;
    setIsExiting(true);
    router.prefetch('/control-center');
    window.setTimeout(() => {
      router.push('/control-center');
    }, 850);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#040509] font-sans">
      <ShaderBackground />

      {/* Animated SVG paths layered above the shader */}
      <div className="pointer-events-none fixed inset-0 z-0 mix-blend-screen opacity-70">
        <BackgroundPaths />
      </div>

      {/* Vignette to deepen the shader */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(0,0,0,0.55)_70%,_rgba(0,0,0,0.85)_100%)]" />

      <AnimatePresence>
        {!isExiting && (
          <motion.div
            key="login-shell"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, filter: 'blur(20px)', scale: 1.04 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6"
          >
            {/* Top label */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-2 text-[10px] uppercase tracking-[0.4em] text-white/40"
            >
              <span className="block h-px w-8 bg-white/20" />
              Plateforme d&apos;orchestration logistique
              <span className="block h-px w-8 bg-white/20" />
            </motion.div>

            {/* Glass card */}
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-md"
            >
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-10 backdrop-blur-2xl shadow-[0_30px_120px_-20px_rgba(30,80,200,0.45)]">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br from-cyan-400/10 via-transparent to-blue-500/10" />

                <div className="relative flex flex-col items-center gap-6">
                  <motion.div
                    initial={{ opacity: 0, letterSpacing: '0.6em' }}
                    animate={{ opacity: 1, letterSpacing: '0.32em' }}
                    transition={{ duration: 1.2, delay: 0.4, ease: 'easeOut' }}
                    className="text-4xl font-black uppercase text-white"
                  >
                    Veloce
                  </motion.div>

                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.55 }}
                    transition={{ duration: 0.8, delay: 0.8 }}
                    className="font-mono text-[10px] uppercase tracking-[0.4em] text-cyan-300"
                  >
                    Routage dynamique · Décisions temps réel
                  </motion.p>

                  <div className="my-1 h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />

                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 1 }}
                    className="text-center text-sm leading-relaxed text-white/65"
                  >
                    L&apos;orchestration de vos tournées,
                    <br />
                    <span className="text-white">sans angle mort.</span>
                    <br />
                    <span className="mt-2 inline-block text-xs text-white/35">
                      Cockpit unifié — livraisons, conducteurs, incidents.
                    </span>
                  </motion.p>

                  <motion.button
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 1.15 }}
                    onClick={handleEnter}
                    disabled={isExiting}
                    className="group relative mt-2 inline-flex h-12 w-full items-center justify-center overflow-hidden rounded-full bg-white px-8 text-[11px] font-bold uppercase tracking-[0.32em] text-black transition-colors duration-500 hover:text-white disabled:cursor-not-allowed"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                    <span className="relative z-10 flex items-center gap-3">
                      {isExiting ? (
                        <>
                          <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                          Connexion
                        </>
                      ) : (
                        <>
                          Entrer dans le cockpit
                          <ArrowRightIcon className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1" />
                        </>
                      )}
                    </span>
                  </motion.button>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 1.4 }}
                    className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/30"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
                    Tous systèmes nominaux
                  </motion.div>
                </div>
              </div>
            </motion.div>

            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.25 }}
              transition={{ delay: 1.6 }}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.3em] text-white"
            >
              Veloce Engine · v1.0 — accès opérateur authentifié
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exit flash to bridge into the cockpit */}
      <AnimatePresence>
        {isExiting && (
          <motion.div
            key="exit-flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="fixed inset-0 z-20 bg-zinc-950"
          />
        )}
      </AnimatePresence>
    </main>
  );
}
