import React, { useEffect, useState } from 'react';
import DropdownMenuAvatar from '@/components/AvatarDropDownMenu';
import EventList from '@/components/EventList';
import Navbar from '@/components/NavBar';
import Footer from '@/components/Footer';

export default async function DashBoard() {
  const events = await fetchEvents();

  return (
    <>
      <main className="flex flex-col items-center justify-between pt-24">
        <Navbar isAuthenticated={true} />
        <div className='flex flex-col gap-3'>Discover Our Latest Fueg Event</div>
        <EventList events={events}/>
        <Footer />
      </main>
    </>
  );
}


async function fetchEvents() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/events`)
  if (!res.ok) return undefined
  return res.json()
}
