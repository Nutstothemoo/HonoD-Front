"use client"
import React, { useState } from 'react';
import EventList, { Event } from './EventList';


interface EventSectionProps {
  events: Event[];
}

export const EventSection: React.FC<EventSectionProps> = ({ events }) => {
  
  const [hoverColor, setHoverColor] = useState('zinc-300');
  const [gradientDirection, setGradientDirection] = useState('tr');
  const handleMouseEnter = (color: string) => {
    console.log('color', color)
    setHoverColor('zinc-950');
    setGradientDirection(gradientDirection === 'tr' ? 'tl' : 'tr');
  };

  const handleMouseLeave = () => {
    console.log("ccoucou")
    setHoverColor('zinc-300');
  };
return (
  <div className="relative flex flex-col bg-zinc-950 pt-20 w-full items-center justify-between"> 
      <div className={`z-0 absolute inset-x-0 top-0 h-1/3 w-screen bg-gradient-to-${gradientDirection} from-${hoverColor} via-${hoverColor}/90 ${gradientDirection === 'tr' ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500 ease-in-out`}>
      </div>
      <div className={`z-0 absolute inset-x-0 top-0 h-1/3 w-screen bg-gradient-to-${gradientDirection} from-${hoverColor} via-${hoverColor}/80 ${gradientDirection === 'tr' ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500 ease-in-out`}>
      </div>
      <div className={`z-0 absolute inset-x-0 top-0 h-1/3 w-screen bg-gradient-to-${gradientDirection === 'tr' ? 'tl' : 'tr'} from-${hoverColor} via-${hoverColor}/80 ${gradientDirection === 'tr' ? 'opacity-0' : 'opacity-100'} transition-opacity duration-500 ease-in-out`}>
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