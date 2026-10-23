'use client';
import React, { useEffect, useRef, useState } from 'react';
import NextLink from 'next/link';
import { Sidebar } from '../../../../components/sidebar';
import gsap from 'gsap';

import axios from 'axios';
import { supabase } from '@/lib/supabase/client';
import { upsertChatbotCase } from '@/lib/db/cases';
import { setActiveCaseForUser } from '@/lib/db/sessions';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { toast } from 'sonner';
import { getNotifications, markAllNotificationsRead, markNotificationRead, subscribeToNotifications } from '@/lib/db/notifications';
import type { Database } from '@/types/supabase';
import { ChatAnalysisCard } from '@/components/ChatAnalysisCard';
import { getBackendAuthHeaders, getBackendUrl } from '@/lib/utils/backendUrl';
import { canonicalizeDomain } from '@/lib/utils/domain';

const BACKEND_URL = getBackendUrl()
const SUPABASE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)
// Without Supabase there is no login layer. The chat still works in local demo
// mode and saves cases to the backend's SQLite database.
const DEMO_MODE =
  !SUPABASE_CONFIGURED ||
  process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim',
  'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
  'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry',
  'Chandigarh', 'Andaman and Nicobar Islands',
]

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
  isError?: boolean;
  type?: 'text' | 'follow_up' | 'analysis_result';
  attachments?: string[];
  metadata?: {
    questions?: string[];
    summary?: string;
    standing?: string;
    actionPlan?: any;
    legalMapping?: any;
    generatedDocuments?: any;
    reasoningTrace?: any;
    incidentType?: string;
    structuredFacts?: any;
    // Fields for action-triggered save
    title?: string;
    domain?: string;
    rawNarrative?: string;
    status?: string;
    lawyerRecommended?: boolean;
    intakeStatus?: string;
  };
}

type NotificationRow = Database['public']['Tables']['notifications']['Row']

function deriveCaseTitle(rawTitle: unknown, rawSummary: unknown, rawNarrative: unknown): string {
  if (typeof rawTitle === 'string' && rawTitle.trim()) return rawTitle.trim()

  const summary = typeof rawSummary === 'string' ? rawSummary.trim() : ''
  if (summary) {
    const firstSentence = summary
      .split(/[.!?]/)
      .map((s) => s.trim())
      .find(Boolean) ?? summary
    return firstSentence.slice(0, 90)
  }

  const narrative = typeof rawNarrative === 'string' ? rawNarrative.trim() : ''
  if (narrative) {
    const firstLine = narrative
      .split(/\r?\n/)
      .map((s) => s.trim())
      .find(Boolean) ?? narrative
    return firstLine.slice(0, 90)
  }

  return 'Untitled Legal Case'
}

function inferDomainFromText(rawText: unknown): string {
  const text = typeof rawText === 'string' ? rawText.toLowerCase() : ''
  if (!text) return ''

  if (/(ancestral|inheritance|property|partition|share in property|land)/.test(text)) return 'property'
  if (/(husband|wife|marriage|custody|domestic violence|divorce|alimony)/.test(text)) return 'family'
  if (/(fraud|otp|cyber|online scam|hacked|phishing)/.test(text)) return 'cyber'
  if (/(salary|termination|employer|workplace|harassment at work)/.test(text)) return 'labour'
  if (/(rent|tenant|landlord|eviction)/.test(text)) return 'tenant'
  if (/(consumer|defect|warranty|refund|service center|product)/.test(text)) return 'consumer'

  return ''
}

export default function CitizenHome() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'ai',
      type: 'text',
      content: "Namaste! 👋 I'm NyayaAI. Describe your legal situation, and I will analyze the applicable laws and suggest next steps. You can also upload documents or evidence!",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [languagePreference, setLanguagePreference] = useState<'english' | 'hindi' | 'hinglish'>('english');
  const [stateJurisdiction, setStateJurisdiction] = useState('Maharashtra');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  const {
    isRecording,
    audioBlob,
    error: recorderError,
    startRecording,
    stopRecording,
    resetRecording
  } = useVoiceRecorder();
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputBarRef = useRef<HTMLDivElement>(null);
  const iconsRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...filesArray]);
    }
    // Reset input so the same file can be picked again if removed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (): Promise<string[]> => {
    if (selectedFiles.length === 0) return [];
    
    setIsUploading(true);
    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('files', file);
    });

    try {
      const authHeaders = await getBackendAuthHeaders();
      const response = await axios.post(`${BACKEND_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', ...authHeaders }
      });
      return response.data.file_paths;
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to upload documents. The engine will analyze your text only.");
      return [];
    } finally {
      setIsUploading(false);
      setSelectedFiles([]);
    }
  };

  const persistCaseToDashboard = async ({
    caseIdToSave,
    metadata,
    userId,
  }: {
    caseIdToSave: string;
    metadata: NonNullable<Message['metadata']>;
    userId?: string;
  }) => {
    let cloudSaved = false;
    try {
      if (userId) {
        const { error: upsertError } = await upsertChatbotCase({
          caseId: caseIdToSave,
          citizenId: userId,
          domain: (metadata.domain || 'other') as any,
          title: metadata.title || 'Untitled Case',
          incident_description: metadata.rawNarrative || metadata.summary || '',
          status: (metadata.status || 'analysis_complete') as any,
          is_seeking_lawyer: !!metadata.lawyerRecommended,
          confidence_score:
            typeof metadata.standing === 'string'
              ? metadata.standing === 'strong'
                ? 80
                : metadata.standing === 'moderate'
                  ? 60
                  : 40
              : null,
          confirmed_facts: metadata.structuredFacts || null,
          applicable_laws: metadata.legalMapping || null,
          recommended_strategy: metadata.actionPlan || null,
          case_brief: metadata.reasoningTrace || null,
          evidence_inventory: metadata.actionPlan?.evidence_checklist || null,
        });
        if (upsertError) throw upsertError;
        cloudSaved = true;
      }

      const authHeaders = await getBackendAuthHeaders();
      await axios.post(
        `${BACKEND_URL}/save_case/${caseIdToSave}`,
        {},
        { headers: authHeaders }
      );
      return { backendSaved: true, cloudSaved };
    } catch (error) {
      console.error('Failed to persist case:', error);
      return { backendSaved: false, cloudSaved };
    }
  };

  const onlyLawyerAcceptance = (rows: NotificationRow[]) =>
    rows.filter((row) => {
      if (row.type === 'offer_accepted') return true;
      const title = (row.title ?? '').toLowerCase();
      const body = (row.body ?? '').toLowerCase();
      return title.includes('accepted') || body.includes('accepted');
    });

  const formatRelativeTime = (iso: string | null) => {
    if (!iso) return 'Just now';
    const then = new Date(iso).getTime();
    const now = Date.now();
    const diffMin = Math.floor((now - then) / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d ago`;
  };

  const loadAcceptanceNotifications = async () => {
    if (!SUPABASE_CONFIGURED) return;
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return;

    setNotificationLoading(true);
    const { data, error } = await getNotifications(authData.user.id, 30);
    setNotificationLoading(false);
    if (error) return;

    const filtered = onlyLawyerAcceptance(data ?? []);
    setNotifications(filtered);
    setUnreadNotificationCount(filtered.filter((row) => !row.is_read).length);
  };
  useEffect(() => {
    // Scroll to bottom whenever messages change or loading state changes
    scrollToBottom();
  }, [messages, isLoading, isTranscribing]);

  useEffect(() => {
    if (recorderError) {
      toast.error(recorderError);
      resetRecording();
    }
  }, [recorderError, resetRecording]);

  useEffect(() => {
    if (audioBlob) {
      handleTranscription(audioBlob);
    }
  }, [audioBlob]);

  const handleTranscription = async (blob: Blob) => {
    setIsTranscribing(true);
    resetRecording(); // Clear blob so we don't re-trigger

    try {
      const formData = new FormData();
      formData.append('file', blob, 'voice_recording.webm');

      // Check if backend uses 8001 or standard API_URL
      const transcribeUrl = `${BACKEND_URL}/transcribe`;
      const authHeaders = await getBackendAuthHeaders();
      
      const response = await axios.post(transcribeUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...authHeaders,
        },
      });

      if (response.data?.text) {
        setInput(prev => prev ? `${prev} ${response.data.text}` : response.data.text);
      } else {
        toast.error("Could not transcribe audio. Please try again.");
      }
    } catch (err) {
      console.error("Transcription error:", err);
      toast.error("Failed to process voice input. Please ensure backend is running.");
    } finally {
      setIsTranscribing(false);
    }
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      tl.from(iconsRef.current, {
        opacity: 0,
        y: -15,
        duration: 0.6,
        ease: 'power3.out'
      })
      .from(headerRef.current, {
        opacity: 0,
        y: 20,
        duration: 0.8,
        ease: 'power3.out'
      }, "-=0.4")
      .from(inputBarRef.current, {
        opacity: 0,
        y: 30,
        duration: 0.8,
        ease: 'power3.out'
      }, "-=0.6");
      
    }, containerRef);
    
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!notificationRef.current?.contains(target)) {
        setNotificationOpen(false);
      }
    };

    if (notificationOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [notificationOpen]);

  useEffect(() => {
    let channel: ReturnType<typeof subscribeToNotifications> | null = null;

    if (!SUPABASE_CONFIGURED) return;

    const init = async () => {
      await loadAcceptanceNotifications();
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) return;

      channel = subscribeToNotifications(authData.user.id, async () => {
        await loadAcceptanceNotifications();
      });
    };

    void init();

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (customInput?: string) => {
    const textToSend = customInput || input;
    const hasFiles = selectedFiles.length > 0;
    const fileNames = selectedFiles.map(f => f.name);
    if (!textToSend.trim() && !hasFiles || isLoading) return;

    setIsLoading(true);
    
    let uploadedPaths: string[] = [];
    if (hasFiles) {
      uploadedPaths = await uploadFiles();
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend || (uploadedPaths.length > 0 ? "Analyzing uploaded documents..." : ""),
      timestamp: new Date(),
      attachments: fileNames.length > 0 ? fileNames : undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    if (!customInput) setInput('');

    try {
      let user: { id: string } | null = null
      if (SUPABASE_CONFIGURED) {
        try {
          const { data: authData } = await supabase.auth.getUser()
          user = authData.user
        } catch (authError) {
          console.warn('Could not read Supabase session:', authError)
        }
      }
      if (!user && !DEMO_MODE) {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          content: 'Please log in to save your case and continue chatting.',
          timestamp: new Date(),
          isError: true,
          type: 'text'
        };
        setMessages(prev => [...prev, errorMessage]);
        setIsLoading(false)
        return
      }

      const authHeaders = await getBackendAuthHeaders();
      const response = await axios.post(`${BACKEND_URL}/analyze`, {
        case_id: caseId,
        raw_narrative: textToSend,
        language_preference: languagePreference,
        state_jurisdiction: stateJurisdiction,
        mode: "citizen",
        file_paths: uploadedPaths
      }, { headers: authHeaders });

      const result = response.data;
      const newCaseId = result.case_state?.case_id;
      if (newCaseId) setCaseId(newCaseId);

      // Pre-calculate data for potential download sync
      const intakeStatus: string | undefined = result.intake_status;
      const isComplete = intakeStatus === 'complete';
      const lawyerRecommended = !!result.case_state?.action_plan?.lawyer_recommended;
      const structuredFacts = result.case_state?.structured_facts ?? null;
      const summaryText = structuredFacts?.incident_summary ?? '';
      const titleText = deriveCaseTitle(structuredFacts?.case_title, summaryText, textToSend);

      const derivedDomain = canonicalizeDomain(
        structuredFacts?.incident_type
          ?? inferDomainFromText(summaryText || textToSend)
          ?? 'other'
      );

      const nextStatus =
        lawyerRecommended && isComplete
          ? 'seeking_lawyer'
          : isComplete
            ? 'analysis_complete'
            : 'analysis_pending';

      if (newCaseId && user) {
        try {
          await setActiveCaseForUser(user.id, newCaseId);
        } catch (error) {
          console.warn('Could not set active case:', error);
        }
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: "",
        timestamp: new Date(),
        type: 'text'
      };

      if (result.intake_status === "awaiting_user_response") {
        aiMessage.type = 'text'; // Changed to text to avoid button rendering
        aiMessage.content = result.case_state?.conversational_response || "To provide the best guidance, I need a few more details.";
      } else if (result.intake_status === "complete") {
        aiMessage.type = 'analysis_result';
        aiMessage.content = "Your legal analysis is complete. Here is a summary of our findings and the recommended path forward.";
        aiMessage.metadata = {
          summary: result.case_state?.structured_facts?.incident_summary,
          standing: result.case_state?.legal_mapping?.legal_standing_score,
          actionPlan: result.case_state?.action_plan,
          legalMapping: result.case_state?.legal_mapping,
          generatedDocuments: result.case_state?.generated_documents,
          reasoningTrace: result.case_state?.reasoning_trace,
          incidentType: result.case_state?.structured_facts?.incident_type,
          structuredFacts: result.case_state?.structured_facts,
          
          // Data needed for persistence
          title: titleText,
          domain: derivedDomain,
          rawNarrative: result.case_state?.raw_narrative ?? textToSend,
          status: nextStatus,
          lawyerRecommended: lawyerRecommended && isComplete,
          intakeStatus: result.intake_status
        };
      } else {
        // Fallback for greetings or simple responses from conversational sync
        aiMessage.content = result.case_state?.conversational_response || "I've processed your input. How else can I help you today?";
      }

      setMessages(prev => [...prev, aiMessage]);

      if (isComplete && newCaseId && aiMessage.metadata) {
        // Persist immediately. The backend already saved a SQLite copy; this
        // also syncs the Supabase dashboard when a user is logged in.
        void persistCaseToDashboard({
          caseIdToSave: newCaseId,
          metadata: aiMessage.metadata,
          userId: user?.id,
        });
      }
    } catch (error) {
      console.error("API Error:", error);
      const isAxiosNetworkError = axios.isAxiosError(error) && !error.response
      const backendMessage = axios.isAxiosError(error) && typeof error.response?.data?.detail === 'string'
        ? error.response.data.detail
        : null

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: backendMessage
          ? `Legal engine error: ${backendMessage}`
          : isAxiosNetworkError
            ? `Cannot reach legal engine at ${BACKEND_URL}. Please verify backend is running on this URL.`
            : "I couldn't process your request right now. Please try again.",
        timestamp: new Date(),
        isError: true,
        type: 'text'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    if (!SUPABASE_CONFIGURED) return;
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return;
    await markAllNotificationsRead(authData.user.id);
    setNotifications((prev) => prev.map((row) => ({ ...row, is_read: true })));
    setUnreadNotificationCount(0);
  };

  const handleMarkRead = async (notificationId: string) => {
    await markNotificationRead(notificationId);
    setNotifications((prev) =>
      prev.map((row) => (row.id === notificationId ? { ...row, is_read: true } : row))
    );
    setUnreadNotificationCount((prev) => Math.max(prev - 1, 0));
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0f1e3f] overflow-hidden" ref={containerRef}>
      {/* Sidebar */}
      <div className="shrink-0 h-screen z-50 md:sticky md:top-0 shadow-[4px_0_24px_rgba(0,0,0,0.05)] dark:shadow-none bg-white dark:bg-[#0a152e]">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative h-full w-full">
        {/* Top Right Icons */}
        <div ref={iconsRef} className="absolute top-6 right-6 md:top-8 md:right-8 flex items-center gap-4 z-10 cursor-pointer">
          <div ref={notificationRef} className="relative">
            <button
              title="Notifications"
              onClick={async () => {
                const next = !notificationOpen;
                setNotificationOpen(next);
                if (next) {
                  await loadAcceptanceNotifications();
                }
              }}
              className="relative flex items-center justify-center w-11 h-11 md:w-12 md:h-12 rounded-full border border-gray-300 dark:border-white/5 dark:bg-[#213a56]/20 bg-white text-gray-700 dark:text-[#cdaa80] hover:bg-gray-100 dark:hover:bg-[#213a56]/60 transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm"
            >
              <svg className="w-5 h-5 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-[#b0372f] text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                </span>
              )}
            </button>

            {notificationOpen && (
              <div className="absolute right-0 mt-3 w-[320px] md:w-[360px] rounded-2xl border border-[#d8c1a1]/60 dark:border-[#cdaa80]/20 bg-white/95 dark:bg-[#12284f]/95 backdrop-blur-md shadow-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#e8d7c1] dark:border-[#cdaa80]/20 flex items-center justify-between">
                  <div>
                    <p className="text-[12px] uppercase tracking-[1.5px] text-[#7b5f40] dark:text-[#cdaa80] font-semibold">Notifications</p>
                    <p className="text-[12px] text-[#6b5a49] dark:text-white/70">Lawyer acceptance updates</p>
                  </div>
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-semibold text-[#997953] dark:text-[#e0c3a0] hover:underline"
                  >
                    Mark all read
                  </button>
                </div>

                <div className="max-h-[340px] overflow-y-auto custom-scrollbar">
                  {notificationLoading ? (
                    <div className="px-4 py-5 text-sm text-[#6b5a49] dark:text-white/70">Loading notifications...</div>
                  ) : notifications.length === 0 ? (
                    <div className="px-4 py-5 text-sm text-[#6b5a49] dark:text-white/70">No lawyer acceptance notifications yet.</div>
                  ) : (
                    notifications.map((item) => (
                      <NextLink
                        key={item.id}
                        href="/citizen/cases"
                        onClick={() => {
                          void handleMarkRead(item.id);
                          setNotificationOpen(false);
                        }}
                        className={`block px-4 py-3 border-b border-[#efe1ce] dark:border-[#cdaa80]/10 hover:bg-[#f9f2e8] dark:hover:bg-[#1a3358] transition-colors ${
                          item.is_read ? 'opacity-80' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-[13px] font-semibold text-[#3f3124] dark:text-white/90 leading-snug">
                            {item.title || 'A lawyer accepted your request'}
                          </p>
                          <span className="text-[11px] text-[#7b5f40] dark:text-white/60 whitespace-nowrap">
                            {formatRelativeTime(item.created_at)}
                          </span>
                        </div>
                        <p className="mt-1 text-[12px] text-[#6b5a49] dark:text-white/75 leading-relaxed">
                          {item.body || 'Tap to open your case updates.'}
                        </p>
                      </NextLink>
                    ))
                  )}
                </div>

                <div className="px-4 py-2 bg-[#f8efe2] dark:bg-[#10264a] border-t border-[#e8d7c1] dark:border-[#cdaa80]/20">
                  <NextLink href="/citizen/cases" className="text-[12px] font-semibold text-[#997953] dark:text-[#e0c3a0] hover:underline">
                    View all case updates
                  </NextLink>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Chat Area */}
        <div className="flex-1 overflow-y-auto px-6 pt-24 pb-40 custom-scrollbar">
          <div className="max-w-4xl mx-auto flex flex-col gap-8 md:px-6">
            
            {/* Header */}
            <div ref={headerRef} className="text-left cursor-default">
              <h1 className="text-[26px] md:text-[28px] lg:text-[32px] font-medium tracking-wide text-[#997953] dark:text-[#cdaa80] mb-2 font-serif transition-colors duration-500 hover:text-[#7a6042] dark:hover:text-[#e0c3a0]">
                NyayaAI Legal Assistant
              </h1>
              <p className="text-gray-600 dark:text-white/60 text-[15px] font-sans user-select-none hover:text-gray-800 dark:hover:text-white/80 transition-colors duration-300">
                Describe your legal situation and receive AI-powered legal guidance instantly.
              </p>
            </div>

            {/* Chat Messages */}
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`animate-message ${
                  msg.role === 'ai' 
                  ? 'bg-white dark:bg-[#213a56]/40 rounded-xl rounded-tl-sm border border-gray-200 dark:border-transparent' 
                  : 'bg-[#997953]/10 dark:bg-[#cdaa80]/10 rounded-xl rounded-tr-sm border border-[#997953]/20 dark:border-[#cdaa80]/20 self-end ml-12'
                } p-6 shadow-sm dark:shadow-xl dark:shadow-[#000000]/20 transition-all duration-300 backdrop-blur-sm max-w-[85%] ${
                  msg.isError ? 'border-red-400/50 dark:border-red-400/30' : ''
                }`}
              >
                {msg.role === 'ai' && (
                  <h2 className="text-[14px] font-medium text-[#997953] dark:text-[#cdaa80] flex items-center gap-2 mb-2 transition-colors">
                    NyayaAI <span role="img" aria-label="assistant" className="inline-block">⚖️</span>
                  </h2>
                )}
                <p className={`text-[15px] leading-relaxed font-sans whitespace-pre-wrap ${
                  msg.role === 'ai' ? 'text-gray-700 dark:text-white/85' : 'text-gray-800 dark:text-white'
                } ${msg.isError ? 'text-red-600 dark:text-red-400' : ''}`}>
                  {msg.content}
                </p>

                {/* Attachment indicators */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {msg.attachments.map((name, i) => (
                      <span
                        key={`${msg.id}-attach-${i}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#997953]/15 dark:bg-[#cdaa80]/15 text-[11px] text-[#997953] dark:text-[#cdaa80]"
                      >
                        📎 {name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Follow-up Questions - REMOVED for SYNC Chat */}

                {/* Analysis Result Card */}
                {msg.type === 'analysis_result' && msg.metadata && (
                  <div className="mt-6">
                    <ChatAnalysisCard
                      itemId={msg.id}
                      metadata={msg.metadata}
                      backendUrl={BACKEND_URL}
                      onDownloadSync={async () => {
                        const m = msg.metadata;
                        if (!m) return;

                        let userId: string | undefined;
                        if (SUPABASE_CONFIGURED) {
                          try {
                            const { data: authData } = await supabase.auth.getUser();
                            userId = authData.user?.id;
                          } catch {
                            userId = undefined;
                          }
                        }

                        if (!userId && !DEMO_MODE) {
                          toast.error("Please log in to save this case.");
                          return;
                        }

                        const cid = caseId || msg.id;
                        const saved = await persistCaseToDashboard({
                          caseIdToSave: cid,
                          metadata: m,
                          userId,
                        });

                        if (saved.backendSaved && (saved.cloudSaved || !userId)) {
                          toast.success(
                            userId
                              ? "Case successfully committed to dashboard."
                              : "Case saved locally."
                          );
                        } else {
                          toast.error("The case could not be saved. Please try again.");
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
            
            {/* Loading Indicator */}
            {isLoading && (
              <div className="animate-message bg-white dark:bg-[#213a56]/40 rounded-xl rounded-tl-sm border border-gray-200 dark:border-transparent p-6 shadow-sm dark:shadow-xl dark:shadow-[#000000]/20 backdrop-blur-sm w-fit">
                <div className="flex gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#997953] dark:bg-[#cdaa80] animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 rounded-full bg-[#997953] dark:bg-[#cdaa80] animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 rounded-full bg-[#997953] dark:bg-[#cdaa80] animate-bounce"></div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Fixed Input Area at Bottom */}
        <div ref={inputBarRef} className="absolute bottom-0 left-0 right-0 p-6 md:p-10 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent dark:from-[#0f1e3f] dark:via-[#0f1e3f] dark:to-transparent z-20">
          <div className="max-w-4xl mx-auto md:px-6">
            {/* File Previews */}
            {selectedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3 px-2">
                {selectedFiles.map((file, idx) => (
                  <div 
                    key={`${file.name}-${idx}`}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[#997953]/10 dark:bg-[#cdaa80]/10 border border-[#997953]/30 dark:border-[#cdaa80]/30 rounded-full text-[12px] text-[#997953] dark:text-[#cdaa80] animate-fadeIn"
                  >
                    <span className="truncate max-w-[150px]">{file.name}</span>
                    <button 
                      onClick={() => removeFile(idx)}
                      className="hover:text-red-500 transition-colors"
                      aria-label={`Remove ${file.name}`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Analysis preferences */}
            <div className="flex flex-wrap items-center gap-2 mb-2 px-2">
              <label className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-white/50">
                Language
                <select
                  value={languagePreference}
                  onChange={(e) => setLanguagePreference(e.target.value as 'english' | 'hindi' | 'hinglish')}
                  disabled={isLoading}
                  className="rounded-full border border-gray-300 dark:border-[#cdaa80]/30 bg-white dark:bg-[#1a2c47] px-2.5 py-1 text-[11px] text-gray-700 dark:text-white/80 outline-none focus:border-[#997953]"
                >
                  <option value="english">English</option>
                  <option value="hindi">हिन्दी</option>
                  <option value="hinglish">Hinglish</option>
                </select>
              </label>

              <label className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-white/50">
                State
                <select
                  value={stateJurisdiction}
                  onChange={(e) => setStateJurisdiction(e.target.value)}
                  disabled={isLoading}
                  className="rounded-full border border-gray-300 dark:border-[#cdaa80]/30 bg-white dark:bg-[#1a2c47] px-2.5 py-1 text-[11px] text-gray-700 dark:text-white/80 outline-none focus:border-[#997953]"
                >
                  {INDIAN_STATES.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </label>
              <span className="text-[10px] text-gray-400 dark:text-white/30">
                Used for language and local-law context
              </span>
            </div>

            <div className="flex items-center gap-4 w-full group relative">
              
              {/* Hidden File Input */}
              <input
                type="file"
                multiple
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
              />

              {/* Plus Button */}
              <button 
                type="button"
                disabled={isLoading || isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full border border-gray-300 dark:border-white/10 dark:bg-transparent bg-white text-gray-500 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/5 active:bg-gray-200 hover:scale-105 active:scale-95 transition-all duration-300 shrink-0 cursor-pointer shadow-sm z-10 outline-none focus:ring-2 focus:ring-[#997953]/50 dark:focus:ring-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Add attachment"
              >
                {isUploading ? (
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                  </svg>
                )}
              </button>
              
              {/* Input Field */}
              <form 
                className="flex-1 relative cursor-text transition-transform duration-300"
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              >
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isLoading || isTranscribing || isUploading}
                  placeholder={isLoading ? "Generating analysis..." : isUploading ? "Uploading documents..." : isTranscribing ? "Processing voice input..." : "Describe your legal situation..."}
                  className="w-full bg-white dark:bg-transparent border border-gray-300 dark:border-[#cdaa80]/30 rounded-full pl-6 pr-16 py-4 md:py-[18px] text-[15px] outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/40 focus:border-[#997953] dark:focus:border-[#cdaa80] focus:ring-1 focus:ring-[#997953] dark:focus:ring-[#cdaa80] transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.2)] hover:border-gray-400 dark:hover:border-[#cdaa80]/60 hover:bg-white/50 dark:hover:bg-[#213a56]/20 focus:bg-white dark:focus:bg-[#1a2c47]/50 disabled:opacity-70 disabled:cursor-wait"
                />
                
                {/* Voice Input Button Inside the Input Field */}
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isLoading || isTranscribing}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 focus:outline-none disabled:opacity-50 disabled:cursor-wait ${
                    isTranscribing 
                      ? 'bg-transparent text-[#997953] dark:text-[#cdaa80]' // loader state
                      : isRecording 
                        ? 'bg-red-500 text-white animate-pulse-ring' // recording state
                        : 'bg-transparent text-gray-400 hover:text-[#997953] dark:text-white/40 dark:hover:text-[#cdaa80] hover:bg-gray-100 dark:hover:bg-white/5' // idle state
                  }`}
                  aria-label={isRecording ? "Stop recording" : "Start recording"}
                >
                  {isTranscribing ? (
                    <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isRecording ? 2 : 1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  )}
                </button>
              </form>
              
              {/* Send Button */}
              <button 
                type="button"
                onClick={() => handleSend()}
                disabled={isLoading || isUploading || (!input.trim() && selectedFiles.length === 0)}
                className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#997953] dark:bg-[#cdaa80] text-white dark:text-[#0f1e3f] hover:bg-[#7a6042] dark:hover:bg-[#e0c3a0] hover:scale-105 active:scale-95 hover:shadow-lg hover:shadow-[#cdaa80]/20 transition-all duration-300 shrink-0 cursor-pointer shadow-md z-10 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#997953] dark:focus:ring-[#cdaa80] dark:focus:ring-offset-[#0f1e3f] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
              >
                <svg className="w-5 h-5 md:w-6 md:h-6 ml-1 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10l8-2 10-5-5 10-2 8-3-8-8-3z" />
                </svg>
              </button>

            </div>
          </div>
        </div>
      </div>
      
      {/* Global CSS for animations and custom scrollbar */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-message {
          animation: fadeIn 0.4s ease-out forwards;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(205, 170, 128, 0.2);
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(205, 170, 128, 0.5);
        }
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .animate-pulse-ring {
          animation: pulse-ring 2s infinite;
        }
      `}} />
    </div>
  );
}
