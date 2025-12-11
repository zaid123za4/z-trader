
import { GoogleGenAI } from "@google/genai";
import { ChartPoint } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getMarketAnalysis = async (symbol: string, currentPrice: number, history: ChartPoint[]) => {
  if (!process.env.API_KEY) {
    return "SYSTEM ERROR: API_KEY is missing from environment. I can't think without a brain.";
  }

  // Simplify history to reduce token usage
  const priceTrend = history.slice(-15).map(h => h.price).join(', ');
  
  const prompt = `
    Role: You are Z-Mode, a savage, high-frequency trading AI assistant.
    User: Zaid.
    Task: Analyze REAL MARKET DATA for ${symbol}.
    
    Data:
    - Current Price: $${currentPrice}
    - Last 15 Mins Trend: [${priceTrend}]
    
    Output:
    1. "Savage Rating" (STRONG BUY / BUY / HOLD / SELL / DUMP IT).
    2. Short, ruthless explanation. Use technicals (RSI, MACD patterns) based on the price array.
    3. "Sentiment Score": 0 (Fear) to 100 (Greed).
    4. Roast Zaid for hesitating.
    
    Keep it under 100 words.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        maxOutputTokens: 300,
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Brain Fart:", error);
    return "My brain is disconnected. Check the console.";
  }
};

export const getDeepThinkingAnalysis = async (portfolio: any[]) => {
  if (!process.env.API_KEY) return "SYSTEM ERROR: No API Key found.";

  const portfolioSummary = JSON.stringify(portfolio);
  
  const prompt = `
    Role: Z-Mode (Savage Financial Advisor).
    Context: Analysis of Zaid's current positions.
    Portfolio Data: ${portfolioSummary}
    
    Task:
    1. Roast the PnL with extreme prejudice.
    2. Perform a deep correlation analysis of the holdings (mentally).
    3. Suggest a complex hedging strategy or a specific position to cut based on macro risks.
    4. Provide a "God-Tier" prediction for the next week.
    
    You are using your maximum thinking capacity. Be profound.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 32768 }
      }
    });
    return response.text;
  } catch (error) {
    return "I tried to engage my massive brain but the universe couldn't handle it. (Error: Check API Key/Quota)";
  }
};

export const getDeepMarketAnalysis = async (symbol: string, currentPrice: number, history: ChartPoint[]) => {
  if (!process.env.API_KEY) {
    return "SYSTEM ERROR: API_KEY is missing.";
  }

  const priceTrend = history.slice(-60).map(h => h.price).join(', '); // More data
  
  const prompt = `
    Role: Z-Mode (Elite Quantitative Analyst).
    User: Zaid.
    Task: Perform a DEEP THINKING strategic analysis on ${symbol}.
    
    Data:
    - Current Price: $${currentPrice}
    - 60-Minute Trend: [${priceTrend}]
    
    Reasoning Chain Required:
    1. Analyze Volatility Structure and Implied Whale Activity.
    2. Hypothesize Market Maker intent (Trap or Breakout?).
    3. Evaluate Risk/Reward relative to current macro environment.
    
    Output:
    A comprehensive, strategic playbook.
    - Entry Zone
    - Invalidations
    - Psycho-analysis of the market participants.
    - Final Verdict.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 32768 }
      }
    });
    return response.text;
  } catch (error) {
    console.error("Deep Think Error:", error);
    return "Brain overheat. Too much thinking.";
  }
};

export const runMarketScannerAgent = async (
    marketSnapshot: Record<string, { price: number, history: number[] }>,
    mode: 'scan_entry' | 'scan_exit' = 'scan_entry'
) => {
  if (!process.env.API_KEY) {
      return {
          symbol: "SYSTEM",
          action: "hold",
          reasoning: "Missing Gemini API Key in environment."
      };
  }

  // Sanitization: Ensure no NaNs, undefineds, or empty histories
  const cleanData = Object.entries(marketSnapshot).map(([s, d]) => ({
      s: s,
      p: Number(d.price) || 0,
      h: (d.history || []).map(h => Number(h) || 0).slice(-15) // Give it a bit more context, 15 points
  })).filter(item => item.p > 0 && item.h.length > 0);

  if (cleanData.length === 0) {
      return {
          symbol: "MARKET",
          action: "hold",
          reasoning: "No valid price data available to scan."
      };
  }
  
  const snapshotStr = JSON.stringify(cleanData);

  let goal = "";
  if (mode === 'scan_entry') {
      goal = "Identify the single best BUY opportunity.";
  } else {
      goal = "Analyze if the current asset should be SOLD immediately due to market structure breakdown.";
  }

  // Relaxed prompt to avoid syntax errors
  const prompt = `
    Role: Z-Mode Crisis Fund Manager (Battle Hardened).
    Task: ${goal}
    Market Context: High Volatility Potential.
    
    Data: ${snapshotStr} ('p' = price, 'h' = last 15 ticks)
    
    CRISIS ANALYSIS PROTOCOLS:
    1. MARKET REGIME DETECTION: Look at the 'h' array. 
       - If prices are dropping >2% in the array (Vertical Drop), this is a "FALLING KNIFE". Action: SELL/HOLD. NEVER BUY.
       - If prices are sideways, look for breakout volume (implied).
    
    2. ENTRY RULES:
       - Only BUY if there is a clear "Higher Low" structure in 'h'.
       - Avoid buying tops.
    
    3. EXIT RULES:
       - If price 'p' is < lowest point of 'h' by a margin, PANIC SELL.
       - Capital preservation is priority #1.
    
    4. Select ONE symbol.
    5. Determine action: "buy", "sell", or "hold".
    6. SUGGEST STOP LOSS (sl) and TAKE PROFIT (tp). If "Falling Knife", set SL very tight.
    
    Output Format:
    Return ONLY a raw JSON object. No markdown. No text outside the JSON.
    Example: {"symbol": "AAPL", "action": "buy", "reasoning": "Higher low formed, breakout likely", "sl": 150.20, "tp": 165.00}
    
    Constraint: Reasoning must be short (max 10 words) and contain NO special characters or quotes. Do NOT use markdown code blocks.
  `;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            maxOutputTokens: 1000, 
        }
    });
    
    let text = response.text;
    if (!text) throw new Error("Empty response from AI");

    // Clean up markdown if present (e.g. ```json ... ```)
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // Extract JSON substring if there's conversational fluff
    const startIndex = text.indexOf('{');
    let endIndex = text.lastIndexOf('}');
    
    if (startIndex !== -1) {
        if (endIndex === -1 || endIndex < startIndex) {
            // Attempt to repair truncated JSON
            text = text.substring(startIndex) + '"}'; // Blind attempt to close string and obj
            endIndex = text.length - 1;
        } else {
            text = text.substring(startIndex, endIndex + 1);
        }
    }
    
    try {
        const json = JSON.parse(text);
        
        // Validate fields exist
        if (!json.symbol || !json.action) {
            throw new Error("Incomplete JSON received");
        }
        
        // Normalize action
        json.action = json.action.toLowerCase();
        
        return json;
    } catch (parseError) {
        // console.error("JSON Parse Error:", parseError, "Raw Text:", text); // Squelch log for cleaner console
        return {
            symbol: "ERROR",
            action: "hold",
            reasoning: "Agent spoke gibberish. Try again."
        };
    }

  } catch (error) {
    // console.error("Agent Failed", error);
    return {
        symbol: "ERROR",
        action: "hold",
        reasoning: "Agent brain overload. Try again."
    };
  }
}
