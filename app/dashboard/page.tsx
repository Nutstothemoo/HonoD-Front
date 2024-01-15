import React from 'react';
import DropdownMenuAvatar from '@/components/AvatarDropDownMenu';
import EventList from '@/components/EventList';
export default async function DashBoard() {

  // const events = await fetchEvents()
  const events = [
    { 
      id: '1', 
      title: 'Techno Beats Festival', 
      description: 'Experience the best of techno music.', 
      tags: ['techno', 'music', 'festival'], 
      dealer: 'Music Events Inc.',
      price: 50,
      date: '2022-12-01',
      startTime: '2024-12-01T10:00:00', // Add this line
      endTime: '2024-12-01T20:00:00', // Add this line
    },
    { 
      id: '2', 
      title: 'Electronic Dance Night', 
      description: 'Dance the night away with electronic beats.', 
      tags: ['electronic', 'dance', 'night'], 
      dealer: 'Nightlife Music',
      price: 35,
      date: '2022-12-15',
      startTime: '2024-15-15T22:00:00', // Add this line
      endTime: '2024-15-16T04:00:00', // Add this line
    },
    { 
      id: '3', 
      title: 'Synth Rave Party', 
      description: 'Join the ultimate synth rave party.', 
      tags: ['synth', 'rave', 'party'], 
      dealer: 'Rave Organizers',
      price: 40,
      date: '2023-01-05',
      startTime: '2023-01-05T20:00:00', // Add this line
      endTime: '2023-01-06T02:00:00', // Add this line
    },
    { 
      id: '4', 
      title: 'DJ Mix Battle', 
      description: 'Witness the best DJs battle it out.', 
      tags: ['DJ', 'mix', 'battle'], 
      dealer: 'DJ Events',
      price: 45,
      date: '2023-01-20',
      startTime: '2023-01-20T19:00:00', // Add this line
      endTime: '2023-01-20T23:00:00', // Add this line
    },
    { 
      id: '5', 
      title: 'Underground Techno Show', 
      description: 'Discover the underground techno scene.', 
      tags: ['underground', 'techno', 'show'], 
      dealer: 'Underground Music',
      price: 55,
      date: '2023-02-10',
      startTime: '2023-02-10T21:00:00', // Add this line
      endTime: '2023-02-11T03:00:00', // Add this line
    },
  ];

  return (
    <>
      <div className='flex flex-col gap-3'>This is the dashboard</div>
      <EventList events={events}/>
    </>
  );
}


async function fetchEvents() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/events`)
  if (!res.ok) return undefined
  return res.json()
}
