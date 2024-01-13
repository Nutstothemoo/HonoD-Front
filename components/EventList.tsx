import EventCard from './atoms/EventCard';

export interface Event {
  id: string;
  title: string;
  thumbnailUrl?: string;
  description?: string;
  tags?: string[];
  dealer?: string;
}

interface EventListProps {
  events: Event[];
}

const EventList: React.FC<EventListProps> = ({ events }) => (
  <main className="w-full px-20 mx-auto flex flex-wrap justify-center">
    {events.map((event) => (
        <EventCard key={event.id} event={event} />
    ))}
  </main>
);

export default EventList;