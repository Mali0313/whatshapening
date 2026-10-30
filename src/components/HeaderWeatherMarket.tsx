'use client';

import React, { useState, useEffect } from 'react';
import { Sun, CloudRain, Cloud } from 'lucide-react';

interface WeatherInfo {
  city: string;
  temp: number;
  condition: 'sunny' | 'cloudy' | 'rainy';
}

const CITIES: WeatherInfo[] = [
  { city: 'Karachi', temp: 31, condition: 'cloudy' },
  { city: 'Lahore', temp: 28, condition: 'sunny' },
  { city: 'Islamabad', temp: 24, condition: 'sunny' },
  { city: 'Peshawar', temp: 27, condition: 'sunny' },
  { city: 'Quetta', temp: 21, condition: 'sunny' },
  { city: 'London', temp: 16, condition: 'rainy' },
  { city: 'New York', temp: 19, condition: 'cloudy' },
];

const MARKETS = [
  { label: 'KSE-100', value: '88,940', change: '+1.2%', up: true },
  { label: 'USD/PKR', value: '278.40', change: '+0.15%', up: true },
  { label: 'Gold 24K', value: 'Rs 283k', change: '+0.4%', up: true },
  { label: 'BTC', value: '$68,450', change: '+2.8%', up: true },
  { label: 'Brent Crude', value: '$74.10', change: '-0.3%', up: false },
];

export function HeaderWeatherMarket() {
  const [cityIndex, setCityIndex] = useState(0);
  const [marketIndex, setMarketIndex] = useState(0);
  const [weatherVisible, setWeatherVisible] = useState(true);
  const [marketVisible, setMarketVisible] = useState(true);

  // Rotate items dynamically with smooth transition
  useEffect(() => {
    const weatherTimer = setInterval(() => {
      setWeatherVisible(false);
      setTimeout(() => {
        setCityIndex((prev) => (prev + 1) % CITIES.length);
        setWeatherVisible(true);
      }, 250);
    }, 4800);

    const marketTimer = setInterval(() => {
      setMarketVisible(false);
      setTimeout(() => {
        setMarketIndex((prev) => (prev + 1) % MARKETS.length);
        setMarketVisible(true);
      }, 250);
    }, 3800);

    return () => {
      clearInterval(weatherTimer);
      clearInterval(marketTimer);
    };
  }, []);

  const currentWeather = CITIES[cityIndex];
  const currentMarket = MARKETS[marketIndex];

  return (
    <div className="hidden md:flex items-center gap-3 text-[11px] text-[var(--text-muted)] border-l border-[var(--border-light)] pl-4 ml-3 select-none">
      {/* Weather Pill */}
      <div
        className={`flex items-center gap-1.5 cursor-pointer hover:text-[var(--text-primary)] transition-all duration-300 ${
          weatherVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'
        }`}
        title="Live city weather (Click to switch next city)"
        onClick={() => {
          setWeatherVisible(false);
          setTimeout(() => {
            setCityIndex((prev) => (prev + 1) % CITIES.length);
            setWeatherVisible(true);
          }, 150);
        }}
      >
        {currentWeather.condition === 'sunny' ? (
          <Sun className="w-3.5 h-3.5 text-amber-500 animate-spin-slow" />
        ) : currentWeather.condition === 'rainy' ? (
          <CloudRain className="w-3.5 h-3.5 text-blue-400" />
        ) : (
          <Cloud className="w-3.5 h-3.5 text-gray-400" />
        )}
        <span className="font-medium text-[var(--text-secondary)]">{currentWeather.city}</span>
        <span className="font-mono font-semibold text-[var(--text-primary)]">{currentWeather.temp}&deg;C</span>
      </div>

      <span className="opacity-30">|</span>

      {/* Financial Market Ticker Pill */}
      <div
        className={`flex items-center gap-1.5 cursor-pointer hover:text-[var(--text-primary)] transition-all duration-300 ${
          marketVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'
        }`}
        title="Live market rates (Click to switch next rate)"
        onClick={() => {
          setMarketVisible(false);
          setTimeout(() => {
            setMarketIndex((prev) => (prev + 1) % MARKETS.length);
            setMarketVisible(true);
          }, 150);
        }}
      >
        <span className="font-semibold text-[var(--text-secondary)]">{currentMarket.label}:</span>
        <span className="font-mono font-medium text-[var(--text-primary)]">{currentMarket.value}</span>
        <span
          className={`font-mono text-[10px] font-bold ${
            currentMarket.up ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
          }`}
        >
          {currentMarket.change}
        </span>
      </div>
    </div>
  );
}
