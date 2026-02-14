/**
 * FearGreedWidget.jsx - Fear & Greed Index Widget
 * Displays current index value with color-coded meter and historical chart
 */

import React, { useMemo } from 'react';
import { useFearGreed, getFearGreedColor, getFearGreedLabel, getFearGreedDescription } from '../hooks/useFearGreed';
import './FearGreedWidget.css';

const FearGreedWidget = () => {
  const { data, loading } = useFearGreed(10 * 60 * 1000); // 10 min refresh

  const current = data?.current;
  const history = data?.history || [];

  const value = current?.value || 0;
  const classification = current?.value_classification || getFearGreedLabel(value);
  const color = getFearGreedColor(value);

  // Simple sparkline path from history data
  const sparklinePath = useMemo(() => {
    if (history.length < 2) return '';
    
    const values = history.slice().reverse().map(d => parseInt(d.value, 10));
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 100);
    const range = max - min || 100;
    
    const width = 200;
    const height = 40;
    const stepX = width / (values.length - 1);
    
    return values.map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * height;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  }, [history]);

  // Gauge segments
  const gaugeSegments = [
    { label: 'Extreme Fear', range: '0-20', color: '#ef4444', width: 20 },
    { label: 'Fear', range: '21-40', color: '#f97316', width: 20 },
    { label: 'Neutral', range: '41-60', color: '#eab308', width: 20 },
    { label: 'Greed', range: '61-80', color: '#22c55e', width: 20 },
    { label: 'Extreme Greed', range: '81-100', color: '#10b981', width: 20 },
  ];

  // Calculate needle position (0-100 mapped to degrees)
  const needleRotation = -90 + (value / 100) * 180;

  if (loading && !current) {
    return (
      <div className="fear-greed-widget glass-card loading">
        <div className="widget-header">
          <div className="widget-title">
            <span className="widget-icon">😰</span>
            Fear & Greed
          </div>
        </div>
        <div className="widget-content">
          <div className="skeleton-circle" />
          <div className="skeleton-text" />
        </div>
      </div>
    );
  }

  return (
    <div className="fear-greed-widget glass-card">
      <div className="widget-header">
        <div className="widget-title">
          <span className="widget-icon" style={{ color }}>
            {value <= 20 ? '😱' : value <= 40 ? '😰' : value <= 60 ? '😐' : value <= 80 ? '🤑' : '🚀'}
          </span>
          Fear & Greed
        </div>
        <span className="widget-badge" style={{ 
          background: `${color}20`,
          color,
          border: `1px solid ${color}40`,
        }}>
          {classification}
        </span>
      </div>

      <div className="widget-content">
        {/* Gauge */}
        <div className="gauge-container">
          <svg className="gauge-svg" viewBox="0 0 200 100">
            {/* Background arc segments */}
            {gaugeSegments.map((seg, i) => {
              const startAngle = -90 + (i * 36); // 180 degrees / 5 segments = 36 each
              const endAngle = startAngle + 36;
              const startRad = (startAngle * Math.PI) / 180;
              const endRad = (endAngle * Math.PI) / 180;
              const r = 80;
              const cx = 100;
              const cy = 100;
              
              const x1 = cx + r * Math.cos(startRad);
              const y1 = cy + r * Math.sin(startRad);
              const x2 = cx + r * Math.cos(endRad);
              const y2 = cy + r * Math.sin(endRad);
              
              return (
                <path
                  key={seg.label}
                  d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="12"
                  strokeLinecap="round"
                />
              );
            })}
            
            {/* Needle */}
            <g transform={`rotate(${needleRotation}, 100, 100)`}>
              <line
                x1="100"
                y1="100"
                x2="100"
                y2="25"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle cx="100" cy="100" r="8" fill="white" />
            </g>
            
            {/* Center value */}
            <text
              x="100"
              y="85"
              textAnchor="middle"
              fill="white"
              fontSize="28"
              fontWeight="700"
            >
              {value}
            </text>
          </svg>
        </div>

        {/* Value display */}
        <div className="value-display" style={{ color }}>
          <span className="value-number">{value}</span>
          <span className="value-label">/100</span>
        </div>

        {/* Description */}
        <p className="description">
          {getFearGreedDescription(value)}
        </p>

        {/* 30-day sparkline */}
        {sparklinePath && (
          <div className="sparkline-container">
            <span className="sparkline-label">30 Day Trend</span>
            <svg className="sparkline" viewBox="0 0 200 40" preserveAspectRatio="none">
              <defs>
                <linearGradient id="sparklineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={color} stopOpacity="0.5" />
                  <stop offset="100%" stopColor={color} stopOpacity="0.05" />
                </linearGradient>
              </defs>
              <path
                d={`${sparklinePath} L 200 40 L 0 40 Z`}
                fill="url(#sparklineGradient)"
                stroke="none"
              />
              <path
                d={sparklinePath}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}

        {/* Last updated */}
        <div className="last-updated">
          Updated: {data?.lastUpdated ? new Date(data.lastUpdated).toLocaleTimeString() : '—'}
        </div>
      </div>
    </div>
  );
};

export default FearGreedWidget;
