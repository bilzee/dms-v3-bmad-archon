import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

const secret = process.env.NEXTAUTH_SECRET

// For demo purposes, store changes in memory
// In production, this would be stored in a database
const thresholdUpdates: Record<string, any> = {}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const token = await getToken({ req: request, secret })
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params

    // In a real implementation, fetch from database
    // For now, return a mock response
    const threshold = {
      id,
      impactType: id.startsWith('pop_') ? 'POPULATION' : 'PRELIMINARY',
      severityLevel: id.includes('critical') ? 'CRITICAL' : id.includes('high') ? 'HIGH' : 'MEDIUM',
      livesLostMin: 1,
      injuredMin: 1,
      displacedMin: 1,
      description: 'Configurable threshold',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...thresholdUpdates[id] // Apply any updates
    }

    return NextResponse.json({
      success: true,
      data: threshold
    })

  } catch (error) {
    console.error('Severity threshold GET error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const token = await getToken({ req: request, secret })
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params
    const body = await request.json()

    // Validate update fields
    const allowedFields = [
      'livesLostMin', 
      'injuredMin', 
      'displacedMin', 
      'description', 
      'isActive'
    ]
    
    const updateData: any = {}
    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key)) {
        updateData[key] = value
      }
    }

    // Add updated timestamp
    updateData.updatedAt = new Date().toISOString()

    // Store the update (in production, this would update the database)
    thresholdUpdates[id] = { ...thresholdUpdates[id], ...updateData }

    // Return updated threshold
    const updatedThreshold = {
      id,
      impactType: id.startsWith('pop_') ? 'POPULATION' : 'PRELIMINARY',
      severityLevel: id.includes('critical') ? 'CRITICAL' : id.includes('high') ? 'HIGH' : 'MEDIUM',
      livesLostMin: 1,
      injuredMin: 1,
      displacedMin: 1,
      description: 'Configurable threshold',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...thresholdUpdates[id]
    }

    return NextResponse.json({
      success: true,
      data: updatedThreshold,
      message: 'Severity threshold updated successfully'
    })

  } catch (error) {
    console.error('Severity threshold PUT error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const token = await getToken({ req: request, secret })
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params

    // In production, this would delete from database
    delete thresholdUpdates[id]

    return NextResponse.json({
      success: true,
      message: 'Severity threshold deleted successfully'
    })

  } catch (error) {
    console.error('Severity threshold DELETE error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    )
  }
}