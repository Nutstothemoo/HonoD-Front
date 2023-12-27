import React from 'react';
import Link from 'next/link';

function Navbar() {
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

        <div className="md:flex items-center">
          <div className="flex flex-col md:flex-row md:mx-6">
            <Link href="/dashboard/events" className="my-1 text-sm font-medium md:mx-4 md:my-0">
            Events
            </Link>
            <Link href="/dashboard/ticket" className="my-1 text-sm font-medium md:mx-4 md:my-0">
              Ticket
            </Link>
            <Link href="/dashboard/profil" className="my-1 text-sm font-medium md:mx-4 md:my-0">
              Profil
            </Link>
          </div>

          {/* <div className="mt-3 md:mt-0">
            <form className="flex">
              <input className="w-full px-4 py-2 border rounded-lg focus:outline-none" type="text" placeholder="Rechercher" />
            </form>
          </div> */}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;