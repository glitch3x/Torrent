"use client";

import { ConnectButton } from "@mysten/dapp-kit";
import Link from "next/link";
import Image from "next/image";

export function Navbar() {
  return (
    <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex-shrink-0 flex items-center gap-2">
            <Image src="/torrent_logo_purple.svg.png" alt="TorrentSign Logo" width={32} height={32} className="h-8 w-8 object-contain mix-blend-multiply" />
            <span className="font-bold text-xl tracking-tight text-slate-900 hidden sm:block">
              TorrentSign
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/dashboard" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Dashboard
            </Link>
            <div className="scale-[0.85] sm:scale-100 origin-right">
              <ConnectButton />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
