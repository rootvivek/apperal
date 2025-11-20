import { NextRequest, NextResponse } from 'next/server';
import { fetchFigmaFile, fetchFigmaNodes, extractFileKeyFromUrl, extractNodeIdFromUrl } from '@/lib/figma-api';

/**
 * API Route to fetch Figma design data
 * 
 * Usage:
 * GET /api/figma/fetch-design?url=https://www.figma.com/design/...
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const figmaUrl = searchParams.get('url');

    if (!figmaUrl) {
      return NextResponse.json(
        { error: 'Figma URL is required' },
        { status: 400 }
      );
    }

    const fileKey = extractFileKeyFromUrl(figmaUrl);
    const nodeId = extractNodeIdFromUrl(figmaUrl);

    if (!fileKey) {
      return NextResponse.json(
        { error: 'Invalid Figma URL. Could not extract file key.' },
        { status: 400 }
      );
    }

    // Fetch file data
    const fileData = await fetchFigmaFile(fileKey);

    // If node ID is provided, fetch specific node data
    let nodeData = null;
    if (nodeId) {
      nodeData = await fetchFigmaNodes(fileKey, [nodeId]);
    }

    return NextResponse.json({
      success: true,
      fileKey,
      nodeId,
      file: fileData,
      node: nodeData,
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch Figma design', details: error.message },
      { status: 500 }
    );
  }
}

