import React from 'react';
import DropdownMenuAvatar from '@/components/AvatarDropDownMenu';
export default async function DashBoard() {

  const events = await fetchEvents()

  return (
    <>
      <div>This is the dashboard</div>
    </>
  );
}


async function fetchEvents() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/events`)
  if (!res.ok) return undefined
  return res.json()
}
