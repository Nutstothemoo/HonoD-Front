import { NextRequest, NextResponse } from 'next/server';
import { callVeloce } from '@/lib/veloce';
import { VeloceRequest } from '@/types/veloce';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { stops, vehicles, options } = body as VeloceRequest;

  if (!vehicles?.length) {
    return NextResponse.json({ error: 'vehicles array is required' }, { status: 400 });
  }
  if (!stops?.length) {
    return NextResponse.json({ error: 'stops array is required' }, { status: 400 });
  }

  try {
    const solution = await callVeloce({ stops, vehicles, options });
    return NextResponse.json(solution);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
