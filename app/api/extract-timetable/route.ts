import { NextResponse } from 'next/server';
import { rateLimit, RATE_LIMITS, getIdentifier } from '@/lib/rate-limiter';
import { createClient } from '@/lib/supabase/server';

// Google Gemini API for image-to-text extraction
async function extractTextFromImage(imageBase64: string): Promise<string> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('Google Gemini API key not configured');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Extract timetable data from this image. Return ONLY a valid JSON array, no other text.

IMPORTANT: If multiple classes occur at the same time slot, create separate entries for each class.

JSON structure:
[
  {
    "day": "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday",
    "startTime": "HH:MM",
    "endTime": "HH:MM",
    "subjectCode": "CODE",
    "subjectName": "Full Subject Name",
    "room": "Room Number",
    "instructor": "Instructor Name or Code",
    "type": "lecture" | "lab"
  }
]

RULES:
- Day: Use full names - Monday, Tuesday, Wednesday, Thursday, Friday (convert abbreviations like MON/TUE/WED/THUR/FRI to full names)
- Time: 24-hour format "HH:MM" (e.g., "08:00", "14:30")
- If multiple classes share same time slot, create separate entries
- "type": "lab" for practical/lab sessions (P1, P2, P3), "lecture" for lectures (L)
- Extract subject codes (e.g., "EE208", "EE206") and full names
- Room numbers: extract room codes (e.g., "AB3408", "TWIGF2")
- Instructor: extract instructor codes/names (e.g., "DSM", "DAA", "DCIK")
- Missing fields: use empty string ""
- Return ONLY the JSON array, no markdown, no explanations, no text before or after

Example for multiple classes in same slot:
[
  {"day":"Monday","startTime":"16:00","endTime":"17:00","subjectCode":"EE204","subjectName":"","room":"PSL","instructor":"DNK-1","type":"lab"},
  {"day":"Monday","startTime":"16:00","endTime":"17:00","subjectCode":"EE208","subjectName":"","room":"SML","instructor":"KD","type":"lab"},
  {"day":"Monday","startTime":"16:00","endTime":"17:00","subjectCode":"EE210","subjectName":"","room":"Instru Lab","instructor":"DCIK","type":"lab"}
]`,
              },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: imageBase64.split(',')[1], // Remove data:image/jpeg;base64, prefix
                },
              },
            ],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${error}`);
  }

  const data = await response.json();
  let extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
  
  // Remove markdown code blocks
  extractedText = extractedText
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
  
  // Extract JSON array - find the first [ and last matching ]
  const firstBracket = extractedText.indexOf('[');
  const lastBracket = extractedText.lastIndexOf(']');
  
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    extractedText = extractedText.substring(firstBracket, lastBracket + 1);
  } else {
    // Fallback: try to find JSON array pattern
    const jsonMatch = extractedText.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      extractedText = jsonMatch[0];
    } else {
      // Last resort: return empty array
      return '[]';
    }
  }
  
  // Validate it's valid JSON by trying to parse it
  try {
    JSON.parse(extractedText);
    return extractedText;
  } catch {
    // If parsing fails, try to fix common issues
    // Remove any trailing text after the closing bracket
    const fixed = extractedText.replace(/\][\s\S]*$/, ']');
    try {
      JSON.parse(fixed);
      return fixed;
    } catch {
      return '[]';
    }
  }
}

// Parse extracted text and convert to slots format
function parseExtractedSlots(extractedJson: string): any[] {
  try {
    // Log the extracted JSON for debugging (first 500 chars)
    
    const classes = JSON.parse(extractedJson);
    
    if (!Array.isArray(classes)) {
      console.error('Parsed data is not an array:', typeof classes);
      return [];
    }

    const dayMap: Record<string, number> = {
      'Monday': 0,
      'Tuesday': 1,
      'Wednesday': 2,
      'Thursday': 3,
      'Friday': 4,
      'MON': 0,
      'TUE': 1,
      'WED': 2,
      'THUR': 3,
      'THURSDAY': 3,
      'FRI': 4,
    };

    const validClasses = classes
      .filter(cls => {
        if (!cls.day || !cls.startTime || !cls.subjectCode) {
          return false;
        }
        return true;
      })
      .map((cls, idx) => {
        // Normalize day name
        const dayName = cls.day.charAt(0).toUpperCase() + cls.day.slice(1).toLowerCase();
        const dayNum = dayMap[dayName] ?? dayMap[cls.day] ?? 0;
        
        return {
          id: `extracted-${Date.now()}-${idx}`,
          day: dayNum,
          startTime: cls.startTime || '08:00',
          endTime: cls.endTime || cls.startTime || '09:00',
          subject: cls.subjectCode || '',
          subjectName: cls.subjectName || '',
          room: cls.room || '',
          instructor: cls.instructor || '',
          type: cls.type === 'lab' ? 'lab' : 'lecture',
          rowSpan: 1,
        };
      });

    return validClasses;
  } catch (error: any) {
    console.error('Error parsing extracted JSON:', error.message);
    return [];
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Authenticate user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Block guests from using AI timetable extraction
    if (user.user_metadata?.is_guest) {
      return NextResponse.json(
        { error: 'AI timetable extraction is not available for guest users. Please sign up to use this feature.' },
        { status: 403 }
      );
    }

    // Rate limiting: 5 uploads per hour per user
    const rateLimitResult = rateLimit(getIdentifier(user.id), RATE_LIMITS.IMAGE_UPLOAD);
    
    if (!rateLimitResult.success) {
      const resetIn = Math.ceil((rateLimitResult.resetTime - Date.now()) / (1000 * 60));
      return NextResponse.json(
        { error: `Too many extraction requests. Please try again in ${resetIn} minutes.` },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (imageFile.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image must be less than 10MB' }, { status: 400 });
    }

    // Validate file type
    if (!imageFile.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Convert image to base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = `data:${imageFile.type};base64,${buffer.toString('base64')}`;

    // Extract text from image using Gemini
    const extractedJson = await extractTextFromImage(base64Image);
    
    // Parse and convert to slots format
    const slots = parseExtractedSlots(extractedJson);

    if (slots.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No timetable data could be extracted from the image. Please ensure the image is clear and contains a visible timetable.',
        slots: [],
      });
    }

    return NextResponse.json({
      success: true,
      slots,
      message: `Successfully extracted ${slots.length} classes from the timetable image.`,
    });
  } catch (error: any) {
    console.error('Error extracting timetable:', error);
    
    // Check if it's an API key error
    if (error.message?.includes('API key')) {
      return NextResponse.json(
        { error: 'AI extraction service is not configured. Please contact support.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to extract timetable. Please try again with a clearer image.' },
      { status: 500 }
    );
  }
}
