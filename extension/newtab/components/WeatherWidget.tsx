import React, { useState, useEffect } from 'react'
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Wind, CloudFog, Loader2 } from 'lucide-react'

interface WeatherData {
  temp: string
  condition: string
  location: string
  icon: string
  timestamp: number
}

// Weather condition to icon mapping
const getWeatherIcon = (code: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    '113': <Sun className="w-5 h-5" />,           // Sunny
    '116': <Cloud className="w-5 h-5" />,         // Partly cloudy
    '119': <Cloud className="w-5 h-5" />,         // Cloudy
    '122': <Cloud className="w-5 h-5" />,         // Overcast
    '143': <CloudFog className="w-5 h-5" />,      // Mist
    '176': <CloudRain className="w-5 h-5" />,     // Patchy rain
    '179': <CloudSnow className="w-5 h-5" />,     // Patchy snow
    '182': <CloudSnow className="w-5 h-5" />,     // Patchy sleet
    '185': <CloudRain className="w-5 h-5" />,     // Patchy freezing drizzle
    '200': <CloudLightning className="w-5 h-5" />, // Thundery outbreaks
    '227': <Wind className="w-5 h-5" />,          // Blowing snow
    '230': <CloudSnow className="w-5 h-5" />,     // Blizzard
    '248': <CloudFog className="w-5 h-5" />,      // Fog
    '260': <CloudFog className="w-5 h-5" />,      // Freezing fog
    '263': <CloudRain className="w-5 h-5" />,     // Patchy light drizzle
    '266': <CloudRain className="w-5 h-5" />,     // Light drizzle
    '281': <CloudRain className="w-5 h-5" />,     // Freezing drizzle
    '284': <CloudRain className="w-5 h-5" />,     // Heavy freezing drizzle
    '293': <CloudRain className="w-5 h-5" />,     // Patchy light rain
    '296': <CloudRain className="w-5 h-5" />,     // Light rain
    '299': <CloudRain className="w-5 h-5" />,     // Moderate rain
    '302': <CloudRain className="w-5 h-5" />,     // Heavy rain
    '305': <CloudRain className="w-5 h-5" />,     // Heavy rain
    '308': <CloudRain className="w-5 h-5" />,     // Heavy rain
    '311': <CloudRain className="w-5 h-5" />,     // Light freezing rain
    '314': <CloudRain className="w-5 h-5" />,     // Heavy freezing rain
    '317': <CloudSnow className="w-5 h-5" />,     // Light sleet
    '320': <CloudSnow className="w-5 h-5" />,     // Heavy sleet
    '323': <CloudSnow className="w-5 h-5" />,     // Patchy light snow
    '326': <CloudSnow className="w-5 h-5" />,     // Light snow
    '329': <CloudSnow className="w-5 h-5" />,     // Patchy moderate snow
    '332': <CloudSnow className="w-5 h-5" />,     // Moderate snow
    '335': <CloudSnow className="w-5 h-5" />,     // Patchy heavy snow
    '338': <CloudSnow className="w-5 h-5" />,     // Heavy snow
    '350': <CloudSnow className="w-5 h-5" />,     // Ice pellets
    '353': <CloudRain className="w-5 h-5" />,     // Light rain shower
    '356': <CloudRain className="w-5 h-5" />,     // Moderate rain shower
    '359': <CloudRain className="w-5 h-5" />,     // Torrential rain
    '362': <CloudSnow className="w-5 h-5" />,     // Light sleet showers
    '365': <CloudSnow className="w-5 h-5" />,     // Heavy sleet showers
    '368': <CloudSnow className="w-5 h-5" />,     // Light snow showers
    '371': <CloudSnow className="w-5 h-5" />,     // Heavy snow showers
    '374': <CloudSnow className="w-5 h-5" />,     // Light ice pellets
    '377': <CloudSnow className="w-5 h-5" />,     // Heavy ice pellets
    '386': <CloudLightning className="w-5 h-5" />, // Patchy thunder
    '389': <CloudLightning className="w-5 h-5" />, // Thunder
    '392': <CloudLightning className="w-5 h-5" />, // Patchy snow thunder
    '395': <CloudLightning className="w-5 h-5" />, // Heavy snow thunder
  }
  return iconMap[code] || <Cloud className="w-5 h-5" />
}

const CACHE_KEY = 'tabz-weather-cache'
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchWeather = async () => {
      // Check cache first
      try {
        const cached = localStorage.getItem(CACHE_KEY)
        if (cached) {
          const data = JSON.parse(cached) as WeatherData
          if (Date.now() - data.timestamp < CACHE_DURATION) {
            setWeather(data)
            setLoading(false)
            return
          }
        }
      } catch {
        // Ignore cache errors
      }

      try {
        // Fetch from wttr.in - uses IP-based location by default
        const response = await fetch('https://wttr.in/?format=j1', {
          headers: { 'Accept': 'application/json' }
        })

        if (!response.ok) {
          throw new Error('Weather fetch failed')
        }

        const data = await response.json()
        const current = data.current_condition?.[0]
        const area = data.nearest_area?.[0]

        if (!current || !area) {
          throw new Error('Invalid weather data')
        }

        const weatherData: WeatherData = {
          temp: current.temp_F,
          condition: current.weatherDesc?.[0]?.value || 'Unknown',
          location: area.areaName?.[0]?.value || 'Unknown',
          icon: current.weatherCode,
          timestamp: Date.now()
        }

        // Cache the result
        localStorage.setItem(CACHE_KEY, JSON.stringify(weatherData))
        setWeather(weatherData)
        setError(null)
      } catch (err) {
        console.error('Weather fetch error:', err)
        setError('Unable to load weather')
      } finally {
        setLoading(false)
      }
    }

    fetchWeather()
  }, [])

  if (loading) {
    return (
      <div className="weather-widget animate-slide-up stagger-2">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    )
  }

  if (error || !weather) {
    return null // Silently hide on error
  }

  return (
    <div className="weather-widget animate-slide-up stagger-2">
      <div className="weather-icon">
        {getWeatherIcon(weather.icon)}
      </div>
      <div className="weather-info">
        <div className="weather-temp">{weather.temp}°F</div>
        <div className="weather-location">{weather.location}</div>
      </div>
    </div>
  )
}
