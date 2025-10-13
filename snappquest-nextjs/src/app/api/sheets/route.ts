import { NextRequest, NextResponse } from "next/server";

// Server-side only environment variables (do NOT prefix with NEXT_PUBLIC)
const API_KEY = process.env.SHEETS_API_KEY;

// Map of spreadsheet types to IDs
const SPREADSHEET_IDS: Record<string, string> = {
  stats: process.env.SHEETS_STATS_ID || "",
  quests: process.env.SHEETS_QUESTS_ID || "",
  quantity: process.env.SHEETS_QUANTITY_ID || "",
  response: process.env.SHEETS_RESPONSE_ID || "",
  leaderboard: process.env.SHEETS_LEADERBOARD_ID || "",
};

export async function GET(req: NextRequest) {
  try {
    if (!API_KEY) {
      return NextResponse.json(
        { error: "Server configuration missing SHEETS_API_KEY" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const sheetType = searchParams.get("type") || "quests";
    const range = searchParams.get("range");

    if (!range) {
      return NextResponse.json(
        { error: "Range parameter is required" },
        { status: 400 }
      );
    }

    const spreadsheetId =
      SPREADSHEET_IDS[sheetType as keyof typeof SPREADSHEET_IDS];

    if (!spreadsheetId) {
      return NextResponse.json(
        {
          error: `Invalid sheet type: ${sheetType}. Valid types: stats, quests, quantity, response`,
        },
        { status: 400 }
      );
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      range
    )}?key=${API_KEY}`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const txt = await res.text();
      return NextResponse.json(
        { error: `Sheets API error: ${res.status} ${txt}` },
        { status: 500 }
      );
    }
    const json = await res.json();
    return NextResponse.json({ values: json.values ?? [] }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
