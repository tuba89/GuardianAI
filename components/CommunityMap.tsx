
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { IncidentMarker } from '../types';
import { MapPin, Clock, AlertTriangle, X, Shield, Activity } from 'lucide-react';

interface CommunityMapProps {
  incidents: IncidentMarker[];
}

const CommunityMap: React.FC<CommunityMapProps> = ({ incidents }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeIncident, setActiveIncident] = useState<IncidentMarker | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = svgRef.current.clientWidth;
    const height = 300;
    const svg = d3.select(svgRef.current);
    
    svg.selectAll("*").remove(); // Clear previous

    // Dark Map Background
    svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "#0f172a") // Slate 900 base
      .attr("rx", 12);

    // Grid lines (Radar style)
    const gridColor = "#1e293b";
    for (let i = 0; i < width; i += 40) {
        svg.append("line").attr("x1", i).attr("y1", 0).attr("x2", i).attr("y2", height).attr("stroke", gridColor).attr("stroke-width", 1);
    }
    for (let i = 0; i < height; i += 40) {
        svg.append("line").attr("x1", 0).attr("y1", i).attr("x2", width).attr("y2", i).attr("stroke", gridColor).attr("stroke-width", 1);
    }

    // User location (Center) - Radar Sweep Effect
    const centerX = width / 2;
    const centerY = height / 2;

    const radar = svg.append("circle")
       .attr("cx", centerX)
       .attr("cy", centerY)
       .attr("r", 0)
       .attr("fill", "none")
       .attr("stroke", "#3b82f6")
       .attr("stroke-width", 1)
       .attr("opacity", 0.5);

    radar.append("animate")
       .attr("attributeName", "r")
       .attr("values", `0; ${Math.max(width, height)/1.5}`)
       .attr("dur", "3s")
       .attr("repeatCount", "indefinite");

    radar.append("animate")
       .attr("attributeName", "opacity")
       .attr("values", "0.8; 0")
       .attr("dur", "3s")
       .attr("repeatCount", "indefinite");

    // Central User Node
    const userNode = svg.append("g");
    
    userNode.append("circle")
       .attr("cx", centerX)
       .attr("cy", centerY)
       .attr("r", 6)
       .attr("fill", "#3b82f6")
       .attr("stroke", "white")
       .attr("stroke-width", 2);
       
    userNode.append("circle")
        .attr("cx", centerX)
        .attr("cy", centerY)
        .attr("r", 12)
        .attr("fill", "#3b82f6")
        .attr("opacity", 0.2)
        .append("animate")
        .attr("attributeName", "r")
        .attr("values", "6; 12; 6")
        .attr("dur", "2s")
        .attr("repeatCount", "indefinite");

    // --- Data Positioning Simulation ---
    // Deterministic pseudo-random position based on ID for demo stability
    const simulationData = incidents.map((inc, i) => {
        const seed = parseInt(inc.id.replace(/\D/g, '') || '0') * 37 + i;
        const angle = (seed % 360) * (Math.PI / 180);
        // Distribute them around center but keep within bounds roughly
        const dist = 60 + (seed % 80); 
        return {
            ...inc,
            x: centerX + Math.cos(angle) * dist,
            y: centerY + Math.sin(angle) * dist
        };
    });

    // --- Clustering / Network Visualization ---
    // Draw lines between close incidents to simulate "clustering" or network activity
    svg.selectAll(".connector")
       .data(simulationData)
       .enter()
       .each(function(d, i) {
           const others = simulationData.slice(i + 1);
           others.forEach(other => {
               const dx = d.x - other.x;
               const dy = d.y - other.y;
               const distance = Math.sqrt(dx*dx + dy*dy);
               // Connect if relatively close
               if (distance < 120) {
                   svg.append("line")
                      .attr("x1", d.x)
                      .attr("y1", d.y)
                      .attr("x2", other.x)
                      .attr("y2", other.y)
                      .attr("stroke", "#ef4444")
                      .attr("stroke-width", 1)
                      .attr("opacity", 0.15)
                      .attr("stroke-dasharray", "4,4");
               }
           });
       });


    // --- Render Markers ---
    const g = svg.selectAll(".incident")
       .data(simulationData)
       .enter()
       .append("g")
       .attr("class", "incident")
       .attr("transform", d => `translate(${d.x}, ${d.y})`)
       .style("cursor", "pointer");
       
    // Click Listener on Group
    g.on("click", (event, d) => {
        event.stopPropagation(); // Prevent background click from closing
        setActiveIncident(d);
        
        // Highlight effect on click
        d3.selectAll(".incident-ring").attr("stroke-opacity", 0); // Reset others
        d3.select(event.currentTarget).select(".incident-ring").attr("stroke-opacity", 1);
    });

    // Hover Effects
    g.on("mouseenter", function() {
        d3.select(this).select(".marker-circle")
          .transition().duration(200)
          .attr("r", 10);
    }).on("mouseleave", function(event, d) {
        const isTheft = d.type === 'Theft';
        d3.select(this).select(".marker-circle")
          .transition().duration(200)
          .attr("r", isTheft ? 8 : 5);
    });

    // Outer Ring (Selection Indicator)
    g.append("circle")
     .attr("class", "incident-ring")
     .attr("r", 16)
     .attr("fill", "none")
     .attr("stroke", "white")
     .attr("stroke-width", 1.5)
     .attr("stroke-opacity", 0) // Hidden by default
     .attr("stroke-dasharray", "2,2");

    // Hit Area (Invisible)
    g.append("circle")
     .attr("r", 20)
     .attr("fill", "transparent");

    // Visible Marker Circle
    g.append("circle")
     .attr("class", "marker-circle")
     .attr("r", d => d.type === 'Theft' ? 8 : 5)
     .attr("fill", d => {
         if (d.type === 'Theft') return '#ef4444'; // Red
         if (d.type === 'Sighting') return '#eab308'; // Yellow
         return '#94a3b8'; // Slate
     })
     .attr("stroke", "white")
     .attr("stroke-width", 2);

    // Pulse animation for Theft items
    g.filter(d => d.type === 'Theft')
     .append("circle")
     .attr("r", 8)
     .attr("fill", "none")
     .attr("stroke", "#ef4444")
     .attr("stroke-width", 1)
     .append("animate")
     .attr("attributeName", "r")
     .attr("values", "8; 25")
     .attr("dur", "1.5s")
     .attr("repeatCount", "indefinite")
     .append("animate")
     .attr("attributeName", "opacity")
     .attr("values", "0.8; 0");

    // Type Label (Mini)
    g.append("rect")
     .attr("x", -30)
     .attr("y", -24)
     .attr("width", 60)
     .attr("height", 14)
     .attr("rx", 4)
     .attr("fill", "black")
     .attr("opacity", 0.6);

    g.append("text")
     .attr("y", -15)
     .attr("text-anchor", "middle")
     .attr("fill", "white")
     .attr("font-size", "8px")
     .attr("font-weight", "bold")
     .text(d => d.type === 'Theft' ? 'ALERT' : d.type.toUpperCase());

  }, [incidents]);

  return (
    <div className="w-full h-[320px] rounded-xl overflow-hidden shadow-lg border border-slate-700 bg-slate-900 relative group">
        <svg 
            ref={svgRef} 
            className="w-full h-full" 
            onClick={() => setActiveIncident(null)} 
        />
        
        {/* Legend / Status Overlay */}
        <div className="absolute top-3 left-3 flex flex-col gap-2 pointer-events-none">
            <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-lg">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                <span className="text-[10px] font-bold text-white tracking-wide">LIVE MONITORING</span>
            </div>
        </div>

        {/* Legend Bottom Left */}
        <div className="absolute bottom-3 left-3 flex flex-col gap-1.5 pointer-events-none">
             <div className="flex items-center gap-2">
                 <div className="w-2.5 h-2.5 rounded-full bg-red-500 border border-white/50"></div>
                 <span className="text-[10px] text-slate-300 shadow-sm">Theft / Danger</span>
             </div>
             <div className="flex items-center gap-2">
                 <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 border border-white/50"></div>
                 <span className="text-[10px] text-slate-300 shadow-sm">Suspicious Activity</span>
             </div>
        </div>

        {/* Interactive Detail Card */}
        {activeIncident && (
            <div className="absolute bottom-3 left-3 right-3 bg-slate-800/95 backdrop-blur-md p-4 rounded-xl border border-slate-600 shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-300 z-10">
                <button 
                    onClick={(e) => { e.stopPropagation(); setActiveIncident(null); }}
                    className="absolute top-3 right-3 text-slate-400 hover:text-white transition-colors bg-slate-700/50 rounded-full p-1"
                >
                    <X className="w-4 h-4" />
                </button>
                
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl border ${
                        activeIncident.type === 'Theft' 
                        ? 'bg-red-500/10 border-red-500/30 text-red-500' 
                        : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500'
                    }`}>
                        {activeIncident.type === 'Theft' ? <Shield className="w-6 h-6" /> : <Activity className="w-6 h-6" />}
                    </div>
                    
                    <div className="flex-1 pr-6">
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                                activeIncident.type === 'Theft' 
                                ? 'bg-red-500/20 text-red-400 border-red-500/20' 
                                : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20'
                            }`}>
                                {activeIncident.type.toUpperCase()}
                            </span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {activeIncident.time}
                            </span>
                        </div>
                        
                        <h4 className="text-white font-bold text-sm mb-1">{activeIncident.description}</h4>
                        
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-2 bg-black/20 p-1.5 rounded w-max">
                            <MapPin className="w-3 h-3" />
                            <span>{activeIncident.lat.toFixed(4)}, {activeIncident.lng.toFixed(4)}</span>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default CommunityMap;
