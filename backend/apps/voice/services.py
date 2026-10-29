import json
import os
from datetime import datetime, time as dtime

import requests

from core.logging import logger
from django.utils.dateparse import parse_datetime, parse_date

GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

VALID_REPEATS = ('none', 'daily', 'weekly', 'monthly')

SYSTEM_PROMPT = """You are a task extraction engine. You receive a raw transcript of a user speaking their thoughts out loud (a "brain dump"). Extract every concrete, actionable item the user should do or be reminded of.

Reply with ONLY one JSON object and no other text, no markdown fences, no commentary:

{{
  "items": [
    {{
      "type": "todo" or "reminder",
      "title": "short, concise item title using the user's wording where possible",
      "description": "optional longer explanation or null",
      "due_date": "ISO 8601 datetime or null (todos only)",
      "reminder_time": "ISO 8601 datetime or null (reminders only)",
      "repeat": "none" | "daily" | "weekly" | "monthly"
    }}
  ]
}}

Rules:
- A "todo" is anything the user needs to do (errands, chores, work items, calls, messages, research).
- A "reminder" is something that should surface to the user later (appointments, events, birthdays) or a request prefaced by phrases like "remind me to ...", "don't let me forget ...", "remind me that ...".
- Keep titles concise and action-oriented.
- If a time is explicitly mentioned, resolve it to an exact ISO datetime using the current timestamp provided below. Understand relative phrases: "tomorrow", "next week", "this Friday", "at 5pm", "in two hours", "end of day", "tonight", "next month", etc. Prefer the closest sensible future occurrence.
- If no time is mentioned, set the corresponding field to null.
- For reminders, if the user specifies a cadence ("every day", "daily", "every week", "each Monday"), set repeat accordingly.
- Ignore filler words, false starts, thinking out loud, and anything not clearly actionable.
- Do not invent items that were not mentioned.

Current timestamp: {current_time_iso}"""


class VoiceExtractionError(Exception):
    pass


def _parse_dt(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, str):
        dt = parse_datetime(value)
        if dt:
            return dt.isoformat()
        d = parse_date(value)
        if d:
            return datetime.combine(d, dtime.min).isoformat()
    return None


def _normalize_items(items):
    normalized = []
    if not isinstance(items, list):
        return normalized
    for raw in items:
        if not isinstance(raw, dict):
            continue
        item_type = str(raw.get('type', '')).lower().strip()
        if item_type not in ('todo', 'reminder'):
            item_type = 'todo'
        title = str(raw.get('title', '')).strip()
        if len(title) < 2:
            continue
        description = str(raw.get('description') or '').strip() or None
        repeat = str(raw.get('repeat') or 'none').lower().strip()
        if repeat not in VALID_REPEATS:
            repeat = 'none'
        if item_type == 'reminder':
            normalized.append({
                'type': 'reminder',
                'title': title,
                'description': description,
                'reminder_time': _parse_dt(raw.get('reminder_time')),
                'repeat': repeat,
            })
        else:
            normalized.append({
                'type': 'todo',
                'title': title,
                'description': description,
                'due_date': _parse_dt(raw.get('due_date')),
                'repeat': repeat,
            })
    return normalized


def _strip_fences(content):
    content = content.strip()
    if content.startswith('```'):
        first_newline = content.find('\n')
        if first_newline != -1:
            content = content[first_newline + 1:]
    if content.endswith('```'):
        content = content[:-3].rstrip()
    return content.strip()


def _parse_response(content):
    content = _strip_fences(content)
    start = content.find('{')
    end = content.rfind('}')
    if start == -1 or end == -1 or end <= start:
        raise VoiceExtractionError('The extraction model returned an invalid response.')
    try:
        data = json.loads(content[start:end + 1])
    except json.JSONDecodeError:
        raise VoiceExtractionError('The extraction model returned an invalid response.')
    return _normalize_items(data.get('items'))


def extract_items(transcript, current_time):
    api_key = os.environ.get('GROQ_API_KEY', '')
    if not api_key:
        raise VoiceExtractionError('Voice extraction is not configured. Please set GROQ_API_KEY in the server .env file.')
    model = os.environ.get('GROQ_MODEL', 'openai/gpt-oss-20b')

    prompt = SYSTEM_PROMPT.format(current_time_iso=current_time.isoformat())

    payload = {
        'model': model,
        'messages': [
            {'role': 'system', 'content': prompt},
            {'role': 'user', 'content': transcript},
        ],
        'temperature': 0.2,
        'max_tokens': 2000,
        'response_format': {'type': 'json_object'},
    }

    try:
        resp = requests.post(
            GROQ_API_URL,
            headers={'Authorization': f'Bearer {api_key}'},
            json=payload,
            timeout=30,
        )
    except requests.RequestException:
        logger.error('Groq request failed')
        raise VoiceExtractionError('Could not reach the voice extraction service. Please try again.')

    if resp.status_code != 200:
        logger.error(f'Groq error {resp.status_code}: {resp.text[:200]}')
        raise VoiceExtractionError('The voice extraction service returned an error. Please try again.')

    try:
        content = resp.json()['choices'][0]['message']['content']
    except (KeyError, IndexError, ValueError):
        raise VoiceExtractionError('The voice extraction service returned an invalid response.')

    return _parse_response(content)