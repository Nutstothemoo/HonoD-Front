import React from 'react';
import DropdownMenuAvatar from '@/components/AvatarDropDownMenu';
import EventList from '@/components/EventList';
export default async function DashBoard() {

  // const events = await fetchEvents()
  const events = [
    { id: 1, title: 'Event 1', description: 'This is event 1' },
    { id: 2, title: 'Event 2', description: 'This is event 2' },
    { id: 3, title: 'Event 3', description: 'This is event 3' },
    { id: 4, title: 'Event 4', description: 'This is event 4' },
    { id: 5, title: 'Event 5', description: 'This is event 5' },
  ];

  return (
    <>
      <div>This is the dashboard</div>
      <EventList events={events}/>
    </>
  );
}


async function fetchEvents() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/events`)
  if (!res.ok) return undefined
  return res.json()
}
