import os
from groq import Groq
from typing import List, Dict, Optional
from app.config import settings


class AIService:
    _client = None

    @classmethod
    def get_client(cls):
        if cls._client is None:
            api_key = settings.GROQ_API_KEY
            if not api_key:
                return None
            cls._client = Groq(api_key=api_key)
        return cls._client

    @classmethod
    async def get_insight(cls, context: str) -> str:
        client = cls.get_client()
        if not client:
            return "AI Insight unavailable: GROQ_API_KEY not set."

        try:
            completion = client.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a professional sales consultant. Provide a concise, 1-2 sentence high-impact insight based on the provided CRM data. Focus on trends or urgent actions."
                    },
                    {
                        "role": "user",
                        "content": f"Here is the current CRM status: {context}"
                    }
                ],
                temperature=0.7,
                max_tokens=150,
            )
            return completion.choices[0].message.content
        except Exception as e:
            print(f"DEBUG: Groq API Error: {str(e)}")
            return f"AI Insight currently unavailable."

    @classmethod
    async def summarize_lead(cls, lead_context: str, activities: List) -> str:
        client = cls.get_client()
        if not client:
            return "AI Summary unavailable: GROQ_API_KEY not set."

        try:
            activity_text = ""
            if activities:
                activity_text = "Recent Activities:\n"
                for i, act in enumerate(activities[:10]):
                    activity_text += f"- {act.activity_type}: {act.subject}"
                    if act.content:
                        activity_text += f" - {act.content[:200]}"
                    activity_text += "\n"

            completion = client.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a professional CRM AI assistant. Generate a concise, insightful summary (2-3 sentences) of this lead based on all available data. Focus on key highlights, engagement level, and potential value."
                    },
                    {
                        "role": "user",
                        "content": f"Lead Data:\n{lead_context}\n\n{activity_text}"
                    }
                ],
                temperature=0.5,
                max_tokens=200,
            )
            return completion.choices[0].message.content
        except Exception as e:
            print(f"DEBUG: Groq API Error: {str(e)}")
            return "AI Summary currently unavailable."

    @classmethod
    async def qualify_lead(cls, lead_context: str, activities: List, score_events: List) -> Dict:
        client = cls.get_client()
        if not client:
            return {
                "qualification": "unknown",
                "reasoning": "AI unavailable",
                "score_factors": []
            }

        try:
            score_info = f"Score Events (last 20): {len(score_events)}"
            for evt in score_events[:20]:
                score_info += f"\n- {evt.action}: {evt.score_delta:+d} pts"

            completion = client.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=[
                    {
                        "role": "system",
                        "content": """You are a lead qualification expert. Analyze this lead and classify them as HOT, WARM, or COLD.

HOT: High engagement, clear intent signals, ready for immediate sales outreach
WARM: Some engagement, moderate interest, needs nurturing
COLD: Low engagement, no clear signals, may need longer nurturing or marketing

Respond ONLY in this exact JSON format:
{
  "qualification": "HOT" or "WARM" or "COLD",
  "reasoning": "2-3 sentences explaining your classification based on the data",
  "score_factors": ["factor 1", "factor 2", "factor 3", "factor 4"]
}
"""
                    },
                    {
                        "role": "user",
                        "content": f"Lead Data:\n{lead_context}\n\n{score_info}"
                    }
                ],
                temperature=0.3,
                max_tokens=300,
            )
            import json
            result_text = completion.choices[0].message.content
            result_text = result_text.strip()
            if result_text.startswith("```json"):
                result_text = result_text[7:]
            if result_text.endswith("```"):
                result_text = result_text[:-3]
            result_text = result_text.strip()

            return json.loads(result_text)
        except Exception as e:
            print(f"DEBUG: Groq API Error: {str(e)}")
            return {
                "qualification": "unknown",
                "reasoning": f"Analysis failed: {str(e)}",
                "score_factors": []
            }

    @classmethod
    async def generate_outreach_email(
        cls, lead, activities: List, email_type: str, tone: str, context: Optional[str] = None
    ) -> Dict:
        client = cls.get_client()
        if not client:
            return {
                "subject": "Subject: [AI Unavailable]",
                "body": "AI Email generation unavailable."
            }

        try:
            email_type_prompts = {
                "initial": "Initial outreach email - introduce your company and value proposition",
                "follow_up": "Follow-up email - re-engage after initial contact with new value or urgency",
                "demo": "Email to schedule a demo - focus on value of seeing a live demo",
                "proposal": "Email with proposal/quote attached",
                "nurture": "Nurture email - provide value without asking for anything"
            }

            tone_prompts = {
                "professional": "Formal, business-appropriate tone",
                "friendly": "Warm, conversational tone",
                "casual": "Relaxed, informal tone",
                "urgent": "Create urgency with time-sensitive messaging"
            }

            activity_summary = ""
            if activities:
                activity_summary = "Previous interactions:\n"
                for act in activities[:5]:
                    activity_summary += f"- {act.activity_type}: {act.subject}\n"

            prompt = f"""Write a personalized outreach email for this lead.

{email_type_prompts.get(email_type, email_type_prompts['initial'])}

Tone: {tone_prompts.get(tone, tone_prompts['professional'])}

Lead Info:
- Name: {lead.name}
- Company: {lead.company or 'N/A'}
- Industry: {lead.industry or 'N/A'}
- Email: {lead.email or 'N/A'}
- Source: {lead.source or 'N/A'}
- Status: {lead.status}
- Score: {lead.score}
{activity_summary}

{context or ''}

Respond ONLY in this exact JSON format:
{{"subject": "email subject line (max 60 chars)", "body": "email body (150-300 words)"}}
"""
            completion = client.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a professional B2B sales copywriter. Write compelling, personalized emails that drive engagement."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=600,
            )

            import json
            result_text = completion.choices[0].message.content
            result_text = result_text.strip()
            if result_text.startswith("```json"):
                result_text = result_text[7:]
            if result_text.endswith("```"):
                result_text = result_text[:-3]
            result_text = result_text.strip()

            return json.loads(result_text)
        except Exception as e:
            print(f"DEBUG: Groq API Error: {str(e)}")
            return {
                "subject": "Subject: Quick question",
                "body": f"Hi {lead.name},\n\nI wanted to reach out regarding {lead.company or 'your company'}. Let me know if you'd be interested in connecting.\n\nBest regards"
            }

    @classmethod
    async def get_lead_insights(cls, lead_context: str, activities: List, score_events: List) -> Dict:
        client = cls.get_client()
        if not client:
            return {
                "conversion_probability": 50,
                "best_contact_time": "Morning (9-11 AM)",
                "preferred_channel": "Email",
                "pain_points": ["Unable to analyze"],
                "key_strengths": ["Unable to analyze"],
                "recommended_actions": ["Unable to analyze"]
            }

        try:
            activity_text = "Recent Activities:\n"
            for act in activities[:10]:
                activity_text += f"- {act.activity_type}: {act.subject}\n"

            score_text = "Score Events:\n"
            for evt in score_events[:20]:
                score_text += f"- {evt.action}: {evt.score_delta:+d}\n"

            completion = client.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=[
                    {
                        "role": "system",
                        "content": """You are a CRM AI analytics expert. Analyze this lead and provide actionable insights.

Respond ONLY in this exact JSON format:
{
  "conversion_probability": 0-100,
  "best_contact_time": "specific time range like 'Morning (9-11 AM)'",
  "preferred_channel": "Email or Phone or LinkedIn or SMS",
  "pain_points": ["pain point 1", "pain point 2", "pain point 3"],
  "key_strengths": ["strength 1", "strength 2", "strength 3"],
  "recommended_actions": ["action 1", "action 2", "action 3"]
}
"""
                    },
                    {
                        "role": "user",
                        "content": f"Lead Data:\n{lead_context}\n\n{activity_text}\n\n{score_text}"
                    }
                ],
                temperature=0.5,
                max_tokens=400,
            )

            import json
            result_text = completion.choices[0].message.content
            result_text = result_text.strip()
            if result_text.startswith("```json"):
                result_text = result_text[7:]
            if result_text.endswith("```"):
                result_text = result_text[:-3]
            result_text = result_text.strip()

            return json.loads(result_text)
        except Exception as e:
            print(f"DEBUG: Groq API Error: {str(e)}")
            return {
                "conversion_probability": 50,
                "best_contact_time": "Morning (9-11 AM)",
                "preferred_channel": "Email",
                "pain_points": ["Unable to analyze due to AI error"],
                "key_strengths": ["Unable to analyze due to AI error"],
                "recommended_actions": ["Unable to analyze due to AI error"]
            }


ai_service = AIService()