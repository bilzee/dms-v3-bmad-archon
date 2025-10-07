'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select'
import { 
  getAllStates,
  getLGAsByState,
  getWardsByLGA,
  findStateByLGA 
} from '@/lib/data/nigeria-locations'

interface LocationSelectorProps {
  onLocationChange: (lga: string, ward: string) => void
  initialLGA?: string
  initialWard?: string
  disabled?: boolean
  required?: boolean
  showState?: boolean
}

export function LocationSelector({
  onLocationChange,
  initialLGA,
  initialWard,
  disabled = false,
  required = false,
  showState = true
}: LocationSelectorProps) {
  const [selectedState, setSelectedState] = useState<string>('')
  const [selectedLGA, setSelectedLGA] = useState<string>(initialLGA || '')
  const [selectedWard, setSelectedWard] = useState<string>(initialWard || '')
  
  const [availableLGAs, setAvailableLGAs] = useState<string[]>([])
  const [availableWards, setAvailableWards] = useState<string[]>([])

  // Initialize state based on initial LGA
  useEffect(() => {
    if (initialLGA && !selectedState) {
      const state = findStateByLGA(initialLGA)
      if (state) {
        setSelectedState(state)
        setAvailableLGAs(getLGAsByState(state))
        
        if (initialWard) {
          setAvailableWards(getWardsByLGA(state, initialLGA))
        }
      }
    }
  }, [initialLGA, initialWard, selectedState])

  const handleStateChange = (state: string) => {
    setSelectedState(state)
    setSelectedLGA('')
    setSelectedWard('')
    setAvailableLGAs(getLGAsByState(state))
    setAvailableWards([])
  }

  const handleLGAChange = (lga: string) => {
    setSelectedLGA(lga)
    setSelectedWard('')
    setAvailableWards(getWardsByLGA(selectedState, lga))
  }

  const handleWardChange = (ward: string) => {
    setSelectedWard(ward)
    onLocationChange(selectedLGA, ward)
  }

  const states = getAllStates()

  return (
    <div className="space-y-4">
      {showState && (
        <div className="space-y-2">
          <Label htmlFor="state-select">
            State {required && <span className="text-red-500">*</span>}
          </Label>
          <Select 
            value={selectedState} 
            onValueChange={handleStateChange}
            disabled={disabled}
          >
            <SelectTrigger id="state-select">
              <SelectValue placeholder="Select a state" />
            </SelectTrigger>
            <SelectContent>
              {states.map((state) => (
                <SelectItem key={state} value={state}>
                  {state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="lga-select">
          Local Government Area (LGA) {required && <span className="text-red-500">*</span>}
        </Label>
        <Select 
          value={selectedLGA} 
          onValueChange={handleLGAChange}
          disabled={disabled || (!showState ? false : !selectedState)}
        >
          <SelectTrigger id="lga-select">
            <SelectValue placeholder="Select an LGA" />
          </SelectTrigger>
          <SelectContent>
            {availableLGAs.map((lga) => (
              <SelectItem key={lga} value={lga}>
                {lga}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ward-select">
          Ward {required && <span className="text-red-500">*</span>}
        </Label>
        <Select 
          value={selectedWard} 
          onValueChange={handleWardChange}
          disabled={disabled || !selectedLGA}
        >
          <SelectTrigger id="ward-select">
            <SelectValue placeholder="Select a ward" />
          </SelectTrigger>
          <SelectContent>
            {availableWards.map((ward) => (
              <SelectItem key={ward} value={ward}>
                {ward}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}