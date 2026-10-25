export type Language = 'en' | 'hi';

export const TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {
    govTitle: 'Government of India · Ministry of Education',
    bureauTitle: 'All India Council for Technical Education (AICTE) — Regulation Bureau',
    appTitle: 'FDR-Setu',
    appSubtitle: 'National Security Deposit & Fixed Deposit Receipt Lifecycle Portal',
    navDashboard: 'Command Centre',
    navScrutiny: 'Scrutiny Workspace',
    navInstitution: 'Institution Portal',
    navRenewals: 'Renewal & Continuity',
    navReleases: 'Release & Refund',
    navAlerts: 'Monitoring & Alerts',
    navBankSim: 'Bank Adapter & CBS',
    navReports: 'Reports Centre',
    navAdmin: 'Admin & Audit Chain',
    navArchitecture: 'Architecture & GIGW',
    askPortal: 'Ask the Portal (AI)',
    demoTour: 'Guided Demo Tour',
    resetDemo: 'Reset Demo Data',
    simulateTime: 'Simulate Time',
    logout: 'Sign Out',
    switchRole: 'Active Role',
    institutionSubmitted: 'Institution-Submitted',
    bankConfirmed: 'Bank-Confirmed',
    manualVerified: 'Verified (Manual Only)',
    discrepancyFlagged: 'Discrepancy-Flagged',
    searchPlaceholder: 'Search Institution, AICTE ID (1-...), or FDR No...',
  },
  hi: {
    govTitle: 'भारत सरकार · शिक्षा मंत्रालय',
    bureauTitle: 'अखिल भारतीय तकनीकी शिक्षा परिषद (AICTE) — विनियमन ब्यूरो',
    appTitle: 'एफडीआर-सेतु (FDR-Setu)',
    appSubtitle: 'राष्ट्रीय सुरक्षा जमा एवं सावधि जमा रसीद (FDR) प्रबंधन पोर्टल',
    navDashboard: 'कमांड सेंटर डैशबोर्ड',
    navScrutiny: 'स्क्रूटनी कार्यक्षेत्र',
    navInstitution: 'संस्थान पोर्टल',
    navRenewals: 'नवीनीकरण और निरंतरता',
    navReleases: 'रिलीज़ एवं रिफंड',
    navAlerts: 'निगरानी एवं अलर्ट',
    navBankSim: 'बैंक एडाप्टर एवं CBS',
    navReports: 'रिपोर्ट केंद्र',
    navAdmin: 'प्रशासन और ऑडिट चेन',
    navArchitecture: 'आर्किटेक्चर एवं GIGW',
    askPortal: 'पोर्टल से पूछें (AI)',
    demoTour: 'निर्देशित डेमो टूर',
    resetDemo: 'डेमो डेटा रीसेट करें',
    simulateTime: 'समय सिमुलेशन',
    logout: 'लॉग आउट',
    switchRole: 'सक्रिय भूमिका',
    institutionSubmitted: 'संस्थान द्वारा प्रस्तुत',
    bankConfirmed: 'बैंक द्वारा सत्यापित',
    manualVerified: 'मैनुअल सत्यापित',
    discrepancyFlagged: 'विसंगति चिह्नित',
    searchPlaceholder: 'संस्थान, AICTE आईडी या FDR संख्या खोजें...',
  },
};

export async function computeBrowserSha256(input: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback deterministic hex
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(64, 'a');
}

export function exportRowsToCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h] === null || row[h] === undefined ? '' : String(row[h]);
          return `"${val.replace(/"/g, '""')}"`;
        })
        .join(',')
    ),
  ];
  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
