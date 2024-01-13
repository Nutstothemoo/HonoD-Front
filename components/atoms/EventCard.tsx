"use client"
import Image from 'next/image';
import React, { FC } from 'react';
import { useRouter } from 'next/navigation';
import ButtonEvent from './ButtonEvent';
import { Event } from '../EventList';
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Badge } from '../ui/badge';

interface EventCardProps {
  event: Event;
}

const EventCard: FC<EventCardProps> = ({ event }) => {
  const router = useRouter();
  
  const goToEventPage = () => {
    router.push(`/${event.title}/${event.id}`);
  };
  const tags = event.tags || []; 
  const tagsToShow = tags.slice(0, 5);
  const remainingTags = tags.length - tagsToShow.length;

  return (
    <div className="p-6 rounded-lg w-400 h-400 flex flex-col justify-center items-center text-center">
      <AspectRatio ratio={16 / 9}>
        <Image 
          src={event.thumbnailUrl ?? ''} 
          alt={event.title} 
          className="w-full h-42 object-cover mb-4 rounded"
        />
      </AspectRatio>
      <h3 className="text-xl font-semibold">{event.title}</h3>
      <h3 className=''>{event.dealer}</h3>
      <div className="flex flex-wrap">
        {tagsToShow.map((tag, index) => (
          <Badge key={index}>{tag}</Badge> 
        ))}
        {remainingTags > 0 && <Badge>`{remainingTags}`</Badge> }
      </div>
      <ButtonEvent className="mt-2 px-2 py-2" onClick={goToEventPage} text={`>>`} />
    </div>
  );
};

export default EventCard;