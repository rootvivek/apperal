import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Return empty wishlist for external requests
  return NextResponse.json({ wishlist: [] });
}

export async function POST(request: NextRequest) {
  // Handle any POST requests if needed
  return NextResponse.json({ success: true });
}
