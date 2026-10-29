import { NextResponse, NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, title, message, details } = body;

    if (!to) return NextResponse.json({ error: "No recipient email provided" }, { status: 400 });

    // Build the HTML template dynamically
    let detailsHtml = '';
    if (details && Array.isArray(details)) {
      detailsHtml = details.map((d: any) => `<p style="margin: 5px 0; font-size: 14px; color: #475569;"><strong>${d.label}:</strong> ${d.value}</p>`).join('');
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #0f172a; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">ResourceShare</h1>
        </div>
        <div style="padding: 30px;">
          <h2 style="color: #0f172a; margin-top: 0;">${title}</h2>
          <p style="color: #334155; font-size: 16px; line-height: 1.6;">${message}</p>
          
          ${detailsHtml ? `<div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">${detailsHtml}</div>` : ''}
          
          <div style="margin-top: 30px; text-align: center;">
            <a href="http://localhost:3000/login" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Go to Dashboard</a>
          </div>
        </div>
        <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b;">
          This is an automated message from the ResourceShare Platform.
        </div>
      </div>
    `;

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY || '',
      },
      body: JSON.stringify({
        sender: { name: 'ResourceShare Platform', email: process.env.BREVO_SENDER_EMAIL },
        to: [{ email: to }],
        subject: subject,
        htmlContent: htmlContent,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Brevo Error:", data);
      return NextResponse.json({ error: data }, { status: response.status });
    }

    return NextResponse.json({ success: true, messageId: data.messageId });
  } catch (error: any) {
    console.error("❌ API Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}