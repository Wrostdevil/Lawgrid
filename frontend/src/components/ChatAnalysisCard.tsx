'use client';

import React, { useMemo, useState } from 'react';
import NextLink from 'next/link';

type AnalysisMetadata = {
  summary?: string;
  standing?: string;
  actionPlan?: any;
  legalMapping?: any;
  generatedDocuments?: any;
  reasoningTrace?: any;
  incidentType?: string;
  structuredFacts?: any;
};

type ChatAnalysisCardProps = {
  itemId: string;
  metadata: AnalysisMetadata;
  backendUrl: string;
  expanded?: boolean;
  onToggleExpanded?: () => void;
  onDownloadSync?: () => void;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function standingToScore(standing: string): number {
  switch (standing) {
    case 'strong': return 5;
    case 'moderate': return 3;
    case 'weak':
    default: return 2;
  }
}

function standingMessage(standing: string): string {
  switch (standing) {
    case 'strong': return 'You have a solid case';
    case 'moderate': return 'Good foundation — a few more details will strengthen your case';
    case 'weak':
    default: return 'We need more details to give you the best advice';
  }
}

function friendlyDocName(key: string): string {
  const map: Record<string, string> = {
    legal_notice: 'Reply Letter',
    consumer_complaint: 'Consumer Forum Complaint',
    fir_draft: 'Police Complaint Draft',
    rti_application: 'RTI Application',
    affidavit: 'Sworn Statement',
    corruption_complaint: 'Anti-Corruption Complaint',
    lawyer_brief: 'Case Summary for Lawyer',
  };
  return map[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function friendlyPriority(priority: string): string {
  switch (priority.toLowerCase()) {
    case 'high': return 'Urgent';
    case 'medium': return 'Important';
    case 'low': return 'Optional';
    default: return priority;
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export function ChatAnalysisCard({
  itemId,
  metadata,
  backendUrl,
  expanded,
  onToggleExpanded,
  onDownloadSync,
}: ChatAnalysisCardProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const [isScoringExpanded, setIsScoringExpanded] = useState(false);

  const isExpanded = expanded ?? internalExpanded;
  const toggleExpanded = onToggleExpanded ?? (() => setInternalExpanded((prev) => !prev));

  const standing = (metadata.standing || 'weak').toLowerCase();
  const score = standingToScore(standing);

  // ── Normalize action plan ──────────────────────────────────────────────────

  const normalizedActionPlan = useMemo(() => {
    const actionPlan = metadata.actionPlan || {};
    const immediate = actionPlan.immediate || actionPlan.immediate_actions || [];
    const mediumTerm = actionPlan.medium_term || actionPlan.medium_term_actions || [];

    const normalizeStep = (step: any) => {
      if (typeof step === 'string') {
        return { step, description: '', plain_description: '', priority: 'medium', deadline: '' };
      }
      return {
        step: step?.step || step?.action || 'Untitled step',
        description: step?.description || '',
        plain_description: step?.plain_description || step?.description || '',
        priority: (step?.priority || 'medium').toLowerCase(),
        deadline: step?.deadline || '',
      };
    };

    return {
      ...actionPlan,
      immediate: immediate.map(normalizeStep),
      medium_term: mediumTerm.map(normalizeStep),
      forum_selection: actionPlan.forum_selection || 'N/A',
      forum_selection_reason: actionPlan.forum_selection_reason || '',
      timeline_estimate: actionPlan.timeline_estimate || 'N/A',
      cost_estimate: actionPlan.cost_estimate || 'N/A',
      lawyer_recommended: !!actionPlan.lawyer_recommended,
      evidence_checklist: actionPlan.evidence_checklist || [],
      avoid_list: actionPlan.avoid_list || [],
      plain_law_explanations: actionPlan.plain_law_explanations || [],
    };
  }, [metadata.actionPlan]);

  // ── Normalize legal sections ───────────────────────────────────────────────

  const normalizedLegalSections = useMemo(() => {
    const sections = metadata.legalMapping?.applicable_sections || [];
    return sections.map((section: any) => ({
      section_ref: section?.section_ref || section?.section || 'Section',
      confidence: (section?.confidence || 'medium').toLowerCase(),
      description: section?.description || section?.text || '',
    }));
  }, [metadata.legalMapping]);

  // ── Missing info from Agent 1 ──────────────────────────────────────────────

  const missingInfo: string[] = useMemo(() => {
    // Agent 1 writes missing_information onto structured_facts. Older cached
    // payloads nested it under legal_mapping, so keep that as a fallback.
    const fromFacts =
      metadata.structuredFacts?.missing_information ||
      metadata.legalMapping?.structured_facts?.missing_information ||
      metadata.legalMapping?.missing_information ||
      [];
    return fromFacts;
  }, [metadata.structuredFacts, metadata.legalMapping]);

  // ── Has documents? ─────────────────────────────────────────────────────────

  const hasDocuments = useMemo(() => {
    if (!metadata.generatedDocuments) return false;
    return Object.values(metadata.generatedDocuments).some(
      (doc: any) => doc && doc.content_md && !doc.content_md.startsWith('Document generation failed')
    );
  }, [metadata.generatedDocuments]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mt-6 p-5 rounded-xl bg-gradient-to-br from-[#997953]/10 to-transparent dark:from-[#cdaa80]/10 dark:to-transparent border border-[#997953]/20 dark:border-[#cdaa80]/20 shadow-inner">
      
      {/* ─── A. Header: Case Strength Meter & Logic ─────────────────────── */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <span className="text-[11px] uppercase tracking-[2px] font-bold text-[#997953] dark:text-[#cdaa80]">Your Case Analysis</span>
          {/* Scoring Factors Grid */}
          {metadata.reasoningTrace?.scoring_factors && (
            <div className="flex gap-2 mt-2">
              <div className="flex flex-col items-center p-1.5 px-2 rounded bg-white/40 dark:bg-white/5 border border-white/20">
                <span className="text-[8px] uppercase tracking-tighter text-gray-400 dark:text-white/30">Details</span>
                <span className={`text-[10px] font-bold ${
                  metadata.reasoningTrace.scoring_factors.details === 'High' ? 'text-green-500' : 
                  metadata.reasoningTrace.scoring_factors.details === 'Medium' ? 'text-yellow-500' : 'text-orange-400'
                }`}>
                  {metadata.reasoningTrace.scoring_factors.details}
                </span>
              </div>
              <div className="flex flex-col items-center p-1.5 px-2 rounded bg-white/40 dark:bg-white/5 border border-white/20">
                <span className="text-[8px] uppercase tracking-tighter text-gray-400 dark:text-white/30">Evidence</span>
                <span className={`text-[10px] font-bold ${
                  metadata.reasoningTrace.scoring_factors.evidence === 'Complete' ? 'text-green-500' : 
                  metadata.reasoningTrace.scoring_factors.evidence === 'Partial' ? 'text-yellow-500' : 'text-orange-400'
                }`}>
                  {metadata.reasoningTrace.scoring_factors.evidence}
                </span>
              </div>
              <div className="flex flex-col items-center p-1.5 px-2 rounded bg-white/40 dark:bg-white/5 border border-white/20">
                <span className="text-[8px] uppercase tracking-tighter text-gray-400 dark:text-white/30">Laws</span>
                <span className={`text-[10px] font-bold ${
                  metadata.reasoningTrace.scoring_factors.law === 'High' ? 'text-green-500' : 
                  metadata.reasoningTrace.scoring_factors.law === 'Moderate' ? 'text-yellow-500' : 'text-orange-400'
                }`}>
                  {metadata.reasoningTrace.scoring_factors.law}
                </span>
              </div>
            </div>
          )}
        </div>
        
<div className="flex flex-col items-end gap-1">
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((dot) => (
              <div
                key={dot}
                className={`w-3 h-3 rounded-full transition-colors ${
                  dot <= score
                    ? standing === 'strong'
                      ? 'bg-green-500'
                      : standing === 'moderate'
                        ? 'bg-yellow-500'
                        : 'bg-orange-400'
                    : 'bg-gray-300 dark:bg-white/10'
                }`}
              />
            ))}
          </div>
          <span className="text-[10px] text-gray-500 dark:text-white/40 font-medium">
            Case Strength: {score}/5
          </span>
          {/* Basis Explanation - Unified Premium Toggle */}
          <div className="flex flex-col items-end gap-1 mt-1 transition-all">
            <button
              onClick={() => setIsScoringExpanded(!isScoringExpanded)}
              className="text-[9px] text-[#997953] dark:text-[#cdaa80] hover:underline text-right list-none font-medium flex items-center gap-1 group"
            >
              What does this mean?
              <svg
                className={`w-2.5 h-2.5 transition-transform duration-300 ${isScoringExpanded ? 'rotate-90' : 'group-hover:translate-x-0.5'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            {isScoringExpanded && (
              <div className="animate-message absolute right-0 mt-6 z-20 p-3 rounded-lg bg-white dark:bg-[#1a2f4a] border border-[#997953]/30 shadow-xl w-52 text-[11px] leading-relaxed text-gray-600 dark:text-white/70 overflow-hidden">
                <p className="mb-2 font-bold text-[#997953] dark:text-[#cdaa80] text-[12px]">Our Scoring Criteria</p>
                <div className="space-y-1.5">
                  <div className="flex gap-2">
                    <span className="text-orange-400 font-bold shrink-0">1-2:</span>
                    <span>Basic legal grounds, but crucial documents or facts are missing.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-yellow-500 font-bold shrink-0">3:</span>
                    <span>Solid case, but could be challenged without specific proofs.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-green-500 font-bold shrink-0">4-5:</span>
                    <span>Strong evidence found with clear legal violation.</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Case Summary */}
        <div>
          <h4 className="text-[13px] font-semibold text-gray-500 dark:text-white/40 mb-1">What We Understand</h4>
          <p className="text-[14px] text-gray-700 dark:text-white/80 leading-relaxed italic line-clamp-3">
            &quot;{metadata.summary || 'No summary available'}&quot;
          </p>
        </div>

        {/* Strength message */}
        <p className="text-[13px] text-gray-600 dark:text-white/60 leading-relaxed flex items-start gap-2">
          <span className="shrink-0 mt-0.5">
            {standing === 'strong' ? '✅' : standing === 'moderate' ? '💡' : 'ℹ️'}
          </span>
          {standingMessage(standing)}
        </p>

        {/* ─── B. What We Still Need (weak/moderate only) ───────────────── */}
        {standing !== 'strong' && missingInfo.length > 0 && (
          <div className="p-4 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-400/10">
            <h4 className="text-[12px] uppercase tracking-[1.5px] font-bold text-blue-700 dark:text-blue-400 mb-2">
              📋 To Strengthen Your Case, Please Share
            </h4>
            <ul className="space-y-1.5">
              {missingInfo.map((item: string, i: number) => (
                <li key={`${itemId}-missing-${i}`} className="text-[13px] text-gray-700 dark:text-white/70 flex items-start gap-2">
                  <span className="text-blue-500 dark:text-blue-400 shrink-0 mt-0.5">☐</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Expand/Collapse */}
        <div className="pt-2">
          <button
            onClick={toggleExpanded}
            className="text-[13px] font-medium text-[#997953] dark:text-[#cdaa80] hover:underline underline-offset-4 flex items-center gap-1 group cursor-pointer"
          >
            {isExpanded ? 'Collapse Details' : 'View Full Analysis'}
            <svg
              className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-90' : 'group-hover:translate-x-1'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>
        </div>

        {isExpanded && (
          <div className="mt-4 space-y-6 border-t border-[#997953]/10 dark:border-[#cdaa80]/10 pt-6 relative">
            
            {/* ─── C. Your Next Steps ──────────────────────────────────── */}
            {metadata.actionPlan && (
              <div className="animate-message" style={{ animationDelay: '100ms' }}>
                <h4 className="text-[12px] uppercase tracking-[1.5px] font-bold text-[#997953] dark:text-[#cdaa80] mb-3">Your Next Steps</h4>

                {normalizedActionPlan.immediate?.length > 0 && (
                  <div className="mb-4">
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-red-500 dark:text-red-400 mb-2 block">🔴 Do This First</span>
                    <div className="space-y-2">
                      {normalizedActionPlan.immediate.map((step: any, i: number) => (
                        <div key={`${itemId}-immediate-${i}`} className="p-3 rounded-lg bg-white/50 dark:bg-[#0f1e3f]/50 border border-gray-200/50 dark:border-white/5">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[14px] font-medium text-gray-800 dark:text-white">{step.step}</span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 font-bold uppercase ${
                                step.priority === 'high'
                                  ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                                  : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                              }`}
                            >
                              {friendlyPriority(step.priority)}
                            </span>
                          </div>
                          {/* Plain description (primary) */}
                          <p className="text-[13px] text-gray-700 dark:text-white/70 mt-1 leading-relaxed">
                            {step.plain_description}
                          </p>
                          <span className="text-[11px] text-gray-400 dark:text-white/30 mt-1 block">⏰ {step.deadline}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {normalizedActionPlan.medium_term?.length > 0 && (
                  <div className="mb-4">
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-blue-500 dark:text-blue-400 mb-2 block">📅 Do This Later</span>
                    <div className="space-y-2">
                      {normalizedActionPlan.medium_term.map((step: any, i: number) => (
                        <div key={`${itemId}-medium-${i}`} className="p-3 rounded-lg bg-white/50 dark:bg-[#0f1e3f]/50 border border-gray-200/50 dark:border-white/5">
                          <span className="text-[14px] font-medium text-gray-800 dark:text-white">{step.step}</span>
                          <p className="text-[13px] text-gray-700 dark:text-white/70 mt-1 leading-relaxed">
                            {step.plain_description}
                          </p>
                          <span className="text-[11px] text-gray-400 dark:text-white/30 mt-1 block">⏰ {step.deadline}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Info Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                  <div className="p-3 rounded-lg bg-white/30 dark:bg-[#0f1e3f]/30 border border-gray-200/30 dark:border-white/5 text-center">
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-white/30 block">Where To Go</span>
                    <span className="text-[12px] font-medium text-gray-800 dark:text-white mt-1 block">{normalizedActionPlan.forum_selection}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white/30 dark:bg-[#0f1e3f]/30 border border-gray-200/30 dark:border-white/5 text-center">
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-white/30 block">How Long</span>
                    <span className="text-[12px] font-medium text-gray-800 dark:text-white mt-1 block">{normalizedActionPlan.timeline_estimate}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white/30 dark:bg-[#0f1e3f]/30 border border-gray-200/30 dark:border-white/5 text-center">
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-white/30 block">Est. Cost</span>
                    <span className="text-[12px] font-medium text-gray-800 dark:text-white mt-1 block">{normalizedActionPlan.cost_estimate}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white/30 dark:bg-[#0f1e3f]/30 border border-gray-200/30 dark:border-white/5 text-center">
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-white/30 block">Lawyer</span>
                    <span className={`text-[12px] font-medium mt-1 block ${normalizedActionPlan.lawyer_recommended ? 'text-[#997953] dark:text-[#cdaa80]' : 'text-green-600 dark:text-green-400'}`}>
                      {normalizedActionPlan.lawyer_recommended ? 'Can help speed this up' : 'You can handle this yourself'}
                    </span>
                    {normalizedActionPlan.lawyer_recommended && (
                      <NextLink
                        href={`/citizen/market_place?type=${metadata?.incidentType || 'other'}`}
                        className="mt-2 text-[10px] font-semibold text-[#997953] dark:text-[#cdaa80] border border-[#997953]/30 dark:border-[#cdaa80]/30 px-2 py-1 rounded-md hover:bg-[#997953]/10 dark:hover:bg-[#cdaa80]/10 transition-colors inline-block"
                      >
                        Find a Lawyer
                      </NextLink>
                    )}
                  </div>
                </div>

                {/* ─── E. Documents You'll Need ───────────────────────────── */}
                {normalizedActionPlan.evidence_checklist?.length > 0 && (
                  <div className="mt-4">
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-gray-500 dark:text-white/40 mb-2 block">📎 Documents You&apos;ll Need</span>
                    <ul className="space-y-1">
                      {normalizedActionPlan.evidence_checklist.map((item: string, i: number) => (
                        <li key={`${itemId}-evidence-${i}`} className="text-[13px] text-gray-600 dark:text-white/60 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#cdaa80] shrink-0"></span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Avoid List */}
                {normalizedActionPlan.avoid_list?.length > 0 && (
                  <div className="mt-4">
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-red-500 dark:text-red-400 mb-2 block">⚠️ Things To Avoid</span>
                    <ul className="space-y-1">
                      {normalizedActionPlan.avoid_list.map((item: string, i: number) => (
                        <li key={`${itemId}-avoid-${i}`} className="text-[13px] text-gray-600 dark:text-white/60 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0"></span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* ─── D. Laws That Protect You ─────────────────────────────── */}
            {(normalizedActionPlan.plain_law_explanations?.length > 0 || normalizedLegalSections?.length > 0) && (
              <div className="animate-message" style={{ animationDelay: '200ms' }}>
                <h4 className="text-[12px] uppercase tracking-[1.5px] font-bold text-[#997953] dark:text-[#cdaa80] mb-3">🛡️ Laws That Protect You</h4>
                <div className="space-y-2">
                  {normalizedActionPlan.plain_law_explanations?.length > 0 ? (
                    // Use LLM-generated plain explanations
                    normalizedActionPlan.plain_law_explanations.map((law: any, i: number) => (
                      <div key={`${itemId}-law-${i}`} className="p-3 rounded-lg bg-white/50 dark:bg-[#0f1e3f]/50 border border-gray-200/50 dark:border-white/5">
                        <p className="text-[13px] text-gray-700 dark:text-white/80 leading-relaxed">
                          {law.what_it_means}
                        </p>
                        <span className="text-[11px] text-gray-400 dark:text-white/30 mt-1 block">
                          📜 {law.section_ref}
                        </span>
                      </div>
                    ))
                  ) : (
                    // Fallback to raw sections from Agent 2
                    normalizedLegalSections.map((section: any, i: number) => (
                      <div key={`${itemId}-legal-${i}`} className="p-3 rounded-lg bg-white/50 dark:bg-[#0f1e3f]/50 border border-gray-200/50 dark:border-white/5 mt-2">
                        <span className="text-[13px] font-medium text-gray-800 dark:text-white block mb-1">📜 {section.section_ref}</span>
                        <p className="text-[12px] text-gray-600 dark:text-white/50 leading-relaxed font-italic">
                          {section.description?.substring(0, 300)}{section.description?.length > 300 ? '...' : ''}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ─── F. Documents We've Prepared ─────────────────────────── */}
            {hasDocuments ? (
              <div className="animate-message" style={{ animationDelay: '300ms' }}>
                <h4 className="text-[12px] uppercase tracking-[1.5px] font-bold text-[#997953] dark:text-[#cdaa80] mb-3">📝 Documents We&apos;ve Prepared</h4>
                <div className="space-y-3">
                  {Object.entries(metadata.generatedDocuments).map(([key, doc]: [string, any]) => {
                    if (!doc || !doc.content_md || doc.content_md.startsWith('Document generation failed')) return null;
                    const pdfName = doc.pdf_url?.split(/[\\/]/).pop();
                    const docxName = doc.docx_url?.split(/[\\/]/).pop();

                    return (
                      <div key={`${itemId}-doc-${key}`} className="p-3 rounded-lg bg-white/50 dark:bg-[#0f1e3f]/50 border border-gray-200/50 dark:border-white/5 transition-all">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="text-[13px] font-medium text-gray-800 dark:text-white block">📄 {friendlyDocName(key)}</span>
                            <span className="text-[10px] text-gray-400 dark:text-white/30">AI-generated draft — review before using</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {pdfName && (
                              <a
                                href={`${backendUrl}/download/${pdfName}`}
                                download
                                onClick={() => onDownloadSync?.()}
                                className="text-[10px] px-2 py-1 rounded bg-[#997953]/10 dark:bg-[#cdaa80]/10 text-[#997953] dark:text-[#cdaa80] font-bold uppercase hover:bg-[#997953]/20 transition-colors"
                              >
                                PDF ↓
                              </a>
                            )}
                            {docxName && (
                              <a
                                href={`${backendUrl}/download/${docxName}`}
                                download
                                onClick={() => onDownloadSync?.()}
                                className="text-[10px] px-2 py-1 rounded bg-[#997953]/10 dark:bg-[#cdaa80]/10 text-[#997953] dark:text-[#cdaa80] font-bold uppercase hover:bg-[#997953]/20 transition-colors"
                              >
                                DOCX ↓
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-gray-50/50 dark:bg-white/5 border border-gray-200/30 dark:border-white/5">
                <p className="text-[13px] text-gray-500 dark:text-white/50 flex items-start gap-2">
                  <span className="shrink-0">📝</span>
                  We&apos;ll prepare your legal documents once we have enough details about your case.
                </p>
              </div>
            )}

            {/* ─── G. How We Analyzed Your Case (Visual Methodology) ───── */}
            {metadata.reasoningTrace?.analysis_phases && (
              <div className="pt-4 mt-4 border-t border-gray-100 dark:border-white/5 animate-message" style={{ animationDelay: '400ms' }}>
                <h4 className="text-[12px] uppercase tracking-[1.5px] font-bold text-[#997953] dark:text-[#cdaa80] mb-4 flex items-center gap-2">
                   ℹ️ How We Analyzed Your Case
                </h4>
                
                {/* Visual Analysis Path */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {metadata.reasoningTrace.analysis_phases.map((phase: any, i: number) => (
                    <div key={`${itemId}-phase-${i}`} className="group p-3 rounded-xl bg-white/40 dark:bg-white/5 border border-gray-200/30 dark:border-white/5 hover:border-[#997953]/30 transition-all">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xl shrink-0">{phase.icon}</span>
                        <div className="h-0.5 grow bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#997953] dark:bg-[#cdaa80]"
                            style={{ width: phase.status === 'complete' ? '100%' : '0%' }}
                          />
                        </div>
                      </div>
                      <span className="text-[12px] font-bold text-gray-800 dark:text-white block mb-1">{phase.title}</span>
                      <p className="text-[10px] text-gray-500 dark:text-white/40 leading-tight">
                        {phase.description}
                      </p>
                    </div>
                  ))}
                </div>
                
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
