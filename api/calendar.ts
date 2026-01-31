import { VercelRequest, VercelResponse } from '@vercel/node';
import { execSync } from 'child_process';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Fetch calendar events from Google Calendar via Zapier MCP
    const input = {
      timeMin: req.query.timeMin || new Date().toISOString(),
      timeMax: req.query.timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      maxResults: parseInt(req.query.maxResults as string) || 50,
    };

    console.log('[Calendar API] Fetching events with input:', input);

    // Call Zapier MCP to fetch events
    const command = `manus-mcp-cli tool call google_calendar_find_events --server zapier --input '${JSON.stringify(input)}'`;
    
    const result = execSync(command, { 
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
      timeout: 30000,
    });
    
    const data = JSON.parse(result);
    
    // Transform events to our format
    const events = (data.events || []).map((event: any) => ({
      id: event.id || `event-${Date.now()}`,
      summary: event.summary || 'Untitled Event',
      description: event.description,
      start: event.start?.dateTime || event.start?.date || new Date().toISOString(),
      end: event.end?.dateTime || event.end?.date || new Date().toISOString(),
      calendarName: event.organizer?.displayName || event.calendarName || 'My Calendar',
    }));

    console.log(`[Calendar API] Fetched ${events.length} events`);

    res.status(200).json({ events });
  } catch (error: any) {
    console.error('[Calendar API] Error:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch calendar events',
      message: error.message 
    });
  }
}
