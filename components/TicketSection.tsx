// TicketSection.tsx
import React from 'react';
import TicketCard from './TicketCard';

type TicketSectionProps = {
  tickets: Ticket[];
};

const TicketSection: React.FC<TicketSectionProps> = ({ tickets }) => {
  return (
    <div className="flex flex-col">
      {tickets.map((ticket) => (
        <TicketCard key={ticket._id} ticket={ticket}  />
      ))}
    </div>
  );
};


export interface Ticket {
  _id: string;
  ticket_name?: string;
  price?: number;
  rating?: number;
  image?: string;
  event_id: string;
  dealer_id: string;
  created_at: Date;
  updated_at: Date;
}
