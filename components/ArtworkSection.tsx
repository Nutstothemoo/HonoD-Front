
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { AspectRatio } from "@/components/ui/aspect-ratio"
import Image from 'next/image';

interface ArtworkProps {
  images: any[];
}

const Artwork: React.FC<ArtworkProps> = ({ images }) => {
  return (
    <Carousel>
      <CarouselContent>
        {images.map((image, index) => (
          <CarouselItem key={index}>
                  <AspectRatio ratio={16 / 9}>
                <Image 
                  key={image.id}
                  src={image.originalUrl}
                  alt={image.role}
                  width={16}
                  height={9}
                  className="w-full h-42 object-cover mb-4 rounded"
                />
            </AspectRatio>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
};

export default Artwork;