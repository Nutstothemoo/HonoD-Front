import React, { useEffect, useState } from 'react';
import TicketCard from './atoms/TicketCard';
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

type TicketSectionProps = {
  tickets: Ticket[];
};

export const TicketSection: React.FC<TicketSectionProps> = ({ tickets }) => {

  if (!tickets) return <p>No tickets available.</p>;
  return (
    <ScrollArea className="flex flex-col border">
      <Accordion type="single" collapsible className="w-full">
      {tickets.map((ticket, index) => (
        <TicketCard number={index} ticket={ticket} />
      ))}
      </Accordion>
    </ScrollArea>
  );
};

export interface Ticket {
  _id: string;
  ticket_name?: string;
  price?: number;
  rating?: number;
  stock: number;
  image?: string;
  event_id: string;
  dealer_id: string;
}
