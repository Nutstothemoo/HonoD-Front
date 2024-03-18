"use client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Badge from "./Badge"
import Link from "next/link";
import {useRouter} from 'next/navigation'



export default function DropdownMenuAvatar(SessionData :any) {
  console.log(SessionData, "SessionData Arrived In AvatarDropDownMenu")
  const router = useRouter();
  const handleLogout = async () => {
    router.push('/login');
    
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full" asChild>          
          <button>
            <Badge />
          </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 z-30 bg-darkcolor rounded-3xl rounded-tr-none">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <Link href="/dashboard/profil" className="my-1 text-sm font-medium md:mx-4 md:my-0">
              Profil
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link href="/event" className="my-1 text-sm font-medium md:mx-4 md:my-0">
              Ticket Manager
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link href="/event/dealer" className="my-1 text-sm font-medium md:mx-4 md:my-0">
              Event Manager
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
          <Link href="/setting" className="my-1 text-sm font-medium md:mx-4 md:my-0">
              Settings
          </Link>            
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}