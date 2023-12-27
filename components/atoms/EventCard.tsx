import Image from 'next/image';
import React, { FC } from 'react';

interface Event {
  id: number;
  title: string;
  description: string;
  imageUrl: string; 

}

interface EventCardProps {
  event: Event;
}

const EventCard: FC<EventCardProps> = ({ event }) => (
  <div className="p-6 rounded-lg min-w-120 min-h-150 flex flex-col justify-center items-center text-center">
    <h3 className="text-xl font-semibold">{event.title}</h3>
    <Image 
    src={event.imageUrl} 
    alt={event.title} 
    className="w-full h-42 object-cover mb-4 rounded" />
    <p className="mt-2">{event.description}</p>
    <button className="mt-2 px-2 py-2 rounded block glow">More details</button>
  </div>
);

export default EventCard;

