import React from 'react';
import Navbar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { getSessionData } from '../actions';

export default async function EventLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const sessionData = await getSessionData()
  return (
    <>    
    <Navbar SessionData={sessionData} />
    <div className="flex flex-col items-center justify-between pt-24">
      {children}
      <Footer />
    </div>
    </>
  );
}




