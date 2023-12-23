import React, { useEffect, useState } from 'react';
import axios from 'axios';
import EventCard from '@/components/EventCard';

interface Event {
  id: number;

}

function Events() {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await axios.get('URL_DE_VOTRE_API');
        setEvents(response.data);
      } catch (error) {
        console.error('Erreur lors de la récupération des événements:', error);
      }
    };

    fetchEvents();
  }, []);

  return (
    <section>
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </section>
  );
}

export default Events;