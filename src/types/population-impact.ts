/**
 * Population impact calculations for incidents
 * Aggregates data from linked PreliminaryAssessments
 */

export interface PopulationImpact {
  /** Total estimated population from linked assessments */
  totalPopulation: number
  
  /** Total lives lost across all linked assessments */
  livesLost: number
  
  /** Total injured across all linked assessments */
  injured: number
  
  /** Total displaced across all linked assessments */
  displaced: number
  
  /** Number of unique entities affected */
  affectedEntities: number
  
  /** Total houses affected across assessments */
  housesAffected: number
  
  /** Total schools affected across assessments */
  schoolsAffected: number
  
  /** Total medical facilities affected across assessments */
  medicalFacilitiesAffected: number
  
  /** Agricultural land affected (in hectares) */
  agriculturalLandAffected: number
  
  /** Calculated epicenter coordinates (average of linked assessments) */
  epicenter: { lat: number; lng: number } | null
  
  /** When the impact was last calculated */
  lastUpdated: string
  
  /** Number of linked assessments used for calculation */
  assessmentCount: number
}

export interface PopulationImpactCalculation {
  /** Unique incident identifier */
  incidentId: string
  
  /** Database aggregation results */
  populationData: {
    _sum: {
      numberLivesLost: number
      numberInjured: number
      numberDisplaced: number
      numberHousesAffected: number
      numberSchoolsAffected: number
      numberMedicalFacilitiesAffected: number
    }
    _avg: {
      reportingLatitude: number
      reportingLongitude: number
    }
  }
  
  /** Infrastructure details from assessments */
  infrastructureData: Array<{
    schoolsAffected?: string
    medicalFacilitiesAffected?: string
    estimatedAgriculturalLandsAffected?: string
  }>
  
  /** Number of unique entities linked to incident */
  entityCount: number
  
  /** Agricultural land impact calculation (hectares) */
  agriculturalImpact: number
  
  /** Calculated epicenter coordinates */
  epicenter: { lat: number; lng: number } | null
}