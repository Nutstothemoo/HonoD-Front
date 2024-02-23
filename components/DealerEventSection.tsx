
"use client"
import AddEventForm from '@/components/AddEventForm'
import { Button } from "@/components/button"
import React from 'react'
import {motion} from 'framer-motion'
import { useState } from 'react'
import DealerEventManager from '@/components/DealerEventManager';

const DealerEventSection: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const toggleForm = () => {
    setShowForm(!showForm);
  };
  const variants = {
    open: { opacity: 1, z: 0 },
    closed: { opacity: 0, z: "-100%" },
  };

  return (
    <>
      {!showForm ? (
        <Button onClick={toggleForm}>Add Event</Button>
      ) : (
        <Button onClick={toggleForm}>Retour</Button>
      )}
      <motion.div
        animate={showForm ? "open" : "closed"}
        variants={variants}
        transition={{ duration: 0.5 }}
      >
        {showForm ? <AddEventForm /> : <DealerEventManager />}
      </motion.div>
    </>
  )
}

export default DealerEventSection

