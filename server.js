require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiters
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  message: { error: 'Too many requests. Please try again later.' }
});

const leadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { error: 'Too many submissions. Please try again later.' }
});

// Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// System prompt for chatbot
const SYSTEM_PROMPT = `You are GrowthPath Academy's friendly student counselor chatbot. You help prospective students and parents with course inquiries. You have detailed knowledge of all courses:

COURSES:
- IIT-JEE: For Class 11-12 students, ₹85,000/year, 2 year program, next batch starts July 2026, includes DPPs + weekly tests + doubt sessions
- NEET: For Class 11-12 students, ₹75,000/year, 2 year program, next batch starts July 2026, includes biology practicals + NCERT mastery
- UPSC: For graduates, ₹1,20,000 total, 12 months, next batch August 2026, covers Prelims + Mains + Interview
- Foundation: For Class 8-10, ₹45,000/year, builds strong base for competitive exams
- Crash Course: For Class 12, ₹35,000 total, 3 months intensive, starts March every year
- Online Batches: All courses available live online, ₹50,000-₹90,000, same faculty as offline

SCHOLARSHIP: Top rankers in entrance test get 25%-100% fee waiver
HOSTEL: Available in Chandigarh campus, ₹8,000/month including meals
DEMO CLASS: Free demo class available for all courses — just book a slot

Your conversation flow:
1. Greet warmly, ask what course/exam they're interested in
2. Based on their answer, share relevant course details (fees, duration, batch dates)
3. Ask their current class/qualification to recommend the right program
4. Answer any questions about fees, scholarships, hostel, study material, faculty
5. If they seem interested, say 'Let me connect you with a senior counselor for a free guidance session' and ask for their name, phone, email, city
6. After collecting details, confirm and say 'A counselor will call you within 1 hour to schedule your free demo class!'

Be enthusiastic but not pushy. Support Hindi + English. If a parent is asking, be respectful and address their concerns about results and safety. Always mention the free demo class as a low-commitment next step.

IMPORTANT: When you have collected the student's name, phone, email, and city, include a JSON block at the end of your message in this exact format (on a new line):
LEAD_DATA:{"name":"...","phone":"...","email":"...","city":"...","courseInterested":"...","currentClass":"..."}`;

// Helper: send email
async function sendEmail(to, subject, html) {
  try {
    await transporter.sendMail({
      from: `"GrowthPath Academy" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error('Email error:', err.message);
    return false;
  }
}

// Helper: lead email HTML
function buildLeadEmail(data, source) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1a0a2e, #7c3aed); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: #d4a843; margin: 0; font-size: 24px;">GrowthPath Academy</h1>
        <p style="color: #fff; margin: 5px 0 0 0;">New Student Lead — ${source}</p>
      </div>
      <div style="background: #fff; padding: 25px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
        <h2 style="color: #1a0a2e; border-bottom: 2px solid #7c3aed; padding-bottom: 10px;">Lead Details</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; font-weight: bold; color: #555; width: 40%;">Name</td><td style="padding: 8px; color: #1a0a2e;">${data.name || 'N/A'}</td></tr>
          <tr style="background: #f5f5f5;"><td style="padding: 8px; font-weight: bold; color: #555;">Email</td><td style="padding: 8px; color: #1a0a2e;">${data.email || 'N/A'}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; color: #555;">Phone</td><td style="padding: 8px; color: #1a0a2e;">${data.phone || 'N/A'}</td></tr>
          <tr style="background: #f5f5f5;"><td style="padding: 8px; font-weight: bold; color: #555;">City</td><td style="padding: 8px; color: #1a0a2e;">${data.city || 'N/A'}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; color: #555;">Course Interested</td><td style="padding: 8px;"><span style="background: #7c3aed; color: #fff; padding: 3px 10px; border-radius: 20px; font-size: 13px;">${data.courseInterested || 'N/A'}</span></td></tr>
          <tr style="background: #f5f5f5;"><td style="padding: 8px; font-weight: bold; color: #555;">Current Class</td><td style="padding: 8px; color: #1a0a2e;">${data.currentClass || 'N/A'}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; color: #555;">Source</td><td style="padding: 8px; color: #1a0a2e;">${source}</td></tr>
          <tr style="background: #f5f5f5;"><td style="padding: 8px; font-weight: bold; color: #555;">Timestamp</td><td style="padding: 8px; color: #1a0a2e;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td></tr>
        </table>
        <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-left: 4px solid #d4a843; border-radius: 4px;">
          <strong style="color: #1a0a2e;">Action Required:</strong> Call this student within 1 hour to schedule a free demo class!
        </div>
      </div>
    </div>
  `;
}

// Helper: contact email HTML
function buildContactEmail(data) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1a0a2e, #7c3aed); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: #d4a843; margin: 0; font-size: 24px;">GrowthPath Academy</h1>
        <p style="color: #fff; margin: 5px 0 0 0;">New Contact Form Submission</p>
      </div>
      <div style="background: #fff; padding: 25px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
        <h2 style="color: #1a0a2e; border-bottom: 2px solid #7c3aed; padding-bottom: 10px;">Contact Details</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; font-weight: bold; color: #555; width: 40%;">Name</td><td style="padding: 8px; color: #1a0a2e;">${data.name || 'N/A'}</td></tr>
          <tr style="background: #f5f5f5;"><td style="padding: 8px; font-weight: bold; color: #555;">Email</td><td style="padding: 8px; color: #1a0a2e;">${data.email || 'N/A'}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; color: #555;">Phone</td><td style="padding: 8px; color: #1a0a2e;">${data.phone || 'N/A'}</td></tr>
          <tr style="background: #f5f5f5;"><td style="padding: 8px; font-weight: bold; color: #555;">Course Interested</td><td style="padding: 8px;"><span style="background: #7c3aed; color: #fff; padding: 3px 10px; border-radius: 20px; font-size: 13px;">${data.courseInterested || 'N/A'}</span></td></tr>
          <tr><td style="padding: 8px; font-weight: bold; color: #555;">Current Class</td><td style="padding: 8px; color: #1a0a2e;">${data.currentClass || 'N/A'}</td></tr>
          <tr style="background: #f5f5f5;"><td style="padding: 8px; font-weight: bold; color: #555;">City</td><td style="padding: 8px; color: #1a0a2e;">${data.city || 'N/A'}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; color: #555;">Timestamp</td><td style="padding: 8px; color: #1a0a2e;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td></tr>
        </table>
        <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-left: 4px solid #d4a843; border-radius: 4px;">
          <strong style="color: #1a0a2e;">Action Required:</strong> Follow up with this inquiry within 2 hours!
        </div>
      </div>
    </div>
  `;
}

// Helper: download lead email HTML
function buildDownloadEmail(data) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1a0a2e, #7c3aed); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: #d4a843; margin: 0; font-size: 24px;">GrowthPath Academy</h1>
        <p style="color: #fff; margin: 5px 0 0 0;">Study Planner Download Lead</p>
      </div>
      <div style="background: #fff; padding: 25px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
        <h2 style="color: #1a0a2e; border-bottom: 2px solid #7c3aed; padding-bottom: 10px;">Download Lead Details</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; font-weight: bold; color: #555; width: 40%;">Name</td><td style="padding: 8px; color: #1a0a2e;">${data.name || 'N/A'}</td></tr>
          <tr style="background: #f5f5f5;"><td style="padding: 8px; font-weight: bold; color: #555;">Email</td><td style="padding: 8px; color: #1a0a2e;">${data.email || 'N/A'}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; color: #555;">Course Interest</td><td style="padding: 8px;"><span style="background: #7c3aed; color: #fff; padding: 3px 10px; border-radius: 20px; font-size: 13px;">${data.course || 'N/A'}</span></td></tr>
          <tr style="background: #f5f5f5;"><td style="padding: 8px; font-weight: bold; color: #555;">Timestamp</td><td style="padding: 8px; color: #1a0a2e;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td></tr>
        </table>
        <div style="margin-top: 20px; padding: 15px; background: #e8f5e9; border-left: 4px solid #4caf50; border-radius: 4px;">
          <strong style="color: #1a0a2e;">Note:</strong> This student downloaded the free study planner. Warm lead — follow up!
        </div>
      </div>
    </div>
  `;
}

// ─── API Routes ───────────────────────────────────────────────────────────────

// POST /api/chat — AI chatbot
app.post('/api/chat', chatLimiter, async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: messages,
    });

    const assistantMessage = response.content[0].text;

    // Check if lead data is embedded in response
    let leadData = null;
    const leadMatch = assistantMessage.match(/LEAD_DATA:(\{.*?\})/);
    if (leadMatch) {
      try {
        leadData = JSON.parse(leadMatch[1]);
      } catch (e) {
        // ignore parse error
      }
    }

    // Clean message for display (remove the LEAD_DATA line)
    const cleanMessage = assistantMessage.replace(/\nLEAD_DATA:.*$/, '').trim();

    // If lead data found, save it
    if (leadData && leadData.email && leadData.phone) {
      // Send lead email (fire and forget)
      sendEmail(
        'homechoudhuryapex@gmail.com',
        `🎯 New Chatbot Lead: ${leadData.name} — ${leadData.courseInterested}`,
        buildLeadEmail(leadData, 'Chatbot')
      );
    }

    res.json({
      message: cleanMessage,
      leadCaptured: !!leadData,
    });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: 'Chat service unavailable. Please try again.' });
  }
});

// POST /api/lead — lead capture (chatbot)
app.post('/api/lead', leadLimiter, async (req, res) => {
  try {
    const { name, email, phone, city, courseInterested, currentClass, source } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }

    await sendEmail(
      'homechoudhuryapex@gmail.com',
      `🎯 New Lead: ${name} — ${courseInterested || 'General Inquiry'}`,
      buildLeadEmail({ name, email, phone, city, courseInterested, currentClass }, source || 'Website')
    );

    res.json({ success: true, message: 'Lead captured successfully.' });
  } catch (err) {
    console.error('Lead error:', err.message);
    res.status(500).json({ error: 'Failed to save lead. Please try again.' });
  }
});

// POST /api/contact — contact form
app.post('/api/contact', leadLimiter, async (req, res) => {
  try {
    const { name, email, phone, courseInterested, currentClass, city } = req.body;
    if (!name || !email || !phone) {
      return res.status(400).json({ error: 'Name, email, and phone are required.' });
    }

    await sendEmail(
      'homechoudhuryapex@gmail.com',
      `📬 Contact Form: ${name} — ${courseInterested || 'General Inquiry'}`,
      buildContactEmail({ name, email, phone, courseInterested, currentClass, city })
    );

    res.json({ success: true, message: 'Your inquiry has been received! We will contact you shortly.' });
  } catch (err) {
    console.error('Contact error:', err.message);
    res.status(500).json({ error: 'Failed to submit form. Please try again.' });
  }
});

// POST /api/download-lead — study planner download
app.post('/api/download-lead', leadLimiter, async (req, res) => {
  try {
    const { name, email, course } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }

    await sendEmail(
      'homechoudhuryapex@gmail.com',
      `📥 Download Lead: ${name} — ${course || 'General'}`,
      buildDownloadEmail({ name, email, course })
    );

    res.json({ success: true, message: 'Check your email for the download link!' });
  } catch (err) {
    console.error('Download lead error:', err.message);
    res.status(500).json({ error: 'Failed to process request. Please try again.' });
  }
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ GrowthPath Academy server running on port ${PORT}`);
  console.log(`🌐 Open: http://localhost:${PORT}`);
});
