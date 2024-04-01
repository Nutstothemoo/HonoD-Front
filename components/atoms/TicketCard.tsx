"use client"
import React, { useState } from 'react';
import { Ticket } from '@/components/TicketSection';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

type TicketProps = {
  ticket: Ticket;
  number: number;
};

const TicketCard: React.FC<TicketProps> = ({ ticket, number }) => {
  const [quantity, setQuantity] = useState(0);
  const increment = () => setQuantity(quantity + 1);
  const decrement = () => setQuantity(quantity > 0 ? quantity - 1 : 0);

  return (
    <AccordionItem key={number} className="rounded-3xl" value={`item-${number}`}>
    <div key={ticket._id} className=" w-full h-150 shadow-md rounded-3xl px-6 pt-8 flex flex-row justify-between my-2">
    <p className={`font-bold ${ticket.stock > 0 ? 'text-white' : 'text-gray-400'}`}>
    <span className="font-normal">{ticket.price !== undefined ? (quantity > 0 ? ticket.price * quantity : ticket.price) + ' €' : 'Non disponible'}</span>
    </p>
    {ticket.stock > 0 ? (
        <div className="flex items-center">
          <button onClick={decrement} className=" text-white px-2 py-1 rounded mr-2">-</button>
          <p>{quantity}</p>
          <button onClick={increment} className="text-white px-2 py-1 rounded ml-2">+</button>
        </div>
      ) : (
        <p className="text-gray-400">Épuisé</p>
      )}
    <AccordionTrigger 
      className={`font-bold text-xl items-center ${ticket.stock > 0 ? 'text-white' : 'text-gray-400'}`} >
        {ticket.ticket_name}
    </AccordionTrigger>

    </div>
      <AccordionContent>
        {ticket?.ticket_name}
        {/* <Button size="small" text={`Buy`} onClick={() => console.log('buy')}>
        </Button> */}
      </AccordionContent>
    </AccordionItem>
  );
};

export default TicketCard;