import EventCard from './atoms/EventCard';

interface Event {
  id: number;
  title: string;
  imageUrl: string;
  description: string;
}

const events = [
  { id: 1, title: 'Event 1', description: 'This is event 1' },
  { id: 2, title: 'Event 2', description: 'This is event 2' },
  { id: 3, title: 'Event 3', description: 'This is event 3' },
  { id: 4, title: 'Event 4', description: 'This is event 4' },
  { id: 5, title: 'Event 5', description: 'This is event 5' },
];

interface EventListProps {
  events: Event[];
}

const EventList: React.FC<EventListProps> = ({ events }) => (
  <main className="w-full px-20 mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
    {events.map((event) => (
      <EventCard key={event.id} event={event} />
    ))}
  </main>
);

export default EventList;