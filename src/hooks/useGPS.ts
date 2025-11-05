'use client'

import { useState, useCallback } from 'react'

export interface GPSLocation {
  latitude: number
  longitude: number
  accuracy?: number
  altitude?: number
  timestamp: Date
  deviceHeading?: number
  speed?: number
}

export interface UseGPSReturn {
  location: GPSLocation | null
  error: string | null
  isLoading: boolean
  getCurrentLocation: () => Promise<GPSLocation>
  watchLocation: (callback: (location: GPSLocation) => void) => () => void
  clearLocation: () => void
}

export function useGPS(): UseGPSReturn {
  const [location, setLocation] = useState<GPSLocation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const getCurrentLocation = useCallback(async (): Promise<GPSLocation> => {
    if (!navigator.geolocation) {
      const errorMessage = 'Geolocation is not supported by this browser'
      setError(errorMessage)
      throw new Error(errorMessage)
    }

    setIsLoading(true)
    setError(null)

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const gpsLocation: GPSLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy || undefined,
            altitude: position.coords.altitude || undefined,
            timestamp: new Date(position.timestamp),
            deviceHeading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined
          }
          
          setLocation(gpsLocation)
          setIsLoading(false)
          setError(null)
          resolve(gpsLocation)
        },
        (error) => {
          const errorMessage = `GPS Error: ${error.message}`
          setError(errorMessage)
          setIsLoading(false)
          reject(new Error(errorMessage))
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000 // 30 seconds
        }
      )
    })
  }, [])

  const watchLocation = useCallback((callback: (location: GPSLocation) => void): (() => void) => {
    if (!navigator.geolocation) {
      const errorMessage = 'Geolocation is not supported by this browser'
      setError(errorMessage)
      throw new Error(errorMessage)
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const gpsLocation: GPSLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy || undefined,
          altitude: position.coords.altitude || undefined,
          timestamp: new Date(position.timestamp),
          deviceHeading: position.coords.heading || undefined,
          speed: position.coords.speed || undefined
        }
        
        setLocation(gpsLocation)
        setError(null)
        callback(gpsLocation)
      },
      (error) => {
        const errorMessage = `GPS Error: ${error.message}`
        setError(errorMessage)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000 // 5 seconds for watching
      }
    )

    // Return cleanup function
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId)
      }
    }
  }, [])

  const clearLocation = useCallback(() => {
    setLocation(null)
    setError(null)
    setIsLoading(false)
  }, [])

  return {
    location,
    error,
    isLoading,
    getCurrentLocation,
    watchLocation,
    clearLocation
  }
}