import { NextRequest, NextResponse } from 'next/server';
import https from 'https';

interface PostOffice {
  Name: string;
  District: string;
  State: string;
  Block: string;
  BranchType: string;
}

interface PincodeApiResponse {
  Status: string;
  Message: string;
  PostOffice: PostOffice[] | null;
}

// India Post's SSL certificate is currently expired.
// Use Node's https module to bypass SSL verification for this public read-only API.
function fetchPincodeData(pincode: string): Promise<PincodeApiResponse[]> {
  return new Promise((resolve, reject) => {
    const url = `https://api.postalpincode.in/pincode/${pincode}`;
    const req = https.get(url, { rejectUnauthorized: false, timeout: 8000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error('Invalid response from pincode API'));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Pincode API timeout')); });
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    // Validate pincode format
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { success: false, error: 'Pincode must be exactly 6 digits' },
        { status: 400 }
      );
    }

    const data = await fetchPincodeData(code);
    const result = data[0];

    if (result.Status !== 'Success' || !result.PostOffice?.length) {
      return NextResponse.json(
        { success: false, error: 'Invalid pincode' },
        { status: 404 }
      );
    }

    // All post offices for a pincode share the same State and District
    const firstPO = result.PostOffice[0];

    return NextResponse.json({
      success: true,
      state: firstPO.State,
      district: firstPO.District,
      postOffices: result.PostOffice.map((po) => ({
        name: po.Name,
        block: po.Block,
        type: po.BranchType,
      })),
    });
  } catch (error) {
    console.error('Pincode API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to lookup pincode' },
      { status: 500 }
    );
  }
}
