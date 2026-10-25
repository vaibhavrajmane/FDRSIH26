import React from 'react';
import {
  ShieldCheck,
  Building2,
  AlertTriangle,
  FileCheck2,
  Eye,
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  FileWarning,
} from 'lucide-react';
import { InstrumentStatus, VerificationLevel } from '../types';
import { maskSensitiveNumber } from '../utils/rules';
import { usePortal } from '../context/PortalContext';

/**
 * Core Principle Component: Explicitly distinguishes "Institution-Submitted" vs "Bank-Confirmed" vs "Verified (Manual Only)" vs "Discrepancy-Flagged"
 */
export const VerificationProvenanceBadge: React.FC<{
  level: VerificationLevel;
  compact?: boolean;
  docVersion?: number;
}> = ({ level, compact, docVersion = 1 }) => {
  if (level === 'Bank-Confirmed') {
    return (
      <span
        title={`Prototype Sandbox Adapter Match (v${docVersion}.0) — Simulated CBS response; requires production bank mTLS connector for live custody attestation`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap shrink-0"
      >
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span>
          {compact
            ? 'Bank-Confirmed (Sim CBS)'
            : `Bank-Confirmed (Simulated CBS · v${docVersion}.0)`}
        </span>
      </span>
    );
  }

  if (level === 'Manual-Verified') {
    return (
      <span
        title={`Physical Bank Letter Inspected by Scrutiny Officer (v${docVersion}.0) — Co-operative/Regional Bank without automated CBS API`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 whitespace-nowrap shrink-0"
      >
        <FileCheck2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
        <span>
          {compact
            ? 'Verified (Manual Letter)'
            : `Verified (Officer Manual Letter · v${docVersion}.0)`}
        </span>
      </span>
    );
  }

  if (level === 'Discrepancy-Flagged') {
    return (
      <span
        title="Material conflict detected between Institution-Declared, AI-Extracted, or Simulated Bank CBS values"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-400 whitespace-nowrap shrink-0"
      >
        <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
        <span>Discrepancy-Flagged</span>
      </span>
    );
  }

  return (
    <span
      title="Self-declared by Institution Nodal Officer — Not yet independently verified against Bank CBS or physical bank confirmation"
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-400 whitespace-nowrap shrink-0"
    >
      <Building2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
      <span>{compact ? 'Institution-Submitted' : 'Institution-Submitted (Unverified)'}</span>
    </span>
  );
};

export const StatusLabel: React.FC<{ status: InstrumentStatus }> = ({ status }) => {
  const getStyles = () => {
    switch (status) {
      case 'Active':
      case 'Verified (Bank-Confirmed)':
      case 'Renewed':
      case 'Approved for Release':
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />,
          textClass: 'text-emerald-800 dark:text-emerald-300 font-medium',
        };
      case 'Verified (Manual Only)':
      case 'Released/Refunded':
      case 'Replaced':
      case 'Closed':
        return {
          icon: <FileCheck2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />,
          textClass: 'text-blue-800 dark:text-blue-300 font-medium',
        };
      case 'Expiring Soon':
      case 'Under Scrutiny':
      case 'Submitted':
      case 'Resubmitted':
      case 'Release Requested':
      case 'Release Under Review':
      case 'Renewal Pending':
        return {
          icon: <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />,
          textClass: 'text-amber-800 dark:text-amber-300 font-medium',
        };
      case 'Matured/Expired':
      case 'Query Raised':
      case 'Rejected':
      case 'Forfeited':
        return {
          icon: <XCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />,
          textClass: 'text-red-700 dark:text-red-300 font-semibold',
        };
      default:
        return {
          icon: <FileWarning className="w-3.5 h-3.5 text-slate-500 shrink-0" />,
          textClass: 'text-slate-700 dark:text-slate-300',
        };
    }
  };

  const { icon, textClass } = getStyles();
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs whitespace-nowrap shrink-0 ${textClass}`}>
      {icon}
      <span>{status}</span>
    </span>
  );
};

/**
 * Masked Sensitive Field with Audit-Logged "Reveal" button
 */
export const MaskedField: React.FC<{
  entityId: string;
  fieldName: string;
  value: string;
}> = ({ entityId, fieldName, value }) => {
  const { revealedFields, revealSensitiveField } = usePortal();
  const isRevealed = Boolean(revealedFields[`${entityId}:${fieldName}`]);

  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-xs tabular-nums">
      <span>{isRevealed ? value : maskSensitiveNumber(value)}</span>
      {!isRevealed && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            revealSensitiveField(entityId, fieldName);
          }}
          title={`Reveal ${fieldName} (Logged in Audit Trail)`}
          aria-label={`Reveal ${fieldName} for ${entityId}`}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-sans font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 rounded border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Eye className="w-3 h-3" />
          <span>Reveal</span>
        </button>
      )}
    </span>
  );
};

/**
 * Mandatory AI Disclosure Label required by Section 6
 */
export const AiAssistanceBanner: React.FC<{
  notice?: string;
  compact?: boolean;
}> = ({ notice, compact }) => {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-md bg-indigo-50/90 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200">
      <div className="flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
        <span className="font-semibold">AI-assisted — requires officer confirmation</span>
        {!compact && notice && (
          <>
            <span aria-hidden="true">·</span>
            <span className="text-indigo-700 dark:text-indigo-300">{notice}</span>
          </>
        )}
      </div>
      <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 whitespace-nowrap shrink-0">
        Logged in Audit Trail
      </span>
    </div>
  );
};

/**
 * Deterministic SVG QR Code generator for printable Acknowledgement Receipts & Release Orders
 */
export const DeterministicQrCode: React.FC<{ value: string; size?: number }> = ({
  value,
  size = 84,
}) => {
  const cells = 11;
  const grid: boolean[][] = [];
  for (let r = 0; r < cells; r++) {
    grid[r] = [];
    for (let c = 0; c < cells; c++) {
      // Finder patterns in 3 corners
      const isCorner =
        (r < 3 && c < 3) || (r < 3 && c >= cells - 3) || (r >= cells - 3 && c < 3);
      if (isCorner) {
        grid[r][c] = true;
      } else {
        const charCode = value.charCodeAt((r * cells + c) % value.length) || 65;
        grid[r][c] = (charCode + r * 7 + c * 13) % 2 === 0;
      }
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${cells} ${cells}`}
      className="border border-slate-300 p-1 bg-white rounded"
      role="img"
      aria-label={`Verification QR Code for ${value}`}
    >
      {grid.map((row, rIdx) =>
        row.map((filled, cIdx) =>
          filled ? (
            <rect key={`${rIdx}-${cIdx}`} x={cIdx} y={rIdx} width={1} height={1} fill="#0f172a" />
          ) : null
        )
      )}
    </svg>
  );
};
