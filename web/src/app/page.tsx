import { Navbar } from "@/components/Navbar";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Lock, FileSignature, Database } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-[#fafafa] text-slate-900 relative overflow-hidden font-sans">
      {/* Background Gradients & Grid */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-[120px] pointer-events-none translate-x-1/3 translate-y-1/3" />
      
      <Navbar />
      
      <main className="flex-1 flex flex-col items-center justify-center px-6 pt-20 pb-24 max-w-7xl mx-auto w-full relative z-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center w-full">
          {/* Left Column: Typography */}
          <div className="flex flex-col items-start gap-8">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#6366f1]/5 border border-[#6366f1]/20 text-sm font-semibold text-[#6366f1] shadow-sm">
              <div className="w-2 h-2 rounded-full bg-[#6366f1] animate-pulse" />
              Powered by Sui Blockchain
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-[5rem] font-extrabold tracking-tighter leading-[1.05] text-slate-900">
              Automate Your <br />
              Crypto Signatures. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6366f1] to-blue-400">
                Zero Leaks.
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-600 max-w-lg leading-relaxed font-medium">
              Stop losing sensitive data to centralized clouds. Your users encrypt their documents client-side, and our smart contracts handle the immutable verification forever.
            </p>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-2 w-full sm:w-auto">
              <Link 
                href="/dashboard"
                className="group relative px-6 py-4 sm:px-8 sm:py-4 bg-[#6366f1] text-white rounded-2xl font-bold overflow-hidden shadow-lg shadow-indigo-500/25 transition-all hover:scale-105 hover:shadow-indigo-500/40 flex items-center justify-center gap-2"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <span className="relative">Start Signing</span> 
                <ArrowRight className="w-5 h-5 relative group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                href="/dashboard"
                className="px-6 py-3 sm:px-8 sm:py-4 text-slate-600 hover:text-slate-900 font-bold transition-colors flex items-center justify-center gap-2 border sm:border-transparent border-slate-200 rounded-2xl sm:rounded-none"
              >
                View Demo
              </Link>
            </div>
          </div>

          {/* Right Column: Floating Mockup Card */}
          <div className="relative w-full group perspective-1000">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#6366f1]/20 to-blue-400/20 blur-3xl rounded-full group-hover:blur-2xl transition-all duration-700" />
            <div className="relative bg-white/90 border border-slate-200/80 rounded-[2rem] p-8 lg:p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] backdrop-blur-2xl transition-all duration-700 group-hover:-translate-y-2 group-hover:shadow-[0_30px_70px_-15px_rgba(99,102,241,0.15)]">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center shadow-inner border border-white">
                    <ShieldCheck className="w-7 h-7 text-[#6366f1]" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">Platform Vault</h3>
                    <p className="text-sm text-slate-500 font-mono tracking-wider">0x4a9b...2f1c</p>
                  </div>
                </div>
                <div className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold border border-emerald-100 flex items-center gap-1.5 shadow-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Verified
                </div>
              </div>

              <div className="space-y-8">
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2 relative z-10">Total Encrypted</p>
                  <p className="text-5xl font-extrabold text-slate-900 tracking-tighter relative z-10">1,240</p>
                  <p className="text-sm font-medium text-slate-400 mt-2 flex items-center gap-1.5 relative z-10">
                    <Database className="w-4 h-4" /> Stored safely on Walrus
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-end text-sm">
                    <span className="font-bold text-slate-600 tracking-tight">Monthly Audit Rate</span>
                    <span className="text-[#6366f1] font-bold text-lg leading-none">100% Valid</span>
                  </div>
                  
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 shadow-inner">
                    <div className="w-full h-full bg-gradient-to-r from-[#6366f1] to-blue-400 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}



