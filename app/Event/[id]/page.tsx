import Image from 'next/image';
import React  from 'react';
import dayjs from 'dayjs';
import GeolocationComponent from '@/components/Geolocation';
import DealerComponent from '@/components/Dealer';
import { TicketSection } from '@/components/TicketSection';
import { Badge } from '@/components/ui/badge';
import ReactPlayer from 'react-player';

export default async function Page({ params }: { params: { id: string } }) {
  
  const [event, tickets] = await Promise.all([
    fetchEvent(params.id),
    fetchTicket(params.id)
  ]);

  if (!event) return <div>Event not found</div>


  const startTime = dayjs(event.startTime).format('dddd D MMM YYYY à HH:mm');;
  const endTime = dayjs(event.endTime).format('dddd D MMM YYYY à HH:mm');;

  const tagNames = event.tags ? event.tags.map((tag: { name: any; })=> tag.name) : [];

  return (
    <div className='w-full border-black bg-darkcolor flex flex-col md:flex-row '>
      <div className='w-full md:w-2/3 flex flex-col items-center'>
        <h1 className="text-2xl font-bold mb-4">{event?.name}</h1>
        <DealerComponent dealer={event?.dealer} />
        <p className="text-md mb-2">{event?.description}</p>
        <div className='flex flex-row'>
          <p className="text-lg mb-2">{startTime} - {endTime}</p>
          <p className="text-md mb-2">Tz: {event?.timezone}</p>
        <GeolocationComponent geolocation={event?.geolocation} />
        </div>
        <p className="text-lg mb-2">Is Festival: {event?.isFestival ? 'Yes' : 'No'}</p>
        <p className="text-lg mb-2">Sold out: {event?.isSoldOut ? 'Yes' : 'No'}</p>
        <p className="text-lg mb-2"> Now at : {event?.minTicketPrice} {event?.currency}</p>
        <p className="text-lg mb-2"> Featured Text: {event?.featuredText}</p>
        <div className="mt-4">
          <h2 className="text-2xl font-bold mb-2">Artworks:</h2>
          <div className="grid grid-cols-3 gap-4">
            {event?.artworks?.map((artwork:any, index:any) => (
              <div key={index}>
                <Image src={artwork.originalUrl} alt={artwork.id} />
              </div>
            ))}
          </div>
        </div>
        
        <div>
        {
          tagNames.length > 0 && 
          <div>
            <h2>Vibe:</h2>
            <ul>
              {tagNames.map((tag:any, index:any) => (
                  <Badge className='rounded-3xl' key={index}>{tag}</Badge> 
              ))}
            </ul>
          </div>
        }
        </div>
        <ReactPlayer url={event?.videoUrl} />
      </div>
      <div className='w-full md:w-1/3'>
        <TicketSection tickets={tickets} />
      </div>
    </div>
  );
}

async function fetchEvent(id : string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/event/${id}`)
  if (!res.ok) return undefined
  return res.json()
}

async function fetchTicket(eventId : string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tickets/${eventId}`)
  if (!res.ok) return undefined
  return res.json()
}