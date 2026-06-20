import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "dummy_key");

export async function POST(req: Request) {
  try {
    const { documentName, objectId, aesKey, emails } = await req.json();

    if (!documentName || !objectId || !aesKey || !emails || !Array.isArray(emails)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // In a real app, you would dynamically get the current origin
    // For local development, we default to localhost:3000
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const magicLink = `${baseUrl}/sign/${objectId}?key=${encodeURIComponent(aesKey)}`;

    // If no real API key is present, just log to console
    if (!process.env.RESEND_API_KEY) {
      console.log("\n=============================================");
      console.log("📨 [MOCK EMAIL DISPATCH]");
      console.log(`To: ${emails.join(", ")}`);
      console.log(`Subject: Action Required: Signature Requested for "${documentName}"`);
      console.log(`Magic Link: ${magicLink}`);
      console.log("=============================================\n");
      
      return NextResponse.json({ success: true, mock: true });
    }

    const { data, error } = await resend.emails.send({
      from: "TorrentSign <invites@resend.dev>",
      to: emails,
      subject: `Action Required: Signature Requested for "${documentName}"`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #0f172a; margin-bottom: 16px;">Signature Requested</h2>
          <p style="color: #475569; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
            You have been requested to cryptographically sign the document: <strong>${documentName}</strong>.
          </p>
          <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
            <p style="color: #64748b; font-size: 14px; margin: 0;">Sui Document ID:</p>
            <p style="font-family: monospace; color: #0f172a; font-size: 14px; word-break: break-all; margin-top: 4px;">${objectId}</p>
          </div>
          <a href="${magicLink}" style="display: inline-block; background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 8px; margin-bottom: 24px;">
            Review and Sign Document
          </a>
          <p style="color: #ef4444; font-size: 14px; margin-bottom: 0;">
            <strong>Security Warning:</strong> This link contains a highly sensitive decryption key. Do not forward this email to anyone.
          </p>
        </div>
      `,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
