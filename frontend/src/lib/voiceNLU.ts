// Intent parsers for Voice Assistant

export type VoiceCategory = 'vitals' | 'sleep' | 'activity' | 'nutrition' | 'lifestyle' | 'profile';

export interface ParsedVoiceData {
  category: VoiceCategory;
  confidence: number;
  data: any; // Extracted parameters to fill into healthStore later
  rawText: string;
}

export function parseVoiceInput(text: string, currentTab: string): ParsedVoiceData | null {
  const t = text.toLowerCase();
  
  // 1. Explicit Vitals mapping
  // Blood Pressure
  const bpMatch = t.match(/(?:blood pressure|bp).*?(\d{2,3})\s*(?:over|\/|\s)\s*(\d{2,3})/);
  if (bpMatch) {
    return {
      category: 'vitals',
      confidence: 1,
      data: { metric: 'bloodPressure', systolicVal: parseInt(bpMatch[1]), diastolicVal: parseInt(bpMatch[2]), value: 0 },
      rawText: text
    };
  }
  
  // Implicit BP (currentTab = vitals)
  if (currentTab === 'vitals' || currentTab === 'profile') {
    const implicitBp = t.match(/^(\d{2,3})\s*(?:over|\/|\s)\s*(\d{2,3})$/);
    if (implicitBp) {
      return {
        category: 'vitals',
        confidence: 0.8,
        data: { metric: 'bloodPressure', systolicVal: parseInt(implicitBp[1]), diastolicVal: parseInt(implicitBp[2]), value: 0 },
        rawText: text
      };
    }
  }

  // Heart Rate
  const hrMatch = t.match(/(?:heart rate|pulse|hr).*?(\d{2,3})/);
  if (hrMatch) {
    return {
      category: 'vitals',
      confidence: 0.9,
      data: { metric: 'heartRate', value: parseInt(hrMatch[1]) },
      rawText: text
    };
  }

  // Glucose
  const glucoseMatch = t.match(/(?:glucose|blood sugar).*?(\d{2,3})/);
  if (glucoseMatch) {
    return {
      category: 'vitals',
      confidence: 0.9,
      data: { metric: 'glucose', value: parseInt(glucoseMatch[1]) },
      rawText: text
    };
  }
  
  // Temperature
  const tempMatch = t.match(/(?:temperature|fever).*?(\d{2,3}(?:\.\d)?)/);
  if (tempMatch) {
    return {
      category: 'vitals',
      confidence: 0.9,
      data: { metric: 'temperature', value: parseFloat(tempMatch[1]) },
      rawText: text
    };
  }

  // 2. Sleep mapping
  const sleepMatch = t.match(/(?:slept|sleep|got).*?(\d{1,2}(?:\.\d)?)\s*hours?/);
  if (sleepMatch) {
    const hours = parseFloat(sleepMatch[1]);
    return {
      category: 'sleep',
      confidence: 0.9,
      data: { duration: hours * 60 },
      rawText: text
    };
  }
  
  if (currentTab === 'sleep') {
     const implicitSleep = t.match(/^(\d{1,2}(?:\.\d)?)\s*hours?$/);
     if (implicitSleep) {
         return {
             category: 'sleep',
             confidence: 0.8,
             data: { duration: parseFloat(implicitSleep[1]) * 60 },
             rawText: text
         }
     }
  }

  // 3. Activity / Steps
  const stepMatch = t.match(/(?:walked|did|got)?\s*(\d{1,3}(?:,\d{3})*|\d+)\s*steps/);
  if (stepMatch) {
    const steps = parseInt(stepMatch[1].replace(/,/g, ''));
    return {
      category: 'activity',
      confidence: 0.9,
      data: { type: 'steps', steps },
      rawText: text
    };
  }

  const workoutMatch = t.match(/(?:ran|walked|cycled|did|worked out|workout).*?(\d{1,3})\s*min(?:ute)?s?/);
  if (workoutMatch) {
    let wType = 'other';
    if (t.includes('yoga')) wType = 'yoga';
    if (t.includes('run') || t.includes('ran') || t.includes('cardio')) wType = 'cardio';
    if (t.includes('walk')) wType = 'walking';
    if (t.includes('strength') || t.includes('lift')) wType = 'strength';

    return {
      category: 'activity',
      confidence: 0.9,
      data: { type: 'workout', workoutType: wType, duration: parseInt(workoutMatch[1]) },
      rawText: text
    };
  }

  // 4. Nutrition
  const nutritionMatch = t.match(/(\d{1,4})\s*(?:calories|kcals|cal|cals)/);
  const nutritionKeywords = /(breakfast|lunch|dinner|snack|ate|eat|food|meal)/;

  if (nutritionMatch || nutritionKeywords.test(t) || currentTab === 'nutrition') {
    let mealType = 'snack';
    if (t.includes('breakfast')) mealType = 'breakfast';
    if (t.includes('lunch')) mealType = 'lunch';
    if (t.includes('dinner')) mealType = 'dinner';

    const calories = nutritionMatch ? parseInt(nutritionMatch[1]) : 0;

    return {
      category: 'nutrition',
      confidence: nutritionMatch ? 0.9 : 0.6,
      data: { meal: mealType, calories },
      rawText: text
    };
  }

  // 5. Lifestyle (Water)
  const waterMatchLiters = t.match(/(\d{1,2}(?:\.\d)?)\s*l(?:iters?)?(?:\s*of)?\s*water/);
  if (waterMatchLiters) {
    return {
      category: 'lifestyle',
      confidence: 0.9,
      data: { type: 'water', amount: parseFloat(waterMatchLiters[1]) * 1000 },
      rawText: text
    };
  }
  
  const waterMatchMl = t.match(/(\d{2,4})\s*ml(?:\s*of)?\s*water/);
  if (waterMatchMl) {
    return {
      category: 'lifestyle',
      confidence: 0.9,
      data: { type: 'water', amount: parseInt(waterMatchMl[1]) },
      rawText: text
    };
  }
  
  // Implicit Water
  if (currentTab === 'lifestyle') {
      const implicitWater = t.match(/(?:drank|had)\s*(\d{1,2})\s*glasses/);
      if (implicitWater) {
          return {
              category: 'lifestyle',
              confidence: 0.8,
              data: { type: 'water', amount: parseInt(implicitWater[1]) * 250 }, // assume 250ml per glass
              rawText: text
          }
      }
  }

  return null; // unsupported or unrecognized intent
}

export function formatPreview(parsed: ParsedVoiceData): string {
   switch(parsed.category) {
       case 'vitals': 
          if(parsed.data.metric === 'bloodPressure') return `Blood Pressure: ${parsed.data.systolicVal}/${parsed.data.diastolicVal}`;
          if(parsed.data.metric === 'heartRate') return `Heart Rate: ${parsed.data.value} bpm`;
          if(parsed.data.metric === 'glucose') return `Glucose: ${parsed.data.value} mg/dL`;
          if(parsed.data.metric === 'temperature') return `Temperature: ${parsed.data.value}°`;
          return `${parsed.data.metric}: ${parsed.data.value}`;
       case 'sleep':
          return `Slept for ${Math.round(parsed.data.duration / 60 * 10) / 10} hours`;
       case 'activity':
          if(parsed.data.type === 'steps') return `${parsed.data.steps} steps`;
          return `${parsed.data.duration} mins of ${parsed.data.workoutType}`;
       case 'nutrition':
          return `${parsed.data.calories} kcal for ${parsed.data.meal}`;
       case 'lifestyle':
          if(parsed.data.type === 'water') return `Drank ${parsed.data.amount}ml of water`;
          return `Lifestyle entry`;
   }
   return "Unknown entry";
}
