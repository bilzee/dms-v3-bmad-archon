'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Users, Droplets, Home, Apple, Shield, Heart } from 'lucide-react'
import Link from 'next/link'

const ASSESSMENT_TYPES = [
  {
    value: 'HEALTH',
    title: 'Health Assessment',
    description: 'Assess medical facilities, services, and health needs',
    icon: Heart,
    color: 'bg-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    features: [
      'Medical facility evaluation',
      'Health worker assessment',
      'Medicine supply analysis',
      'Disease surveillance'
    ]
  },
  {
    value: 'WASH',
    title: 'WASH Assessment',
    description: 'Water, sanitation, and hygiene evaluation',
    icon: Droplets,
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    features: [
      'Water source quality',
      'Sanitation facilities',
      'Hygiene practices',
      'Waste management'
    ]
  },
  {
    value: 'SHELTER',
    title: 'Shelter Assessment',
    description: 'Housing and shelter conditions evaluation',
    icon: Home,
    color: 'bg-green-500',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    features: [
      'Shelter adequacy',
      'Weather protection',
      'Overcrowding assessment',
      'Construction materials'
    ]
  },
  {
    value: 'FOOD',
    title: 'Food Security Assessment',
    description: 'Food availability and nutrition evaluation',
    icon: Apple,
    color: 'bg-yellow-500',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    features: [
      'Food availability',
      'Nutrition status',
      'Food access',
      'Market functionality'
    ]
  },
  {
    value: 'SECURITY',
    title: 'Security Assessment',
    description: 'Protection and safety evaluation',
    icon: Shield,
    color: 'bg-purple-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    features: [
      'Safety assessment',
      'Protection mechanisms',
      'GBV reporting',
      'Security threats'
    ]
  },
  {
    value: 'POPULATION',
    title: 'Population Assessment',
    description: 'Demographics and population analysis',
    icon: Users,
    color: 'bg-orange-500',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    features: [
      'Population count',
      'Demographics',
      'Vulnerable groups',
      'Casualty assessment'
    ]
  }
]

export default function NewAssessmentPage() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/assessor/rapid-assessments">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Assessments
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Assessment</h1>
          <p className="text-muted-foreground">
            Select the type of rapid assessment you want to complete
          </p>
        </div>
      </div>

      {/* Assessment Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ASSESSMENT_TYPES.map(type => {
          const IconComponent = type.icon
          return (
            <Card key={type.value} className={`hover:shadow-lg transition-all duration-200 cursor-pointer border-2 ${type.borderColor} hover:scale-105`}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${type.color}`}>
                    <IconComponent className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{type.title}</CardTitle>
                    <Badge variant="secondary" className="mt-1">
                      {type.value}
                    </Badge>
                  </div>
                </div>
                <CardDescription className="text-sm">
                  {type.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">Key Assessment Areas:</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {type.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <Link href={`/assessor/rapid-assessments/new/${type.value.toLowerCase()}`}>
                  <Button className="w-full">
                    Start {type.title.split(' ')[0]} Assessment
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>Assessment Guidelines</CardTitle>
          <CardDescription>
            Important information for conducting rapid assessments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Before You Start:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Ensure you have proper authorization for the assessment area</li>
                <li>• Verify GPS functionality on your device</li>
                <li>• Prepare necessary assessment tools and forms</li>
                <li>• Identify key informants and stakeholders</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">During Assessment:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Take clear photos of relevant conditions</li>
                <li>• Capture accurate GPS coordinates</li>
                <li>• Interview multiple sources when possible</li>
                <li>• Document observations objectively</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}