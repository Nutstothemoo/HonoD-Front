import React from 'react';
import Link from 'next/link';
import DropdownMenuAvatar from '@/components/AvatarDropDownMenu';

interface NavbarProps {
  isAuthenticated: boolean;
}


const Navbar: React.FC<NavbarProps> = ({ isAuthenticated})=> {
  return (
    <nav className="top-0 fixed w-full shadow">
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
        {isAuthenticated ? (
          <div className='absolute top-3 right-2'>
            <DropdownMenuAvatar />
          </div>
        ) : (
          <div className='absolute top-3 right-2'>
            <Link href="/login">
              <a className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full">
                Login
              </a>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
