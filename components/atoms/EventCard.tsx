"use client"
import Image from 'next/image';
import React, { FC, useState } from 'react';
import { useRouter } from 'next/navigation';
import ButtonEvent from './ButtonEvent';
import { Event } from '../EventList';
import { motion, AnimatePresence } from 'framer-motion';import { AspectRatio } from "@/components/ui/aspect-ratio"
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
  const [isSelected, setIsSelected] = useState(false);
  const goToEventPage = () => {
    setIsSelected(!isSelected);
    router.push(`/Event/${event._id}`);
  };

  const tagNames = event.tags ? event.tags.map(tag => tag.name) : [];
  const tagsToShow = tagNames.slice(0, 3);
  const remainingTags = tagNames.length - tagsToShow.length;


  const now = dayjs();
  // const startTime = dayjs.unix(event.startTime / 1000);
  // const endTime = dayjs.unix(event.endTime / 1000);
  const startTime = dayjs(event.startTime);
  console.log(startTime.format('dddd D MMM YYYY à HH:mm'))
  const endTime = dayjs(event.endTime);
  dayjs.extend(duration); 

  const getEventStatus = () => {
    dayjs.locale('fr');
    console.log(`Bientôt || ${startTime.format('DD/MM/YYYY HH:mm')}`)
    // console.log("now ",now)
    console.log("bool",now.isAfter(endTime))
    if (now.isAfter(endTime)) {
      return 'Terminé';
    } else if (now.isAfter(startTime)) {
      const remaining= dayjs.duration(endTime.diff(now));
      return `En cours || ${remaining.hours()} heures restantes`;
    } else if (now.add(1, 'hour').isAfter(startTime)) {
      return `Bientôt || ${startTime.format('DD/MM/YYYY HH:mm')}`;
      // return `Bientôt || ${startTime.format('HH:mm')}`;
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

    <AnimatePresence>
      <motion.a  
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={goToEventPage}
        className={`overflow-hidden  w-full h-full flex flex-col justify-center cursor-pointer items-center text-center gap-3 ${isSelected ? 'w-full h-full z-30' : ''}`}>
        <AspectRatio ratio={16 / 9}>
        <motion.div
            layout
            initial={{ position: 'relative' }}
            animate={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            transition={{ duration: 0.5 }}
          >
          <Image 
            src={event.thumbnailUrl ?? ''} 
            alt={event.title} 
            width={16}
            height={9}
            className="shadow-[5px_0_30px_0px_rgba(0,0,0,0.3)] w-full h-42 object-cover mb-4 rounded"
          />
          </motion.div>
        </AspectRatio>
        <h3 className="text-xl font-semibold">{event.title}</h3>
        <h3 className=''>{event.dealer}</h3>
        <div className='flex flex-row gap-40 '>      
        <p className="text-sm text-gray-200">{getEventStatus()}</p>
          <p className="text-sm text-gray-300">{event.minTicketPrice}€</p>
        </div>
        <div className="flex flex-wrap gap-2 min-h-15">
          {tagsToShow.map((tag, index) => (          
              <Badge className='bg-secondcolor  hover:scale-105 rounded-2xl' key={index}>
                  {tag}
              </Badge> 
          ))}
          {remainingTags > 0 && <Badge>{remainingTags}+</Badge> }
        </div>
        {/* <ButtonEvent className="mt-2 px-2 py-2" onClick={goToEventPage} text={`>>`} /> */}
      </motion.a>
    </AnimatePresence>
  );
};

export default EventCard;