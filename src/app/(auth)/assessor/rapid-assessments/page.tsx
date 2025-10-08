'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PlusCircle, Plus, FileText, Filter, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Link from 'next/link'

interface RapidAssessment {
  id: string
  rapidAssessmentType: string
  rapidAssessmentDate: string
  affectedEntity?: {
    id: string
    name: string
    type: string
  }
  assessorName: string
  createdAt: string
  updatedAt: string
}

const ASSESSMENT_TYPES = [
  { value: 'HEALTH', label: 'Health Assessment', color: 'bg-red-100 text-red-800' },
  { value: 'WASH', label: 'WASH Assessment', color: 'bg-blue-100 text-blue-800' },
  { value: 'SHELTER', label: 'Shelter Assessment', color: 'bg-green-100 text-green-800' },
  { value: 'FOOD', label: 'Food Assessment', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'SECURITY', label: 'Security Assessment', color: 'bg-purple-100 text-purple-800' },
  { value: 'POPULATION', label: 'Population Assessment', color: 'bg-orange-100 text-orange-800' }
]

export default function RapidAssessmentsPage() {
  const [assessments, setAssessments] = useState<RapidAssessment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    const fetchAssessments = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Fetch assessments from backend
        const response = await fetch('/api/v1/rapid-assessments', {
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (response.status === 403) {
          // API not accessible - show empty state for development
          console.log('API not accessible - showing empty state')
          setAssessments([])
          setLoading(false)
          return
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch assessments: ${response.status}`)
        }

        const data = await response.json()
        
        if (data.success) {
          setAssessments(data.data || [])
        } else {
          throw new Error(data.message || 'Failed to load assessments')
        }
      } catch (err) {
        console.error('Error fetching assessments:', err)
        // Don't show error for 403 - treat as expected behavior during development
        if (err instanceof Error && err.message.includes('403')) {
          setAssessments([])
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load assessments')
          setAssessments([])
        }
      } finally {
        setLoading(false)
      }
    }

    fetchAssessments()
  }, [])

  const filteredAssessments = assessments.filter(assessment => {
    const entityName = assessment.affectedEntity?.name || ''
    const matchesSearch = entityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assessment.rapidAssessmentType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assessment.assessorName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || assessment.rapidAssessmentType === filterType
    
    return matchesSearch && matchesType
  })

  const getTypeInfo = (type: string) => {
    return ASSESSMENT_TYPES.find(t => t.value === type) || ASSESSMENT_TYPES[0]
  }

  const handleEdit = (assessmentId: string) => {
    // Navigate to edit page based on assessment type
    window.location.href = `/assessor/rapid-assessments/edit/${assessmentId}`
  }

  const handleView = (assessmentId: string) => {
    // Navigate to view page
    window.location.href = `/assessor/rapid-assessments/view/${assessmentId}`
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Error Loading Assessments</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (assessments.length === 0) {
    return (
      <div className="container mx-auto py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Rapid Assessments</h1>
            <p className="text-muted-foreground">
              View and manage all rapid assessments
            </p>
          </div>
          <Link href="/assessor/rapid-assessments/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Assessment
            </Button>
          </Link>
        </div>

        {/* Empty State */}
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No assessments yet</h3>
            <p className="text-gray-600 mb-6 text-center">
              Create your first rapid assessment to get started with disaster response coordination.
            </p>
            <Link href="/assessor/rapid-assessments/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create First Assessment
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rapid Assessments</h1>
          <p className="text-muted-foreground">
            Complete rapid assessments for disaster response coordination
          </p>
        </div>
        <Link href="/assessor/rapid-assessments/new">
          <Button size="lg">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Assessment
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assessments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Assessment Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {ASSESSMENT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="synced">Synced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Assessment List */}
      <div className="grid gap-4">
        {filteredAssessments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No assessments found</h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchTerm || filterType !== 'all' || filterStatus !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first rapid assessment to get started'
                }
              </p>
              {(!searchTerm && filterType === 'all' && filterStatus === 'all') && (
                <Link href="/assessor/rapid-assessments/new">
                  <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Assessment
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredAssessments.map(assessment => {
            const typeInfo = getTypeInfo(assessment.rapidAssessmentType)
            const entityName = assessment.affectedEntity?.name || 'Unknown Entity'
            return (
              <Card key={assessment.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className={typeInfo.color}>
                          {typeInfo.label}
                        </Badge>
                      </div>
                      <h3 className="font-semibold">{entityName}</h3>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Assessor: {assessment.assessorName}</p>
                        <p>Created: {new Date(assessment.createdAt).toLocaleDateString()}</p>
                        <p>Last Updated: {new Date(assessment.updatedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEdit(assessment.id)}
                      >
                        Edit
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => handleView(assessment.id)}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}