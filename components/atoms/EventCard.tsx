"use client"
import Image from 'next/image';
import React, { FC } from 'react';
import { useRouter } from 'next/navigation';
import ButtonEvent from './ButtonEvent';
import { Event } from '../EventList';

interface EventCardProps {
  event: Event;
}

const EventCard: FC<EventCardProps> = ({ event }) => {
  const router = useRouter();
  
  const goToEventPage = () => {
    router.push(`/${event.title}/${event.id}`);
  };

  return (
    <div
      className="p-6 rounded-lg min-w-500 min-h-150 flex flex-col justify-center items-center text-center">
      <h3 className="text-xl font-semibold">{event.title}</h3>
      <Image 
        src={event.thumbnailUrl ?? ''} 
        alt={event.title} 
        className="w-full h-42 object-cover mb-4 rounded"
      />
      <p className="mt-2">{event.description}</p>
      <ButtonEvent className= "mt-2 px-2 py-2 " onClick={goToEventPage} text={`>>`} />
    </div>
  );
};

export default EventCard;
