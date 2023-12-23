import React from 'react';
import Image from 'next/image';

interface EventCardProps {
  event: {
    id: string;
    thumbnailUrl: string;
    name: string;
    description: string;
  };
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
  return (
    <div key={event.id}>
      <Image src={event.thumbnailUrl} alt={event.name} width={500} height={300} />
      <h2>{event.name}</h2>
      <p>{event.description}</p>
    </div>
  );
};

export default EventCard;