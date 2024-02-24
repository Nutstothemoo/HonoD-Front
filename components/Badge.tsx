"use client";
import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function Badge() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
      const userDetailsString = localStorage.getItem("user");
      if (userDetailsString) {
        const userDetails = JSON.parse(userDetailsString);
        setUser(userDetails);
      }
  }, []);

  return (
    <Avatar className='rounded-2xl'>
      {user && user.avatar && <AvatarImage src={user.avatar} />}
      {user && user.firstname && <AvatarFallback>{user.firstname[0] + user.lastname[0]}</AvatarFallback>}
    </Avatar>
  );
}
