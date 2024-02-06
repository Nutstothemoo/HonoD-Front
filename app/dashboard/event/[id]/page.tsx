import Image from 'next/image';
import React, { FC } from 'react';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import Link from 'next/link';



export default async function Page({ params }: { params: { id: string } }) {
  
  const event = await fetchEvent(params.id);
  if (!event) return <div>Event not found</div>


  const startTime = dayjs(event.startTime).format('dddd D MMM YYYY à HH:mm');;
  const endTime = dayjs(event.endTime).format('dddd D MMM YYYY à HH:mm');;

  const tagNames = event.tags ? event.tags.map(tag => tag.name) : [];

  return (
    <>
      <div className='flex flex-col gap-3'>This is event Page</div>
      <h1>{event?.name}</h1>
      <p>{event?.description}</p>
      <p>Horaire: {startTime} - {endTime}</p>
      <p>Timezone: {event?.timezone}</p>
      <p>Address: {event?.geolocation.address}</p>
      <p>City: {event?.geolocation.city}</p>
      <p>Country: {event?.geolocation.country}</p>
      <p>Featured Text: {event?.featuredText}</p>
      <p>Is Festival: {event?.isFestival ? 'Yes' : 'No'}</p>
      <p>Is Sold Out: {event?.isSoldOut ? 'Yes' : 'No'}</p>
      <p>Ticket Price: {event?.minTicketPrice} {event?.currency}</p>
      <div>
        <h2>Artworks:</h2>
        {event?.artworks.map((artwork:any, index:any) => (
          <div key={index}>
            <img src={artwork.originalUrl} alt={artwork.id} />
          </div>
        ))}
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