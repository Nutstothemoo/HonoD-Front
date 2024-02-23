import React from 'react';
import Navbar from '@/components/NavBar';
import Footer from '@/components/Footer';

export default function EventLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>    
    <Navbar isAuthenticated={true} />
    <div className="flex flex-col items-center justify-between pt-24">
      {children}
      <Footer />
    </div>
    </>
  );
}




