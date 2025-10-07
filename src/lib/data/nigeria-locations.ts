// Sample Nigerian states, LGAs, and wards data
// This is a subset for demonstration - in production, this would come from a comprehensive database

export interface Ward {
  name: string
}

export interface LGA {
  name: string
  wards: Ward[]
}

export interface State {
  name: string
  lgas: LGA[]
}

export const nigerianStatesData: State[] = [
  {
    name: "Lagos",
    lgas: [
      {
        name: "Agege",
        wards: [
          { name: "Agege Ward 1" },
          { name: "Agege Ward 2" },
          { name: "Agege Ward 3" },
          { name: "Agege Ward 4" },
          { name: "Agege Ward 5" }
        ]
      },
      {
        name: "Alimosho",
        wards: [
          { name: "Alimosho Ward 1" },
          { name: "Alimosho Ward 2" },
          { name: "Alimosho Ward 3" },
          { name: "Alimosho Ward 4" },
          { name: "Alimosho Ward 5" },
          { name: "Alimosho Ward 6" },
          { name: "Alimosho Ward 7" },
          { name: "Alimosho Ward 8" },
          { name: "Alimosho Ward 9" },
          { name: "Alimosho Ward 10" }
        ]
      },
      {
        name: "Lagos Island",
        wards: [
          { name: "Lagos Island Ward 1" },
          { name: "Lagos Island Ward 2" },
          { name: "Lagos Island Ward 3" },
          { name: "Lagos Island Ward 4" },
          { name: "Lagos Island Ward 5" }
        ]
      },
      {
        name: "Lagos Mainland",
        wards: [
          { name: "Lagos Mainland Ward 1" },
          { name: "Lagos Mainland Ward 2" },
          { name: "Lagos Mainland Ward 3" },
          { name: "Lagos Mainland Ward 4" },
          { name: "Lagos Mainland Ward 5" }
        ]
      },
      {
        name: "Ikeja",
        wards: [
          { name: "Ikeja Ward 1" },
          { name: "Ikeja Ward 2" },
          { name: "Ikeja Ward 3" },
          { name: "Ikeja Ward 4" },
          { name: "Ikeja Ward 5" }
        ]
      }
    ]
  },
  {
    name: "Kano",
    lgas: [
      {
        name: "Kano Municipal",
        wards: [
          { name: "Kano Municipal Ward 1" },
          { name: "Kano Municipal Ward 2" },
          { name: "Kano Municipal Ward 3" },
          { name: "Kano Municipal Ward 4" },
          { name: "Kano Municipal Ward 5" }
        ]
      },
      {
        name: "Fagge",
        wards: [
          { name: "Fagge Ward 1" },
          { name: "Fagge Ward 2" },
          { name: "Fagge Ward 3" },
          { name: "Fagge Ward 4" },
          { name: "Fagge Ward 5" }
        ]
      },
      {
        name: "Dala",
        wards: [
          { name: "Dala Ward 1" },
          { name: "Dala Ward 2" },
          { name: "Dala Ward 3" },
          { name: "Dala Ward 4" },
          { name: "Dala Ward 5" }
        ]
      }
    ]
  },
  {
    name: "Kaduna",
    lgas: [
      {
        name: "Kaduna North",
        wards: [
          { name: "Kaduna North Ward 1" },
          { name: "Kaduna North Ward 2" },
          { name: "Kaduna North Ward 3" },
          { name: "Kaduna North Ward 4" },
          { name: "Kaduna North Ward 5" }
        ]
      },
      {
        name: "Kaduna South",
        wards: [
          { name: "Kaduna South Ward 1" },
          { name: "Kaduna South Ward 2" },
          { name: "Kaduna South Ward 3" },
          { name: "Kaduna South Ward 4" },
          { name: "Kaduna South Ward 5" }
        ]
      },
      {
        name: "Chikun",
        wards: [
          { name: "Chikun Ward 1" },
          { name: "Chikun Ward 2" },
          { name: "Chikun Ward 3" },
          { name: "Chikun Ward 4" },
          { name: "Chikun Ward 5" }
        ]
      }
    ]
  },
  {
    name: "Rivers",
    lgas: [
      {
        name: "Port Harcourt",
        wards: [
          { name: "Port Harcourt Ward 1" },
          { name: "Port Harcourt Ward 2" },
          { name: "Port Harcourt Ward 3" },
          { name: "Port Harcourt Ward 4" },
          { name: "Port Harcourt Ward 5" }
        ]
      },
      {
        name: "Obio-Akpor",
        wards: [
          { name: "Obio-Akpor Ward 1" },
          { name: "Obio-Akpor Ward 2" },
          { name: "Obio-Akpor Ward 3" },
          { name: "Obio-Akpor Ward 4" },
          { name: "Obio-Akpor Ward 5" }
        ]
      },
      {
        name: "Eleme",
        wards: [
          { name: "Eleme Ward 1" },
          { name: "Eleme Ward 2" },
          { name: "Eleme Ward 3" },
          { name: "Eleme Ward 4" },
          { name: "Eleme Ward 5" }
        ]
      }
    ]
  },
  {
    name: "Oyo",
    lgas: [
      {
        name: "Ibadan North",
        wards: [
          { name: "Ibadan North Ward 1" },
          { name: "Ibadan North Ward 2" },
          { name: "Ibadan North Ward 3" },
          { name: "Ibadan North Ward 4" },
          { name: "Ibadan North Ward 5" }
        ]
      },
      {
        name: "Ibadan South-West",
        wards: [
          { name: "Ibadan South-West Ward 1" },
          { name: "Ibadan South-West Ward 2" },
          { name: "Ibadan South-West Ward 3" },
          { name: "Ibadan South-West Ward 4" },
          { name: "Ibadan South-West Ward 5" }
        ]
      },
      {
        name: "Egbeda",
        wards: [
          { name: "Egbeda Ward 1" },
          { name: "Egbeda Ward 2" },
          { name: "Egbeda Ward 3" },
          { name: "Egbeda Ward 4" },
          { name: "Egbeda Ward 5" }
        ]
      }
    ]
  }
]

// Helper functions
export const getAllStates = () => nigerianStatesData.map(state => state.name)

export const getLGAsByState = (stateName: string) => {
  const state = nigerianStatesData.find(s => s.name === stateName)
  return state ? state.lgas.map(lga => lga.name) : []
}

export const getWardsByLGA = (stateName: string, lgaName: string) => {
  const state = nigerianStatesData.find(s => s.name === stateName)
  if (!state) return []
  
  const lga = state.lgas.find(l => l.name === lgaName)
  return lga ? lga.wards.map(ward => ward.name) : []
}

export const findStateByLGA = (lgaName: string) => {
  for (const state of nigerianStatesData) {
    if (state.lgas.some(lga => lga.name === lgaName)) {
      return state.name
    }
  }
  return null
}