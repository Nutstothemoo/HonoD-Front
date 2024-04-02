"use client"
import React, { useState } from 'react';
import EventList, { Event } from './EventList';


interface EventSectionProps {
  events: Event[];
}

export const EventSection: React.FC<EventSectionProps> = ({ events }) => {
  
  const [hoverColor, setHoverColor] = useState('zinc-800');
  const [gradientDirection, setGradientDirection] = useState('tr');
  const handleMouseEnter = (color: string) => {
    setHoverColor(color);
    setGradientDirection(gradientDirection === 'tr' ? 'tl' : 'tr');
  };

  const handleMouseLeave = () => {
    setHoverColor('zinc');
  };
return (
  <div className="z-0 relative flex flex-col bg-zinc-950 pt-20 w-full items-center justify-between"> 
      <div className="z-1 absolute inset-x-0 top-0 h-1/3 w-screen">
        <div className={`absolute inset-0 bg-gradient-to-tr from-zinc-950 via-zinc-950 to-${hoverColor}-500 transition-opacity duration-1000 ease-in-out ${gradientDirection === 'tr' ? 'opacity-100' : 'opacity-0'}`}></div>
        <div className={`absolute inset-0 bg-gradient-to-tl from-zinc-950 via-zinc-950 to-${hoverColor}-500 transition-opacity duration-1000 ease-in-out ${gradientDirection === 'tr' ? 'opacity-0' : 'opacity-100'}`}></div>
      </div>
      <div className='relative z-3 text-white text-2xl text-center font-bold p-4'>Discover Our Latest Fueg Event
      </div>
      <div className='relative z-3 w-3/4 text-white text-lg font-bold text-left p-3'> Made for You 
      </div>
      <EventList events={events} delay={1800} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}/>
      <div className='z-3 w-3/4 text-white text-lg font-bold text-left p-3'>Discover Your Private Event 
      </div>
      <EventList events={events} delay={2300} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}/>       
    </div>
  )
}