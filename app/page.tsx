import React, { useEffect, useState } from 'react';
import EventList from '@/components/EventList';
import Navbar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { getSessionData } from './actions';
import { cookies } from 'next/headers';
import { EventSection } from '@/components/EventSection';


export default async function DashBoard() {
  const events = await fetchEvents();
  const sessionData = await getSessionData()

  const cookieStore = cookies()
  cookieStore.getAll().map((cookie) => (
    console.log(cookie)
  ))  
  return (
    <>
      <Navbar SessionData={sessionData} />
      <main className="w-full min-h-screen bg-zinc-950 ">
        <EventSection events={events} />
      </main>
      <Footer />
    </>
  );
}


async function fetchEvents() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/events`)
  if (!res.ok) return undefined
  return res.json()
}


