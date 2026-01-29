import { NextRequest, NextResponse } from 'next/server';
import { format } from 'date-fns';

const TEAMS_WEBHOOK_URL = 'https://primeforge.webhook.office.com/webhookb2/e181576b-68a4-451e-923e-2e17980fe0af@87fb5bcd-4ec5-4078-9eef-5cb4896ef567/IncomingWebhook/430a3c998cff423eaecc98c2b4ab260e/3da5e9ff-93fb-41fa-8a5f-4eedd40e6881/V2G5544LSVr0H-r8MInj-iI5IQXvJclFr_PY-Bv6rXOdQ1';

export async function POST(request: NextRequest) {
  try {
    const menu = await request.json();

    const message = {
      "@type": "MessageCard",
      "@context": "https://schema.org/extensions",
      "summary": "New Menu Available",
      "themeColor": "0078D4",
      "title": "🍽️ New Lunch Menu Available!",
      "sections": [
        {
          "activityTitle": menu.title,
          "activitySubtitle": format(new Date(menu.date), "EEEE, MMMM dd, yyyy"),
          "activityImage": menu.imageUrl || undefined,
          "facts": [
            {
              "name": "📝 Description:",
              "value": menu.description
            },
            {
              "name": "⏰ Order Cutoff:",
              "value": menu.cutoffTime
            },
            {
              "name": "🍱 Options Available:",
              "value": menu.options.length.toString()
            }
          ],
          "text": menu.options.map((opt: any, idx: number) => 
            `${idx + 1}. **${opt.name}** - ${opt.dietary}${opt.description ? `\n   _${opt.description}_` : ''}`
          ).join('\n\n')
        }
      ],
      "potentialAction": [
        {
          "@type": "OpenUri",
          "name": "View Menu & Order",
          "targets": [
            {
              "os": "default",
              "uri": `${request.nextUrl.origin}/employee/menu`
            }
          ]
        }
      ]
    };

    const response = await fetch(TEAMS_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(`Teams webhook failed: ${response.statusText}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to send Teams notification:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}
