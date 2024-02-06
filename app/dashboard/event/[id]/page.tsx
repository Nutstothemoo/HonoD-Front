import Image from 'next/image';
import React, { FC } from 'react';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import Link from 'next/link';
import GeolocationComponent from '@/components/Geolocation';
import DealerComponent from '@/components/Dealer';



export default async function Page({ params }: { params: { id: string } }) {
  
  const event = await fetchEvent(params.id);
  if (!event) return <div>Event not found</div>


  const startTime = dayjs(event.startTime).format('dddd D MMM YYYY à HH:mm');;
  const endTime = dayjs(event.endTime).format('dddd D MMM YYYY à HH:mm');;

  const tagNames = event.tags ? event.tags.map(tag => tag.name) : [];

  return (
    <>
      <div className='flex flex-col gap-3'>This is event Page</div>
      <h1 className="text-4xl font-bold mb-4">{event?.name}</h1>
      <p className="text-lg mb-2">{event?.description}</p>
    <p className="text-lg mb-2">Horaire: {startTime} - {endTime}</p>
    <p className="text-lg mb-2">Timezone: {event?.timezone}</p>
      <DealerComponent dealer={event?.dealer} />
      <GeolocationComponent geolocation={event?.geolocation} />
      <p className="text-lg mb-2">Featured Text: {event?.featuredText}</p>
  <p className="text-lg mb-2">Is Festival: {event?.isFestival ? 'Yes' : 'No'}</p>
  <p className="text-lg mb-2">Is Sold Out: {event?.isSoldOut ? 'Yes' : 'No'}</p>
  <p className="text-lg mb-2">Ticket Price: {event?.minTicketPrice} {event?.currency}</p>
      <div className="mt-4">
        <h2 className="text-2xl font-bold mb-2">Artworks:</h2>
        <div className="grid grid-cols-3 gap-4">
          {event?.artworks.map((artwork:any, index:any) => (
            <div key={index}>
              <img src={artwork.originalUrl} alt={artwork.id} />
            </div>
          ))}
        </div>
      </div>
      <div>
      {
        tagNames.length > 0 && 
        <div>
          <h2>Tags:</h2>
          <ul>
            {tagNames.map((tag:any, index:any) => (
              <li key={index}>{tag}</li>
            ))}
          </ul>
        </div>
      }
      </div>
    </>
  );
}


async function fetchEvent(id : string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/event/${id}`)
  if (!res.ok) return undefined
  return res.json()
}

async function fetchTicket(eventId : string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/event/${eventId}/tickets`)
  if (!res.ok) return undefined
  return res.json()
}