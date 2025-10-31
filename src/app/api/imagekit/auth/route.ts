import { NextResponse } from 'next/server';
import ImageKit from 'imagekit';

// This is a server-side component, so process.env will work here.
const imagekit = new ImageKit({
  publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY!,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
  urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!,
});

export async function GET(request: Request) {
  try {
    const authenticationParameters = imagekit.getAuthenticationParameters();
    return NextResponse.json(authenticationParameters);
  } catch (error) {
    console.error('Error getting ImageKit auth params:', error);
    return NextResponse.json(
      { error: 'Failed to get authentication parameters.' },
      { status: 500 }
    );
  }
}
