
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { IncidentMarker } from '../types';

interface CommunityMapProps {
  incidents: IncidentMarker[];
}

const CommunityMap: React.FC<CommunityMapProps> = ({ incidents }) => {
  const svgRef = useRef<SVGSVGElement>(null);

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

    svg.append("circle")
       .attr("cx", centerX)
       .attr("cy", centerY)
       .attr("r", 6)
       .attr("fill", "#3b82f6")
       .attr("stroke", "white")
       .attr("stroke-width", 2);

    // Render Incidents
    const simulationData = incidents.map((inc, i) => {
        // Deterministic pseudo-random position based on ID for demo stability
        const seed = parseInt(inc.id) * 37;
        const angle = (seed % 360) * (Math.PI / 180);
        const dist = 40 + (seed % 100);
        return {
            ...inc,
            x: centerX + Math.cos(angle) * dist,
            y: centerY + Math.sin(angle) * dist
        };
    });

    const g = svg.selectAll(".incident")
       .data(simulationData)
       .enter()
       .append("g")
       .attr("class", "incident")
       .attr("transform", d => `translate(${d.x}, ${d.y})`)
       .style("cursor", "pointer");

    // Incident Marker Circle
    g.append("circle")
     .attr("r", d => d.type === 'Theft' ? 8 : 5)
     .attr("fill", d => {
         if (d.type === 'Theft') return '#ef4444'; // Red
         if (d.type === 'Sighting') return '#eab308'; // Yellow
         return '#94a3b8';
     })
     .attr("stroke", "white")
     .attr("stroke-width", 2);

    // Pulse animation for Theft
    g.filter(d => d.type === 'Theft')
     .append("circle")
     .attr("r", 8)
     .attr("fill", "none")
     .attr("stroke", "#ef4444")
     .attr("stroke-width", 1)
     .append("animate")
     .attr("attributeName", "r")
     .attr("values", "8; 20")
     .attr("dur", "1.5s")
     .attr("repeatCount", "indefinite")
     .append("animate")
     .attr("attributeName", "opacity")
     .attr("values", "1; 0");

    // Label Background
    g.append("rect")
     .attr("x", -40)
     .attr("y", -28)
     .attr("width", 80)
     .attr("height", 14)
     .attr("rx", 4)
     .attr("fill", "#000000")
     .attr("opacity", 0.7);

    // Label Text (Neutral)
    g.append("text")
     .attr("y", -18)
     .attr("text-anchor", "middle")
     .attr("fill", "white")
     .attr("font-size", "9px")
     .attr("font-weight", "bold")
     .text(d => d.type === 'Theft' ? '⚠️ INCIDENT' : '👁️ ACTIVITY');

  }, [incidents]);

  return (
    <div className="w-full h-[300px] rounded-xl overflow-hidden shadow-lg border border-slate-700 bg-slate-900 relative">
        <svg ref={svgRef} className="w-full h-full" />
        <div className="absolute bottom-2 left-2 flex flex-col gap-1">
            <div className="flex items-center gap-2 bg-black/50 px-2 py-1 rounded backdrop-blur-sm">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                <span className="text-[10px] text-white">Missing Device</span>
            </div>
            <div className="flex items-center gap-2 bg-black/50 px-2 py-1 rounded backdrop-blur-sm">
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <span className="text-[10px] text-white">Activity</span>
            </div>
        </div>
    </div>
  );
};

export default CommunityMap;
