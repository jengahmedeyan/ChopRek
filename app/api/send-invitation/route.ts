import { type NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { invitation } = await request.json()

    if (!invitation) {
      return NextResponse.json({ error: "Invitation data is required" }, { status: 400 })
    }

    // Generate invite URL
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/join?token=${invitation.token}`

    const { data, error } = await resend.emails.send({
    //   from: process.env.RESEND_FROM_EMAIL,
      from: 'onboarding@resend.dev',
      to: [invitation.email],
      subject: "You're invited to join our team!",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>You're invited to join our team</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
            <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <!-- Header -->
              <div style="text-align: center; margin-bottom: 40px;">
                <h1 style="color: #1a1a1a; font-size: 28px; font-weight: 700; margin: 0 0 8px 0;">
                  🎉 You're Invited!
                </h1>
                <p style="color: #666; font-size: 16px; margin: 0;">
                  Join our team and start collaborating
                </p>
              </div>
              
              <!-- Invitation Details -->
              <div style="background: #f8f9fa; padding: 24px; border-radius: 8px; margin-bottom: 32px; border-left: 4px solid #007bff;">
                <h3 style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 18px;">Invitation Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; font-weight: 600; color: #555; width: 100px;">Name:</td>
                    <td style="padding: 8px 0; color: #1a1a1a;">${invitation.displayName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: 600; color: #555;">Email:</td>
                    <td style="padding: 8px 0; color: #1a1a1a;">${invitation.email}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: 600; color: #555;">Role:</td>
                    <td style="padding: 8px 0;">
                      <span style="background: ${invitation.role === "admin" ? "#dc3545" : "#28a745"}; color: white; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                        ${invitation.role}
                      </span>
                    </td>
                  </tr>
                  ${
                    invitation.department
                      ? `
                  <tr>
                    <td style="padding: 8px 0; font-weight: 600; color: #555;">Department:</td>
                    <td style="padding: 8px 0; color: #1a1a1a;">${invitation.department}</td>
                  </tr>
                  `
                      : ""
                  }
                </table>
              </div>
              
              ${
                invitation.inviteMessage
                  ? `
              <!-- Personal Message -->
              <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin-bottom: 32px; border-left: 4px solid #2196f3;">
                <h3 style="margin: 0 0 12px 0; color: #1565c0; font-size: 16px;">💬 Personal Message</h3>
                <p style="margin: 0; color: #1a1a1a; font-style: italic; line-height: 1.5;">
                  "${invitation.inviteMessage}"
                </p>
              </div>
              `
                  : ""
              }
              
              <!-- Call to Action -->
              <div style="text-align: center; margin: 40px 0;">
                <a href="${inviteUrl}" 
                   style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3); transition: all 0.2s ease;">
                  🚀 Accept Invitation & Join Team
                </a>
              </div>
              
              <!-- Footer Info -->
              <div style="border-top: 1px solid #e9ecef; padding-top: 24px; margin-top: 32px;">
                <p style="color: #666; font-size: 14px; margin: 0 0 12px 0; text-align: center;">
                  ⏰ This invitation will expire in <strong>7 days</strong>
                </p>
                <p style="color: #666; font-size: 14px; margin: 0 0 16px 0; text-align: center;">
                  If you have any questions, please contact your administrator.
                </p>
                
                <!-- Backup Link -->
                <div style="background: #f8f9fa; padding: 16px; border-radius: 6px; margin-top: 20px;">
                  <p style="color: #666; font-size: 12px; margin: 0 0 8px 0; text-align: center;">
                    <strong>Can't click the button?</strong> Copy and paste this link into your browser:
                  </p>
                  <p style="color: #007bff; font-size: 12px; margin: 0; text-align: center; word-break: break-all;">
                    ${inviteUrl}
                  </p>
                </div>
              </div>
            </div>
            
            <!-- Email Footer -->
            <div style="text-align: center; margin-top: 20px; padding: 20px;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                This email was sent automatically. Please do not reply to this email.
              </p>
            </div>
          </body>
        </html>
      `,
    })

    if (error) {
      console.error("Resend error:", error)
      return NextResponse.json({ error: "Failed to send email", details: error }, { status: 500 })
    }

    console.log("Email sent successfully:", data)
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("Error sending invitation:", error)
    return NextResponse.json(
      {
        error: "Failed to send invitation",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
