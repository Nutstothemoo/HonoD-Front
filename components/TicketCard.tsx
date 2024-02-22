"use client"
import React, { useState } from 'react';
import { Ticket } from '@/components/TicketSection';

type TicketProps = {
  ticket: Ticket;
};

const TicketCard: React.FC<TicketProps> = ({ ticket }) => {
  const [quantity, setQuantity] = useState(0);

  const increment = () => setQuantity(quantity + 1);
  const decrement = () => setQuantity(quantity > 0 ? quantity - 1 : 0);

  return (
    <div key={ticket._id} className="border-white  w-full h-150 shadow-md rounded px-6 pt-8 pb-8 mb-4 flex flex-col my-2">
      <p className="font-bold text-xl mb-2">Ticket Name: <span className="font-normal">{ticket.ticket_name}</span></p>
      <p className="font-bold text-xl mb-2">Price: <span className="font-normal">{ticket.price}</span></p>
      <div className="flex items-center mt-4">
        <button onClick={decrement} className=" text-white px-2 py-1 rounded mr-2">-</button>
        <p>{quantity}</p>
        <button onClick={increment} className="text-white px-2 py-1 rounded ml-2">+</button>
      </div>
    </div>
  );
};

export default TicketCard;