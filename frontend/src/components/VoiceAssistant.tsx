import React, { useState, useEffect } from 'react';
import { Mic, Loader2, Check, X } from 'lucide-react';
import { useSpeechRecognition } from '../lib/useSpeechRecognition';
import { parseVoiceInput, formatPreview, type ParsedVoiceData } from '../lib/voiceNLU';
import { healthStore } from '../lib/healthStore';
import { parseVoiceWithLLM } from '../api';

interface VoiceAssistantProps {
  currentTab: string;
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ currentTab }) => {
  const { isListening, transcript, isSupported, startListening, stopListening } = useSpeechRecognition();
  const [parsedData, setParsedData] = useState<ParsedVoiceData[] | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saveComplete, setSaveComplete] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  // Track whether this transcript session has already been processed
  const transcriptProcessed = React.useRef(false);
  // Capture the active tab at the time of recording so switching tabs doesn't re-trigger
  const tabAtRecordTime = React.useRef(currentTab);

  useEffect(() => {
    if (!isListening && transcript && !transcriptProcessed.current) {
      transcriptProcessed.current = true; // Mark as processed immediately to prevent re-runs
      const processTranscript = async () => {
        setIsParsing(true);
        setParseError(null);
        const apiKey = localStorage.getItem('google_api_key') || '';
        
        if (apiKey) {
           try {
             const result = await parseVoiceWithLLM(transcript, tabAtRecordTime.current, apiKey);
             if (result.success && result.parsed && Array.isArray(result.parsed)) {
                setParsedData(result.parsed);
                setShowModal(true);
                setIsParsing(false);
                return;
             } else if (!result.success) {
                setParseError(result.error || "Unknown AI error");
             }
           } catch(e: any) {
             console.error("LLM Parse failed, falling back to Regex", e);
             setParseError(e.message || "Network error");
           }
        }
        
        // Fallback to Regex
        const regexResult = parseVoiceInput(transcript, tabAtRecordTime.current);
        if (regexResult) {
          setParsedData([regexResult]);
        } else {
          setParsedData([]); // Empty array means nothing detected
        }
        
        setShowModal(true);
        setIsParsing(false);
      };
      
      processTranscript();
    }
  }, [isListening, transcript]); // currentTab deliberately excluded — captured via ref at record time

  const handleConfirm = () => {
    if (!parsedData || parsedData.length === 0) return;

    const ts = Date.now();
    const d = new Date();
    const yyyy_mm_dd = d.toISOString().split('T')[0];
    const hh_mm = d.toTimeString().slice(0, 5);

    try {
      parsedData.forEach(item => {
        switch (item.category) {
          case 'profile':
            healthStore.saveProfile({
                ...healthStore.getProfile(),
                ...(item.data as any)
            });
            break;
          case 'vitals':
            healthStore.addVital({
              timestamp: ts,
              metric: item.data.metric,
              value: item.data.value,
              systolicVal: item.data.systolicVal,
              diastolicVal: item.data.diastolicVal,
              note: 'Voice entry'
            });
            break;
          case 'sleep':
            healthStore.addSleep({
              date: yyyy_mm_dd,
              bedtime: '23:00', // default fallback
              wakeTime: hh_mm,
              duration: item.data.duration,
              deepMin: item.data.duration * 0.2, // estimate 20%
              remMin: item.data.duration * 0.25, // estimate 25%
              lightMin: item.data.duration * 0.5, // estimate 50%
              awakeMin: item.data.duration * 0.05, // estimate 5%
              note: 'Voice entry'
            });
            break;
          case 'activity':
            if (item.data.type === 'steps') {
              healthStore.addDailySteps({
                date: yyyy_mm_dd,
                steps: item.data.steps,
                activeCalories: Math.round(item.data.steps * 0.04)
              });
            } else {
              healthStore.addWorkout({
                date: yyyy_mm_dd,
                type: item.data.workoutType || 'other',
                duration: item.data.duration,
                calories: item.data.duration * 8, // estimate
                note: 'Voice entry'
              });
            }
            break;
          case 'nutrition':
            healthStore.addNutrition({
              date: yyyy_mm_dd,
              meal: item.data.meal,
              time: hh_mm,
              calories: item.data.calories,
              protein: 0, carbs: 0, fat: 0,
              note: 'Voice entry'
            });
            break;
          case 'lifestyle':
            if (item.data.type === 'water') {
               healthStore.addLifestyle({
                  date: yyyy_mm_dd,
                  screenTime: 0,
                  waterIntake: item.data.amount,
                  note: 'Voice entry'
               });
            } else if (item.data.type === 'screenTime') {
               healthStore.addLifestyle({
                  date: yyyy_mm_dd,
                  screenTime: item.data.amount,
                  waterIntake: 0, 
                  note: 'Voice entry'
               });
            }
            break;
        }
      });
      
      setSaveComplete(true);
      // Let standard React lifecycle know data changed if needed
      window.dispatchEvent(new Event('meditwin-data-update'));

      setTimeout(() => {
        setShowModal(false);
        setParsedData(null);
        setSaveComplete(false);
      }, 1500);
      
    } catch (e) {
      console.error(e);
    }
  };

  const toggleMic = () => {
    if (isListening) {
      stopListening();
    } else {
      // Reset the processed flag so a new recording can be processed
      transcriptProcessed.current = false;
      tabAtRecordTime.current = currentTab;
      startListening();
    }
  };

  if (!isSupported) {
    return (
      <div className="relative group">
        <button
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-line
            text-risk-md transition-colors opacity-50 cursor-not-allowed"
          aria-label="Toggle Voice Input (Unsupported)"
        >
          <Mic className="w-4 h-4" />
        </button>
        <div className="absolute right-0 top-12 w-48 p-2 rounded-xl bg-card border border-line shadow-lg text-[11px] text-fg2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          Voice input works best in Chrome or Edge.
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={toggleMic}
        className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-all relative
          ${isListening 
            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-500 pulse-ring' 
            : isParsing
            ? 'border-red-500 bg-red-500/20 text-red-500 pulse-ring'
            : 'border-line text-fg2 hover:text-fg hover:bg-card2'}`}
        aria-label="Toggle Voice Input"
        title={isListening ? "Listening..." : isParsing ? "Parsing AI..." : "Tap to speak"}
      >
        {isListening ? (
          <>
             <div className="absolute inset-0 rounded-lg animate-ping bg-emerald-500/30" />
             <Mic className="w-4 h-4 relative z-10" />
          </>
        ) : isParsing ? (
          <>
             <div className="absolute inset-0 rounded-lg animate-pulse bg-red-500/30" />
             <Loader2 className="w-4 h-4 animate-spin relative z-10" />
          </>
        ) : (
          <Mic className="w-4 h-4 relative z-10" />
        )}
      </button>

      {/* Confirmation Modal */}
      {showModal && parsedData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl border border-line bg-card p-5 space-y-5 animate-slide-up shadow-2xl">
            {saveComplete ? (
               <div className="py-6 flex flex-col items-center gap-3">
                 <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                   <Check className="w-6 h-6" />
                 </div>
                 <div className="text-[15px] font-semibold text-fg">Saved Successfully</div>
               </div>
            ) : (
              <>
                <div className="flex items-center gap-3 border-b border-line pb-4">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                    <Mic className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-fg">Confirm Entry</h3>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-bg border border-line">
                   <div className="flex flex-col gap-2">
                      <span className="text-[10px] uppercase tracking-widest text-fg3 font-bold text-center">Detected Events</span>
                      
                      {parseError ? (
                        <div className="text-center p-3 rounded-lg bg-risk-hi/10 border border-risk-hi/20 mt-1">
                           <span className="text-[12px] font-bold text-risk-hi block mb-1">AI Engine Error</span>
                           <span className="text-[11px] text-risk-hi/80 leading-snug block">{parseError}</span>
                        </div>
                      ) : parsedData.length > 0 ? (
                        <ul className="space-y-1.5 pt-1">
                          {parsedData.map((pd, idx) => (
                             <li key={idx} className="text-[13px] font-bold text-accent px-3 py-2 bg-accent/10 rounded-lg border border-accent/20">
                                {pd.category === 'profile' ? `Profile: ${Object.entries(pd.data).map(([k,v]) => `${k}: ${v}`).join(', ')}` : formatPreview(pd as any)}
                             </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-center py-4 text-[13px] font-medium text-fg3 italic">
                          "I didn't hear any specific health metrics to log."
                        </div>
                      )}
                   </div>
                </div>

                <div className="flex gap-2.5 pt-1">
                  <button
                    onClick={() => { setShowModal(false); setParsedData(null); }}
                    className="flex-1 py-2.5 rounded-xl border border-line bg-transparent text-fg hover:bg-card2 transition-colors text-[13px] font-semibold flex justify-center items-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={!parsedData || parsedData.length === 0}
                    className="flex-1 py-2.5 rounded-xl bg-accent text-white hover:opacity-90 transition-opacity text-[13px] font-semibold shadow-md flex justify-center items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check className="w-3.5 h-3.5" /> Save Data
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
