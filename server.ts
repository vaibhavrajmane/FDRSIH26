import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const MODEL_NAME = 'gemini-flash-latest';

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));

  // 1. Document Intelligence: Extract FDR fields via Gemini Multimodal
  app.post('/api/ai/extract-document', async (req, res) => {
    const { fileName, base64Data, mimeType, presetScenario } = req.body || {};
    const ai = getAiClient();

    if (!ai) {
      return res.status(200).json({
        fallback: true,
        notice: 'Gemini API key not configured or unavailable — using deterministic Document Intelligence extraction fallback.',
        data: null,
      });
    }

    try {
      const parts: any[] = [];
      if (base64Data && mimeType && (mimeType.startsWith('image/') || mimeType === 'application/pdf')) {
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType,
          },
        });
      }
      parts.push({
        text: `Extract Fixed Deposit Receipt (FDR) / Bank Guarantee details from this document (${fileName || 'uploaded document'}, scenario context: ${presetScenario || 'standard AICTE security deposit'}). Return accurate fields and per-field confidence scores (0-100).`,
      });

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: { parts },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              issuingBank: { type: Type.STRING },
              branch: { type: Type.STRING },
              ifsc: { type: Type.STRING },
              fdrNumber: { type: Type.STRING },
              accountHolderName: { type: Type.STRING },
              depositAmount: { type: Type.NUMBER },
              issueDate: { type: Type.STRING, description: 'YYYY-MM-DD' },
              maturityDate: { type: Type.STRING, description: 'YYYY-MM-DD' },
              interestRate: { type: Type.NUMBER },
              lienText: { type: Type.STRING },
              lienMarkedInFavourOfAICTE: { type: Type.BOOLEAN },
              signaturesPresent: { type: Type.BOOLEAN },
              stampPresent: { type: Type.BOOLEAN },
              confidences: {
                type: Type.OBJECT,
                properties: {
                  issuingBank: { type: Type.NUMBER },
                  branch: { type: Type.NUMBER },
                  ifsc: { type: Type.NUMBER },
                  fdrNumber: { type: Type.NUMBER },
                  accountHolderName: { type: Type.NUMBER },
                  depositAmount: { type: Type.NUMBER },
                  issueDate: { type: Type.NUMBER },
                  maturityDate: { type: Type.NUMBER },
                  interestRate: { type: Type.NUMBER },
                  lienText: { type: Type.NUMBER },
                },
              },
            },
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      return res.json({ fallback: false, data: parsed });
    } catch (error: any) {
      return res.status(200).json({
        fallback: true,
        notice: `Gemini live call fallback triggered (${error?.message || 'API error'}) — using rule-based extraction.`,
        data: null,
      });
    }
  });

  // 2. Ask the Portal: Natural Language Query -> Structured Filter JSON
  app.post('/api/ai/ask-portal', async (req, res) => {
    const { query, availableStates, availableBanks } = req.body || {};
    const ai = getAiClient();

    if (!ai) {
      return res.status(200).json({
        fallback: true,
        notice: 'Using deterministic NL-to-Filter parser (Gemini API key not configured).',
        filter: null,
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Translate this AICTE officer natural-language query into a structured JSON filter object.
Query: "${query}"
Available states: ${(availableStates || []).join(', ')}
Available banks: ${(availableBanks || []).join(', ')}
Statuses: Draft, Submitted, Under Scrutiny, Query Raised, Resubmitted, Verified (Bank-Confirmed), Verified (Manual Only), Rejected, Active, Expiring Soon, Matured/Expired, Renewal Pending, Renewed, Release Requested, Release Under Review, Approved for Release, Released/Refunded, Closed, Forfeited, Replaced.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              state: { type: Type.STRING },
              bank: { type: Type.STRING },
              status: { type: Type.STRING },
              minAmount: { type: Type.NUMBER, description: 'Minimum deposit amount in INR (1 Lakh = 100000, 50 Lakh = 5000000)' },
              maxAmount: { type: Type.NUMBER },
              maturingWithinDays: { type: Type.NUMBER, description: 'Instruments maturing within N days from current date' },
              lapsedOnly: { type: Type.BOOLEAN, description: 'True if user asks for lapsed coverage or expired instruments' },
              hasDiscrepancy: { type: Type.BOOLEAN, description: 'True if user asks for discrepancies or mismatches' },
              minRiskScore: { type: Type.NUMBER },
              explanation: { type: Type.STRING, description: 'Concise 1-sentence summary of the filter applied' },
            },
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      return res.json({ fallback: false, filter: parsed });
    } catch (error: any) {
      return res.status(200).json({
        fallback: true,
        notice: `Live Gemini query translation fallback (${error?.message || 'error'}) — executed rule-based parser.`,
        filter: null,
      });
    }
  });

  // 3. Smart Drafting: Observation letters, Bilingual Reminders, Release Orders
  app.post('/api/ai/smart-draft', async (req, res) => {
    const { draftType, contextData } = req.body || {};
    const ai = getAiClient();

    if (!ai) {
      return res.status(200).json({
        fallback: true,
        notice: 'Generated via AICTE standard statutory template engine (AI fallback).',
        draft: null,
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `You are an official drafting assistant for the AICTE Regulation Bureau (Ministry of Education, Government of India).
Draft Type: ${draftType} (one of: scrutiny_observation, bilingual_reminder, release_order).
Case Context JSON: ${JSON.stringify(contextData)}
Write a formal, precise government communication with reference numbers, exact INR amounts, and clear compliance instructions. Include both English and Hindi sections if draftType is bilingual_reminder.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              subject: { type: Type.STRING },
              bodyEnglish: { type: Type.STRING },
              bodyHindi: { type: Type.STRING },
              recommendedSeverity: { type: Type.STRING },
            },
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      return res.json({ fallback: false, draft: parsed });
    } catch (error: any) {
      return res.status(200).json({
        fallback: true,
        notice: `Gemini drafting fallback (${error?.message || 'API error'}) — using statutory template.`,
        draft: null,
      });
    }
  });

  // 4. Maturity Forecasting Summary
  app.post('/api/ai/forecast-summary', async (req, res) => {
    const { stats } = req.body || {};
    const ai = getAiClient();

    if (!ai) {
      return res.status(200).json({
        fallback: true,
        summary: null,
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Generate a concise 3-sentence weekly executive briefing for the AICTE Regulation Bureau officer based on these security deposit portfolio statistics: ${JSON.stringify(stats)}. Highlight immediate maturity risks, bank verification backlog, and recommended priority actions.`,
      });
      return res.json({ fallback: false, summary: response.text });
    } catch {
      return res.status(200).json({ fallback: true, summary: null });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FDR-Setu Server running on http://localhost:${PORT}`);
  });
}

startServer();
