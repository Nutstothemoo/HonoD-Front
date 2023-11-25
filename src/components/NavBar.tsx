import React from 'react';
import Link from 'next/link';

function Navbar() {
  return (
    <nav className="top-0 fixed w-full shadow">
      <div className="container mx-auto px-6 py-3 md:flex md:justify-between md:items-center">
        <div className="flex justify-between items-center">
          <div>
            <Link href="/">
              <a className="text-xl font-bold md:text-2xl">Logo</a>
            </Link>
          </div>
        </div>

        <div className="md:flex items-center">
          <div className="flex flex-col md:flex-row md:mx-6">
            <Link href="/events">
              <a className="my-1 text-sm font-medium md:mx-4 md:my-0">Events</a>
            </Link>
            <Link href="/ticket">
              <a className="my-1 text-sm font-medium md:mx-4 md:my-0">Ticket</a>
            </Link>
            <Link href="/profile">
              <a className="my-1 text-sm font-medium md:mx-4 md:my-0">Profil</a>
            </Link>
          </div>

          <div className="mt-3 md:mt-0">
            <form className="flex">
              <input className="w-full px-4 py-2 border rounded-lg focus:outline-none" type="text" placeholder="Rechercher" />
            </form>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;