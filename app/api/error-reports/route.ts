import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const errorReport = await request.json()
    
    // Log the error report
    console.error('Error Report Received:', {
      id: errorReport.id,
      timestamp: errorReport.timestamp,
      severity: errorReport.severity,
      category: errorReport.category,
      message: errorReport.error.message,
      context: errorReport.context
    })

    // Here you can integrate with external error reporting services
    // Examples:
    // - Send to Sentry
    // - Send to LogRocket
    // - Send to Bugsnag
    // - Send to custom logging service
    // - Store in database
    // - Send alerts for critical errors

    // Example: Send critical errors to monitoring service
    if (errorReport.severity === 'critical') {
      // await sendCriticalAlert(errorReport)
    }

    // Example: Store in database for analytics
    // await storeErrorReport(errorReport)

    return NextResponse.json(
      { 
        success: true, 
        message: 'Error report received',
        id: errorReport.id 
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Failed to process error report:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to process error report' 
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  // Return error reporting status/health check
  return NextResponse.json({
    service: 'ChopRek Error Reporting',
    status: 'operational',
    timestamp: new Date().toISOString()
  })
}
