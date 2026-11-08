import React, { useRef, useCallback } from 'react';
import { ScannerScene } from './3d/ScannerScene';
import { Activity, Layers, ArrowRight, CheckCircle, Crosshair } from 'lucide-react';

interface PrecisionTechSectionProps {
  onOpenBooking: () => void;
}

export const PrecisionTechSection: React.FC<PrecisionTechSectionProps> = ({ onOpenBooking }) => {
  // 🔥 FIX: Using Refs instead of State to prevent 12fps React Re-renders
  const angleTextRef = useRef<HTMLSpanElement>(null);
  const angleCenterRef = useRef<HTMLDivElement>(null);
  const densityTextRef = useRef<HTMLSpanElement>(null);
  const densityBarRef = useRef<HTMLDivElement>(null);
  const zCoordTextRef = useRef<HTMLSpanElement>(null);
  const radarLineRef = useRef<SVGLineElement>(null);
  const radarBlipRef = useRef<SVGCircleElement>(null);

  // Direct DOM Mutation (bypasses React rendering completely)
  const handleMetricUpdate = useCallback((metrics: { laserY: number; density: number; angle: number }) => {
    // Update text values
    if (angleTextRef.current) angleTextRef.current.textContent = `${metrics.angle}° AZ`;
    if (angleCenterRef.current) angleCenterRef.current.textContent = `${metrics.angle}°`;
    if (densityTextRef.current) densityTextRef.current.textContent = `${metrics.density}%`;
    if (zCoordTextRef.current) zCoordTextRef.current.textContent = `${metrics.laserY.toFixed(2)} mm`;

    // Update progress bar width
    if (densityBarRef.current) densityBarRef.current.style.width = `${metrics.density}%`;

    // Update SVG Radar Hand Line
    if (radarLineRef.current) {
      const rad = (metrics.angle * Math.PI) / 180;
      radarLineRef.current.setAttribute('x2', (50 + 44 * Math.cos(rad)).toString());
      radarLineRef.current.setAttribute('y2', (50 + 44 * Math.sin(rad)).toString());
    }

    // Update SVG Radar Blip
    if (radarBlipRef.current) {
      const radBlip = ((metrics.angle + 30) * Math.PI) / 180;
      radarBlipRef.current.setAttribute('cx', (50 + 30 * Math.cos(radBlip)).toString());
      radarBlipRef.current.setAttribute('cy', (50 + 30 * Math.sin(radBlip)).toString());
    }
  }, []);

  return (
    <section id="technology" className="relative py-12 sm:py-16 lg:py-24 bg-[#0A0D12] text-white overflow-hidden border-t border-stone-800/80 cyber-grid">
      {/* Background Obsidian Glow Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-cyan-950/20 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-900/15 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12 lg:mb-14">
          <h2 className="text-3xl sm:text-4xl lg:text-6xl font-serif-luxury font-bold tracking-tight text-white mb-4 uppercase">
            PRECISION DIAGNOSTICS
          </h2>
          <p className="text-stone-300 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto font-mono text-[13px] uppercase tracking-wider opacity-80">
            Next-generation sub-millimeter 3D diagnostic scans for 100% painless accuracy.
          </p>
        </div>

        {/* Centerpiece 3D Stage & Surrounding Medical HUD Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center">
          
          {/* Left Column: Clinical Specs & Details (Col 3) */}
          <div className="lg:col-span-3 order-2 lg:order-1 flex flex-col gap-6">
            <div className="p-6 rounded-3xl bg-[#0f141f]/70 border border-stone-800/80 backdrop-blur-md">
              <div className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider mb-1">
                <span>Diagnostic Tomography</span>
              </div>
              <h3 className="text-xl font-bold font-serif-luxury text-white mb-2">
                Zero-Radiation 3D Optical Scan
              </h3>
              <p className="text-xs text-stone-400 leading-relaxed mb-4">
                Replacing traditional uncomfortable physical impressions with continuous holographic laser mapping.
              </p>
              
              <ul className="space-y-2 text-xs text-stone-300 font-mono">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                  <span>0.02mm Optical Tolerance</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                  <span>Real-time Wireframe Meshing</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                  <span>Subsurface Enamel Thickness</span>
                </li>
              </ul>
            </div>

            <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-500/10 to-amber-900/10 border border-amber-500/20 backdrop-blur-md">
              <div className="text-xs font-semibold text-amber-200 mb-2 uppercase tracking-tighter">
                Personalized Consultation
              </div>
              <p className="text-[11px] text-stone-400 leading-relaxed mb-3">
                Experience your digital smile mock-up rendered live on screen before treatment begins.
              </p>
              <button
                onClick={onOpenBooking}
                className="group relative w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-[#E6CA9E] via-[#D8B482] to-[#C5A880] text-amber-950 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <span>Book Consultation</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </span>
                <div className="absolute inset-0 bg-white/25 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12" />
              </button>
            </div>
          </div>

          {/* Center Column: 3D Holographic Stage (Col 6) */}
          <div className="lg:col-span-6 order-1 lg:order-2 flex flex-col items-center justify-center">
            <div className="relative w-full rounded-3xl bg-gradient-to-b from-[#0c121d] to-[#080b10] border border-stone-800 shadow-[0_0_50px_-10px_rgba(6,182,212,0.15)] overflow-hidden">
              
              {/* Corner Cyber HUD Brackets */}
              <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-cyan-500/70 pointer-events-none z-10"></div>
              <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-cyan-500/70 pointer-events-none z-10"></div>
              <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-cyan-500/70 pointer-events-none z-10"></div>
              <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-cyan-500/70 pointer-events-none z-10"></div>

              {/* Dynamic 3D Scene Viewport */}
              <ScannerScene onMetricUpdate={handleMetricUpdate} />
            </div>
          </div>

          {/* Right Column: Medical HUD Widgets (Col 3) */}
          <div className="lg:col-span-3 order-3 flex flex-col gap-6">
            
            {/* HUD Widget 1: Circular Radar / Rotation Scanner */}
            <div className="p-5 rounded-3xl bg-[#0f141f]/80 border border-stone-800/80 backdrop-blur-md flex flex-col items-center">
              <div className="w-full flex items-center justify-between text-[11px] font-mono text-cyan-400 uppercase tracking-wider mb-3">
                <span>ALIGNMENT RADAR</span>
                <span ref={angleTextRef} className="text-stone-400">124° AZ</span>
              </div>

              {/* Circular Animated Radar Element */}
              <div className="relative w-36 h-36 flex items-center justify-center my-1">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Outer circle */}
                  <circle cx="50" cy="50" r="46" fill="none" stroke="#1e293b" strokeWidth="1.5" />
                  <circle cx="50" cy="50" r="32" fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
                  <circle cx="50" cy="50" r="18" fill="none" stroke="#1e293b" strokeWidth="1" />
                  
                  {/* Crosshairs */}
                  <line x1="50" y1="4" x2="50" y2="96" stroke="#1e293b" strokeWidth="1" />
                  <line x1="4" y1="50" x2="96" y2="50" stroke="#1e293b" strokeWidth="1" />

                  {/* Active Angle Sweep Hand */}
                  <line
                    ref={radarLineRef}
                    x1="50"
                    y1="50"
                    x2={50 + 44 * Math.cos((124 * Math.PI) / 180)}
                    y2={50 + 44 * Math.sin((124 * Math.PI) / 180)}
                    stroke="#00F0FF"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="transition-all duration-75"
                  />

                  {/* Target Blip */}
                  <circle
                    ref={radarBlipRef}
                    cx={50 + 30 * Math.cos(((124 + 30) * Math.PI) / 180)}
                    cy={50 + 30 * Math.sin(((124 + 30) * Math.PI) / 180)}
                    r="2.5"
                    fill="#38BDF8"
                  />
                </svg>

                <div ref={angleCenterRef} className="absolute font-mono text-xs font-bold text-cyan-300">
                  124°
                </div>
              </div>

              <div className="w-full text-[10px] font-mono text-stone-400 mt-2 flex justify-between border-t border-stone-800/80 pt-2">
                <span>ROTATION FREQ</span>
                <span className="text-cyan-400 font-bold">2.4 GHz</span>
              </div>
            </div>

            {/* HUD Widget 2: Vertical Metric Gauge Status */}
            <div className="p-5 rounded-3xl bg-[#0f141f]/80 border border-stone-800/80 backdrop-blur-md">
              <div className="flex items-center justify-between text-[11px] font-mono text-cyan-400 uppercase tracking-wider mb-3">
                <span>METRIC GAUGE</span>
                <span className="text-emerald-400 font-bold">OPTIMAL</span>
              </div>

              <div className="space-y-3.5">
                {/* Metric 1 */}
                <div>
                  <div className="flex justify-between text-xs font-mono text-stone-300 mb-1">
                    <span>Enamel Density</span>
                    <span ref={densityTextRef} className="text-cyan-300 font-bold">98.4%</span>
                  </div>
                  <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
                    <div
                      ref={densityBarRef}
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300"
                      style={{ width: '98.4%' }}
                    ></div>
                  </div>
                </div>

                {/* Metric 2 */}
                <div>
                  <div className="flex justify-between text-xs font-mono text-stone-300 mb-1">
                    <span>Root Stability Index</span>
                    <span className="text-cyan-300 font-bold">99.4% (Grade A)</span>
                  </div>
                  <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full w-[99.4%]"></div>
                  </div>
                </div>

                {/* Metric 3 */}
                <div>
                  <div className="flex justify-between text-xs font-mono text-stone-300 mb-1">
                    <span>Bite Load Balance</span>
                    <span className="text-cyan-300 font-bold">420 N</span>
                  </div>
                  <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-400 rounded-full w-[88%]"></div>
                  </div>
                </div>

                {/* Metric 4 */}
                <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-stone-400">CT Slice Z-Coord:</span>
                  <span ref={zCoordTextRef} className="text-cyan-300 font-bold">0.20 mm</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};