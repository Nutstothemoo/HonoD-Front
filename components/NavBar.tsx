import React from 'react';
import Link from 'next/link';
import DropdownMenuAvatar from '@/components/AvatarDropDownMenu';

interface NavbarProps {
  SessionData: any;
}


const Navbar: React.FC<NavbarProps> = ({ SessionData})=> {
  return (
    <div className="top-0 fixed w-full shadow bg-black opacity-90">
      <div className="container mx-auto px-6 py-3 md:flex md:justify-between md:items-center">
        <div className="flex justify-between items-center">
          <div>
            <Link href="/" className="text-xl font-bold md:text-2xl">
                  Logo
            </Link>
          </div>
        </div>

        <div className="sm:hidden">
          <div className="flex flex-col md:flex-row md:mx-6">
            <Link href="/dashboard/events" className="my-1 text-sm font-medium md:mx-4 md:my-0">
            Events
            </Link>
            <Link href="/dashboard/ticket" className="my-1 text-sm font-medium md:mx-4 md:my-0">
              Ticket
            </Link>
          </div>
        </div>
        {SessionData ? (
          <div className='absolute top-3 right-2'>
            <DropdownMenuAvatar SessionData= {SessionData}/>
          </div>
        ) : (
          <div className='absolute top-3 right-2'>
            <Link href="/login"
                  className="w-30 z-30 bg-darkcolor font-bold md:text-xl rounded-full">
                Login      
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default Navbar;
