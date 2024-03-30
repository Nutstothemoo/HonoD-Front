import React, { useState } from 'react';
import axios from 'axios';

type Ticket = {
    id: number;
    name: string;
    price: string;
  };

function TicketAdd() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');

    const handleSubmit = async (event: any) => {
        event.preventDefault();

        const newTicket = { name, price };

        // Send a POST request to your API to create the new ticket
        const response = await axios.post('/api/tickets', newTicket);

        // Add the new ticket to the list of tickets
        setTickets([...tickets, response.data]);

        // Clear the form fields
        setName('');
        setPrice('');
    };

    return (
        <div>
            <form onSubmit={handleSubmit}>
                <label>
                    Name:
                    <input type="text" value={name} onChange={e => setName(e.target.value)} />
                </label>
                <label>
                    Price:
                    <input type="text" value={price} onChange={e => setPrice(e.target.value)} />
                </label>
                <button type="submit">Create Ticket</button>
            </form>

            <div>
                {tickets.map(ticket => (
                    <div key={ticket.id}>
                        <h2>{ticket.name}</h2>
                        <p>{ticket.price}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default TicketAdd;