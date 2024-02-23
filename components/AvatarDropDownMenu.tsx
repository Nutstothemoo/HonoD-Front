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

export default function DropdownMenuAvatar() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>          
          <button>
            <Badge />
          </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 z-30 bg-darkcolor rounded-3xl rounded-tr-none">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <Link href="/profile" className="my-1 text-sm font-medium md:mx-4 md:my-0">
              Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link href="/event" className="my-1 text-sm font-medium md:mx-4 md:my-0">
              My tickets
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link href="/dashboard/event/dealer" className="my-1 text-sm font-medium md:mx-4 md:my-0">
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
        <DropdownMenuItem>
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}