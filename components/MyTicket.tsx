import React from 'react';

interface MyTicketProps {
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  orderNumber: string;
  ticketScanned: boolean;
}

const MyTicket: React.FC<MyTicketProps> = ({ eventTitle, eventDate, eventLocation, orderNumber, ticketScanned }) => {
  return (
    <div className="border p-4 rounded-md">
      <h2 className="text-xl font-bold">{eventTitle}</h2>
      <p className="mt-2">{eventDate}</p>
      <p className="mt-2">{eventLocation}</p>
      <p className="mt-2">Order N° {orderNumber}</p>
      <p className="mt-2">{ticketScanned ? 'SCANNED' : 'NOT SCANNED'}</p>
      <button className="mt-4 bg-blue-500 text-white rounded px-4 py-2">RESELL TICKET</button>
      <button className="mt-4 bg-blue-500 text-white rounded px-4 py-2">DOWNLOAD TICKET</button>
    </div>
  );
};

export default MyTicket;