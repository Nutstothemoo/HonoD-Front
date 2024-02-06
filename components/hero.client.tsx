'use client'

import React from 'react';
import Button from './atoms/Button';
import { useState } from 'react';
import { motion } from 'framer-motion';
import LoginNav from './LoginNav';

function RevolutionaryTicketSection() {
  
  const [showNewComponent, setShowNewComponent] = useState(false);
  const handleClick = () => {
    setShowNewComponent(true);
  };

  return showNewComponent ? (
    <LoginNav />
  ) : (
    <motion.section
      className="flex items-center justify-center text-white py-16"
      initial={{ opacity: 0}}
      animate={{ opacity: 1}}
      exit={{ opacity: 0 }}
    >
    <div className="container mx-auto text-center">
        <h2 className="text-4xl font-extrabold">
          Achetez des billets révolutionnaires
          </h2>
        <p className="text-lg mt-4">
          Découvrez une nouvelle façon de vivre des expériences inoubliables au meilleur prix.
        </p>
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-lg block glow">
            <h3 className="text-xl font-semibold">Sélection variée</h3>
            <p className="mt-2">Trouvez des billets pour une grande variété d événements.</p>
          </div>
          <div className="p-6 rounded-lg block glow">
            <h3 className="text-xl font-semibold">Achats simplifiés</h3>
            <p className="mt-2">Achetez vos billets en quelques clics</p>
          </div>
          <div className="p-6 rounded-lg block glow">
            <h3 className="text-xl font-semibold">Expériences uniques</h3>
            <p className="mt-2">Vivez des événements inoubliables avec nos billets exclusifs.</p>
          </div>
      <Button text="Se connecter" onClick={handleClick} size="large"/>
        </div>
    </div>
    </motion.section>
  );
}


export default RevolutionaryTicketSection;
