import { NextResponse } from 'next/server';

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
const MSG91_API_URL = 'https://control.msg91.com/api/v5/widget/verifyAccessToken';

interface MSG91VerifyResponse {
  type: string;
  status: string;
  message: string;
  data?: {
    phone?: string;
    countryCode?: string;
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accessToken } = body;

    if (!accessToken) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Access token is required' 
        },
        { status: 400 }
      );
    }

    if (!MSG91_AUTH_KEY) {
      console.error('MSG91_AUTH_KEY environment variable is not configured');
      return NextResponse.json(
        { 
          success: false,
          error: 'Service configuration error' 
        },
        { status: 500 }
      );
    }

    const response = await fetch(MSG91_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        authkey: MSG91_AUTH_KEY,
        'access-token': accessToken,
      }),
    });

    const data: MSG91VerifyResponse = await response.json();

    if (!response.ok) {
      console.error('MSG91 verification failed:', {
        status: response.status,
        statusText: response.statusText,
        data
      });

      return NextResponse.json(
        { 
          success: false,
          error: data.message || 'Token verification failed',
          details: {
            type: data.type,
            status: data.status
          }
        },
        { status: response.status }
      );
    }

    // Check if verification was successful
    const isSuccess = 
      data.status === 'success' || 
      data.type === 'success' ||
      (typeof data.message === 'string' && data.message.toLowerCase().includes('success'));

    if (!isSuccess) {
      return NextResponse.json(
        {
          success: false,
          error: data.message || 'Verification failed',
          details: {
            type: data.type,
            status: data.status
          }
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: data.message,
      data: data.data
    });
  } catch (error) {
    console.error('Error verifying MSG91 token:', error);
    
    // Check if it's a network error
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Unable to reach verification service',
          details: { message: error.message }
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: { message: error instanceof Error ? error.message : 'Unknown error' }
      },
      { status: 500 }
    );
  }
}