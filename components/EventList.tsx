"use client"
import EventCard from './atoms/EventCard';
import Autoplay from "embla-carousel-autoplay"
import { useState, useRef } from 'react';

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

export interface Event {
  _id: string;
  title: string;
  color?: string;
  thumbnailUrl?: string;
  description?: string;
  tags?: any[];
  slug: string;
  dealer?: string;  
  minTicketPrice?:number;
  startTime: any; // Add this line
  endTime: any; //  
}

interface EventListProps {
  events: Event[];
  delay?: number;
  onMouseEnter: (color: string) => void;
  onMouseLeave: () => void;
}

const EventList: React.FC<EventListProps> = ({ events, delay, onMouseEnter, onMouseLeave }) => {
  // const [selectedId, setSelectedId] = useState<string | null>(null);
  // const handleClick = (id: string) => {
  //   setSelectedId(id);
  // };
  // const [private, setPrivate] = useState([]);

  const plugin = useRef(
    Autoplay({ delay: delay || 2000 , stopOnInteraction: true })
  );

  return (
    <div className="relative">
    <main className="z-10 items-center justify-center h-full w-4/5 rounded-xl md:px-10 lg:px-20 mx-auto flex flex-wrap ">
      <Carousel 
        plugins={[plugin.current]}
        onMouseEnter={plugin.current.stop}
        onMouseLeave={plugin.current.reset}
        className='w-11/12 rounded-lg'>
        <CarouselContent className='-ml-1 '>
          {events.map((event) => (
            <CarouselItem 
              className="pl-1 bg-zinc-900 bg-opacity-100 basis-1/1 md:basis-1/2 lg:basis-1/3 xl:basis-1/4 p-4 transition-all rounded-2xl duration-300 border-none overflow-hidden shadow-lg hover:shadow-xl outline-none  w-full h-full m-2 flex flex-col justify-center cursor-pointer items-center text-center gap-4 border-2 bg-zinc-500/5 hover:bg-zinc-500/20 focus:bg-zinc-500/20" 
              key={event._id}
              onMouseEnter={() => {
                console.log(event)
                onMouseEnter(event.color || 'zinc-300')
              }}              
              onMouseLeave={() => {
                console.log(event)
                onMouseLeave()}}
                >
              <EventCard event={event} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className='h-10 w-10 focus:text-white text-white border-zinc-900 bg-zinc-500/5 hover:bg-zinc-400/20 focus:bg-zinc-500/20'/>
        <CarouselNext className='h-10 w-10 text-white focus:text-white border-zinc-900 bg-zinc-500/5 hover:bg-zinc-400/20 focus:bg-zinc-500/20'/>
      </Carousel>
    </main>
  </div>
  );
};

export default EventList;

