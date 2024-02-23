"use client"
import Image from 'next/image';
import React, { FC } from 'react';
import { useRouter } from 'next/navigation';
import ButtonEvent from './ButtonEvent';
import { Event } from '../EventList';
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Badge } from '../ui/badge';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import Link from 'next/link';

import 'dayjs/locale/fr'; 
interface EventCardProps {
  event: Event;
}

const EventCard: FC<EventCardProps> = ({ event }) => {
  const router = useRouter();
  
  const goToEventPage = () => {
    router.push(`/Event/${event._id}`);
  };

  const tagNames = event.tags ? event.tags.map(tag => tag.name) : [];
  const tagsToShow = tagNames.slice(0, 3);
  const remainingTags = tagNames.length - tagsToShow.length;


  const now = dayjs();
  const startTime = dayjs(event.startTime);
  const endTime = dayjs(event.endTime);
  dayjs.extend(duration); 

  const getEventStatus = () => {
    dayjs.locale('fr'); 
    if (now.isAfter(endTime)) {
      return 'Terminé';
    } else if (now.isAfter(startTime)) {
      const remaining= dayjs.duration(endTime.diff(now));
      return `En cours || ${remaining.hours()} heures restantes`;
    } else if (now.add(1, 'hour').isAfter(startTime)) {
      return `Bientôt || ${startTime.format('HH:mm')}`;
    } else {
      const testduration = dayjs.duration(endTime.diff(startTime));
      if (testduration.hours() > 24) {
        return `${startTime.format('ddd D')} - ${endTime.format('ddd D MMMM')}`;
      } else {
        return `${startTime.format('ddd D MMMM')} || ${startTime.format('HH:mm')}`;
      }
    }
  };

  return (
    <a    
      onClick={goToEventPage}
      className="p-3 bg-darkcolor  bg-gradient-to-br from-darkcolor to-darkcolor border-black hover:scale-105 transition-transform duration-200 ease-in-out w-full md:w-3/4 lg:w-1/2 xl:w-1/3 h-full m-2 flex flex-col justify-center cursor-pointer items-center text-center gap-4 border-2 rounded-2xl">
      <AspectRatio ratio={16 / 9}>
        <Image 
          src={event.thumbnailUrl ?? ''} 
          alt={event.title} 
          width={16}
          height={9}
          className="w-full h-42 object-cover mb-4 rounded"
        />
      </AspectRatio>
      <h3 className="text-xl font-semibold">{event.title}</h3>
      <h3 className=''>{event.dealer}</h3>
      <div className='flex flex-row gap-40 '>      
      <p className="text-sm text-gray-200">{getEventStatus()}</p>
        <p className="text-sm text-gray-300">{event.minTicketPrice}€</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {tagsToShow.map((tag, index) => (          
            <Badge className='bg-secondcolor  hover:scale-105 last:rounded-2xl' key={index}>
              {tag}
              </Badge> 
        ))}
        {remainingTags > 0 && <Badge>{remainingTags}+</Badge> }
      </div>
      {/* <ButtonEvent className="mt-2 px-2 py-2" onClick={goToEventPage} text={`>>`} /> */}
    </a>
  );
};

export default EventCard;