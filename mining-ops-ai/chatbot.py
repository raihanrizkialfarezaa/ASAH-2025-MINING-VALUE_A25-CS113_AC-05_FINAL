import ollama
import pandas as pd
from database import fetch_dataframe
import json
import os
import re
import math
from datetime import datetime, timedelta
from functools import lru_cache
import hashlib
import time
from llm_config import get_model

MODEL_NAME = get_model("sql_generation")

QUERY_CACHE = {}
CACHE_TTL = 60

CONVERSATION_CONTEXT = {}
CONTEXT_TTL = 600

TABLES_WITH_IS_ACTIVE = {
    "trucks",
    "excavators",
    "users",
    "mining_sites",
    "loading_points",
    "dumping_points",
    "road_segments",
    "vessels",
    "delay_reasons",
    "support_equipment",
    "jetty_berths",
    "system_configs",
}

def get_cached_result(cache_key):
    if cache_key in QUERY_CACHE:
        cached_data, timestamp = QUERY_CACHE[cache_key]
        if time.time() - timestamp < CACHE_TTL:
            return cached_data
        else:
            del QUERY_CACHE[cache_key]
    return None

def set_cached_result(cache_key, data):
    QUERY_CACHE[cache_key] = (data, time.time())

def get_cache_key(query):
    return hashlib.md5(query.encode()).hexdigest()

def get_conversation_context(session_id):
    if session_id and session_id in CONVERSATION_CONTEXT:
        ctx, timestamp = CONVERSATION_CONTEXT[session_id]
        if time.time() - timestamp < CONTEXT_TTL:
            return ctx
        else:
            del CONVERSATION_CONTEXT[session_id]
    return None

def set_conversation_context(session_id, context):
    if session_id:
        CONVERSATION_CONTEXT[session_id] = (context, time.time())

def extract_entities_from_text(text):
    entities = {
        'production_ids': [],
        'truck_ids': [],
        'excavator_ids': [],
        'vessel_ids': [],
        'schedule_ids': [],
        'site_ids': [],
        'operator_ids': [],
        'numeric_values': [],
        'dates': [],
        'shifts': [],
        'keywords': []
    }
    
    id_patterns = [
        (r'\b(cm[a-z0-9]{5,})\b', 'production_ids'),
        (r'(?:production\s+)?(?:id\s+)?["\']?(cm[a-z0-9]{5,})["\']?', 'production_ids'),
        (r'\b(trk[-_]?[a-z0-9]+)\b', 'truck_ids'),
        (r'\b(exc[-_]?[a-z0-9]+)\b', 'excavator_ids'),
        (r'\b(ves[-_]?[a-z0-9]+)\b', 'vessel_ids'),
        (r'\b(sch[-_]?[a-z0-9]+)\b', 'schedule_ids'),
        (r'production\s+(?:id\s+)?([a-z0-9]{8,})', 'production_ids'),
        (r'truk\s+(?:id\s+)?([A-Z0-9-]+)', 'truck_ids'),
        (r'excavator\s+(?:id\s+)?([A-Z0-9-]+)', 'excavator_ids'),
    ]
    
    for pattern, entity_type in id_patterns:
        matches = re.findall(pattern, text.lower())
        for match in matches:
            if match not in entities[entity_type]:
                entities[entity_type].append(match)
    
    numeric_matches = re.findall(r'\b(\d+(?:[.,]\d+)?)\s*(?:ton|kg|liter|jam|menit|km|meter|%|persen)?\b', text.lower())
    entities['numeric_values'] = [float(n.replace(',', '.')) for n in numeric_matches if n]
    
    date_patterns = [
        r'\b(\d{4}-\d{2}-\d{2})\b',
        r'\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b',
    ]
    for pattern in date_patterns:
        matches = re.findall(pattern, text)
        entities['dates'].extend(matches)
    
    shift_matches = re.findall(r'\b(shift[-_\s]?[123]|SHIFT_[123])\b', text, re.IGNORECASE)
    entities['shifts'] = [s.upper().replace(' ', '_').replace('-', '_') for s in shift_matches]
    
    keywords_to_track = [
        'target', 'aktual', 'actual', 'produksi', 'production', 'sisa', 'remaining',
        'kurang', 'lebih', 'total', 'achievement', 'pencapaian', 'selisih', 'difference',
        'profit', 'biaya', 'cost', 'revenue', 'pendapatan'
    ]
    for kw in keywords_to_track:
        if kw in text.lower():
            entities['keywords'].append(kw)
    
    return entities

def merge_contexts(old_ctx, new_entities, new_question, new_answer=None):
    if old_ctx is None:
        old_ctx = {
            'entities': {
                'production_ids': [],
                'truck_ids': [],
                'excavator_ids': [],
                'vessel_ids': [],
                'schedule_ids': [],
                'site_ids': [],
                'operator_ids': [],
                'numeric_values': [],
                'dates': [],
                'shifts': [],
                'keywords': []
            },
            'conversation_history': [],
            'last_query_result': None,
            'last_sql': None
        }
    
    for key, values in new_entities.items():
        if key in old_ctx['entities'] and values:
            for v in values:
                if v not in old_ctx['entities'][key]:
                    old_ctx['entities'][key].append(v)
            old_ctx['entities'][key] = old_ctx['entities'][key][-10:]
    
    old_ctx['conversation_history'].append({
        'question': new_question,
        'answer': new_answer,
        'timestamp': time.time()
    })
    old_ctx['conversation_history'] = old_ctx['conversation_history'][-5:]
    
    return old_ctx

def build_context_prompt(context):
    if not context:
        return ""
    
    parts = []
    
    entities = context.get('entities', {})
    if entities.get('production_ids'):
        parts.append(f"Production IDs mentioned: {', '.join(entities['production_ids'])}")
    if entities.get('truck_ids'):
        parts.append(f"Truck IDs mentioned: {', '.join(entities['truck_ids'])}")
    if entities.get('excavator_ids'):
        parts.append(f"Excavator IDs mentioned: {', '.join(entities['excavator_ids'])}")
    if entities.get('numeric_values'):
        parts.append(f"Numeric values mentioned: {', '.join(map(str, entities['numeric_values']))}")
    if entities.get('keywords'):
        parts.append(f"Keywords: {', '.join(entities['keywords'])}")
    
    history = context.get('conversation_history', [])
    if history:
        parts.append("\nRecent conversation:")
        for h in history[-3:]:
            q = h.get('question', '')[:200]
            a = h.get('answer', '')[:200] if h.get('answer') else ''
            parts.append(f"  User: {q}")
            if a:
                parts.append(f"  Assistant: {a}")
    
    if context.get('last_sql'):
        parts.append(f"\nLast SQL query executed: {context['last_sql'][:300]}")
    
    return "\n".join(parts)

def is_follow_up_question(question):
    follow_up_indicators = [
        'maksud saya', 'maksudnya', 'yang saya tanya', 'yang dimaksud',
        'sisa', 'remaining', 'selisih', 'kurang berapa', 'berapa lagi',
        'itu', 'tersebut', 'yang tadi', 'sebelumnya', 'tadi',
        'dari itu', 'dari data itu', 'dari yang tadi',
        'jelaskan', 'jelaskan lagi', 'lebih detail', 'rincian',
        'kenapa', 'mengapa', 'alasannya', 'penyebabnya',
        'bagaimana dengan', 'gimana dengan', 'kalau', 'jika',
        'lalu', 'terus', 'kemudian', 'selanjutnya'
    ]
    
    question_lower = question.lower().strip()
    
    for indicator in follow_up_indicators:
        if indicator in question_lower:
            return True
    
    if len(question_lower.split()) < 8:
        no_explicit_entity = True
        entity_indicators = ['id', 'truk', 'truck', 'excavator', 'kapal', 'vessel', 'produksi', 'production']
        for ei in entity_indicators:
            if ei in question_lower:
                no_explicit_entity = False
                break
        if no_explicit_entity:
            return True
    
    return False

def detect_remaining_production_question(question, context=None):
    question_lower = question.lower()
    remaining_indicators = [
        'berapa ton lagi', 'sisa ton', 'sisa produksi', 'kurang berapa',
        'berapa lagi', 'remaining', 'kekurangan', 'belum terpenuhi',
        'harus dipenuhi', 'perlu dipenuhi', 'butuh berapa', 'masih kurang',
        'sisa jumlah', 'sisa target', 'selisih target', 'bisa terpenuhi',
        'target terpenuhi', 'capai target', 'mencapai target', 'belum tercapai',
        'sisa yang', 'ton lagi', 'berapa sisa', 'kekurangan ton'
    ]
    
    is_remaining_question = any(ind in question_lower for ind in remaining_indicators)
    
    if 'maksud saya' in question_lower or 'yang saya maksud' in question_lower:
        if any(word in question_lower for word in ['sisa', 'ton', 'jumlah', 'dipenuhi', 'harus']):
            is_remaining_question = True
    
    production_id = None
    
    id_patterns = [
        r'\b(cm[a-z0-9]{5,})\b',
        r'(?:production\s+)?(?:id\s+)?["\']?(cm[a-z0-9]{5,})["\']?',
        r'(?:id\s+)(cm[a-z0-9]{5,})',
    ]
    
    for pattern in id_patterns:
        id_match = re.search(pattern, question_lower)
        if id_match:
            production_id = id_match.group(1)
            break
    
    if not production_id and context:
        prod_ids = context.get('entities', {}).get('production_ids', [])
        if prod_ids:
            production_id = prod_ids[-1]
    
    return is_remaining_question, production_id

def resolve_production_record_id_from_context(context):
    if not context:
        return None
    candidates = []
    ents = context.get('entities', {}) if isinstance(context, dict) else {}
    for k in ['production_ids', 'site_ids', 'equipment_ids', 'truck_ids', 'excavator_ids']:
        vals = ents.get(k)
        if isinstance(vals, list):
            candidates.extend([v for v in vals if isinstance(v, str)])
    hist = context.get('conversation_history') if isinstance(context, dict) else None
    if isinstance(hist, list):
        for h in hist[-10:]:
            if isinstance(h, dict):
                q = (h.get('question') or '').lower()
                m = re.search(r"\b(cm[a-z0-9]{5,})\b", q)
                if m:
                    candidates.append(m.group(1))
    seen = set()
    ordered = []
    for c in reversed(candidates):
        if c and c not in seen:
            seen.add(c)
            ordered.append(c)
    for cand in ordered:
        try:
            df = fetch_dataframe("SELECT id FROM production_records WHERE id LIKE :pattern LIMIT 1", params={"pattern": f"{cand}%"})
            if not df.empty:
                return str(df.iloc[0].get('id') or cand)
        except Exception:
            continue
    return None

def generate_remaining_production_query(production_id):
    if not production_id:
        return None
    return f"""SELECT id, "recordDate", shift, "targetProduction", "actualProduction", 
("targetProduction" - "actualProduction") as sisa_ton,
ROUND((("actualProduction" / NULLIF("targetProduction", 0)) * 100)::numeric, 2) as achievement_pct
FROM production_records WHERE id LIKE :pattern LIMIT 1"""

def format_remaining_production_answer(df, production_id):
    if df.empty:
        return f"Maaf, tidak ditemukan production record dengan ID yang mengandung '{production_id}'. Silakan periksa kembali ID yang dimaksud."
    
    row = df.iloc[0]
    record_id = row.get('id', 'N/A')
    record_date = str(row.get('recordDate', ''))[:10]
    shift = row.get('shift', 'N/A')
    target = row.get('targetProduction', 0) or 0
    actual = row.get('actualProduction', 0) or 0
    sisa = row.get('sisa_ton', 0) or 0
    achievement = row.get('achievement_pct', 0) or 0
    
    response = f"""## 📊 Analisis Sisa Produksi

**Production Record ID:** `{record_id}`
**Tanggal:** {record_date}
**Shift:** {shift}

### Detail Produksi:
| Parameter | Nilai |
|-----------|-------|
| Target Produksi | **{target:,.2f} ton** |
| Produksi Aktual | **{actual:,.2f} ton** |
| **Sisa yang Harus Dipenuhi** | **{sisa:,.2f} ton** |
| Achievement | {achievement:.1f}% |

### Kesimpulan:
"""
    
    if sisa <= 0:
        response += f"✅ **Target produksi sudah terpenuhi!** Bahkan melebihi target sebanyak **{abs(sisa):,.2f} ton**."
    elif achievement >= 90:
        response += f"📈 Produksi hampir mencapai target. Hanya perlu **{sisa:,.2f} ton** lagi untuk memenuhi target ({100-achievement:.1f}% tersisa)."
    elif achievement >= 50:
        response += f"⚠️ Produksi sudah mencapai {achievement:.1f}% dari target. Masih dibutuhkan **{sisa:,.2f} ton** lagi untuk memenuhi target."
    else:
        response += f"🔴 Produksi masih jauh dari target ({achievement:.1f}%). Dibutuhkan **{sisa:,.2f} ton** lagi untuk memenuhi target produksi."
    
    return response

def detect_production_record_count_by_site(question, context=None):
    q = (question or "").strip()
    ql = q.lower()
    if not any(k in ql for k in ["production record", "production_records", "production", "produksi", "rekap produksi"]):
        return False, None
    if not any(k in ql for k in ["berapa", "jumlah", "total", "ada berapa", "hitung", "count", "rekap", "summary", "overall", "cek"]):
        return False, None
    if "site" not in ql and "lokasi" not in ql and "pit" not in ql and "rom" not in ql:
        return False, None

    site_name = None
    m = re.search(r"\bsite\s+([^?\n\r]+)", q, re.IGNORECASE)
    if m:
        site_name = m.group(1).strip()
    if not site_name:
        m = re.search(r"\blokasi\s+([^?\n\r]+)", q, re.IGNORECASE)
        if m:
            site_name = m.group(1).strip()

    best_name = None
    try:
        df_best = fetch_dataframe(
            "SELECT name FROM mining_sites WHERE :q ILIKE '%' || name || '%' ORDER BY LENGTH(name) DESC LIMIT 1",
            params={"q": q},
        )
        if not df_best.empty:
            best_name = str(df_best.iloc[0].get("name") or "").strip()
            if best_name:
                site_name = best_name
    except Exception:
        pass

    if site_name:
        site_name = re.sub(r"[\s\t]+", " ", site_name)
        stop_m = re.search(r"\b(mohon|tolong|hitung|berapa|jumlah|total|production|record|produksi|dong|ya|sekarang)\b", site_name, re.IGNORECASE)
        if stop_m:
            site_name = site_name[: stop_m.start()].strip()
        site_name = re.sub(r"^(yang\s+ada\s+|yang\s+|ada\s+)", "", site_name, flags=re.IGNORECASE).strip()
        site_name = site_name.strip(" .,!?:;\"'`[](){}")
        if len(site_name) < 2:
            site_name = None

    if not site_name and context:
        names = context.get("entities", {}).get("site_names")
        if names:
            site_name = names[-1]

    return True, site_name

def generate_production_record_count_by_site_query():
    return (
        "SELECT ms.name as site_name, COUNT(pr.id) as total_records, "
        "MIN(pr.\"recordDate\") as first_record_date, MAX(pr.\"recordDate\") as last_record_date "
        "FROM mining_sites ms "
        "LEFT JOIN production_records pr ON pr.\"miningSiteId\" = ms.id "
        "WHERE ms.name ILIKE :pattern "
        "GROUP BY ms.name "
        "ORDER BY total_records DESC "
        "LIMIT 5"
    )

def format_production_record_count_by_site_answer(df, site_name):
    if df.empty:
        return f"Maaf, saya tidak menemukan mining site yang cocok dengan '{site_name}'."
    if len(df) == 1:
        row = df.iloc[0]
        site = row.get("site_name")
        total = int(row.get("total_records") or 0)
        first_date = str(row.get("first_record_date") or "")[:10]
        last_date = str(row.get("last_record_date") or "")[:10]
        if first_date and last_date:
            return f"Jumlah production record untuk site **{site}** adalah **{total:,}** record (periode {first_date} s/d {last_date})."
        return f"Jumlah production record untuk site **{site}** adalah **{total:,}** record."
    lines = [f"Saya menemukan beberapa site yang mirip dengan '{site_name}':", "", "| Site | Total Records | Periode |", "|------|--------------:|---------|"]
    for _, row in df.iterrows():
        site = row.get("site_name")
        total = int(row.get("total_records") or 0)
        first_date = str(row.get("first_record_date") or "")[:10]
        last_date = str(row.get("last_record_date") or "")[:10]
        period = f"{first_date} s/d {last_date}" if first_date and last_date else "-"
        lines.append(f"| {site} | {total:,} | {period} |")
    lines.append("")
    lines.append("Sebutkan nama site yang paling sesuai jika ingin hasil yang spesifik.")
    return "\n".join(lines)

def detect_operator_summary_by_production_record(question, context=None):
    q = (question or "").strip()
    ql = q.lower()
    if "production" not in ql and "produksi" not in ql:
        return False, None
    if "record" not in ql:
        return False, None
    if "operator" not in ql:
        return False, None
    if "id" not in ql and not re.search(r"\bcm[a-z0-9]{5,}\b", ql):
        return False, None

    pr_id = None
    m = re.search(r"\b(cm[a-z0-9]{5,})\b", ql)
    if m:
        pr_id = m.group(1)
    if not pr_id and context:
        prod_ids = context.get('entities', {}).get('production_ids', [])
        if prod_ids:
            pr_id = prod_ids[-1]
    return True, pr_id

def generate_operator_summary_by_production_record_query():
    return (
        "WITH pr AS ("
        " SELECT id, \"recordDate\", shift, \"miningSiteId\" "
        " FROM production_records "
        " WHERE id LIKE :pr_pattern "
        " ORDER BY id "
        " LIMIT 1"
        ") "
        "SELECT pr.id as production_record_id, ms.name as site_name, pr.\"recordDate\" as record_date, pr.shift as shift, "
        "u.\"fullName\" as operator_name, u.username as operator_username, o.\"employeeNumber\" as employee_number, "
        "COUNT(ha.id) as total_activities "
        "FROM pr "
        "JOIN mining_sites ms ON ms.id = pr.\"miningSiteId\" "
        "LEFT JOIN hauling_activities ha ON ha.shift = pr.shift AND (ha.\"loadingStartTime\"::date = pr.\"recordDate\") "
        "LEFT JOIN loading_points lp ON lp.id = ha.\"loadingPointId\" AND lp.\"miningSiteId\" = pr.\"miningSiteId\" "
        "LEFT JOIN operators o ON o.id = ha.\"operatorId\" "
        "LEFT JOIN users u ON u.id = o.\"userId\" "
        "WHERE ha.id IS NULL OR lp.id IS NOT NULL "
        "GROUP BY pr.id, ms.name, pr.\"recordDate\", pr.shift, u.\"fullName\", u.username, o.\"employeeNumber\" "
        "ORDER BY total_activities DESC NULLS LAST, operator_name ASC NULLS LAST"
    )

def format_operator_summary_by_production_record_answer(df, production_id):
    if df.empty:
        return f"Maaf, tidak ditemukan production record dengan ID yang mengandung '{production_id}'."
    base = df.iloc[0]
    record_id = base.get("production_record_id")
    site_name = base.get("site_name")
    record_date = str(base.get("record_date") or "")[:10]
    shift = base.get("shift")

    has_any_activity = False
    rows = []
    for _, r in df.iterrows():
        operator_name = r.get("operator_name")
        total = int(r.get("total_activities") or 0)
        if operator_name and total > 0:
            has_any_activity = True
            rows.append((operator_name, r.get("operator_username"), r.get("employee_number"), total))

    header = f"Operator yang mengerjakan production record **{record_id}** (site **{site_name}**, {record_date}, {shift}):"
    if not has_any_activity:
        return header + "\n\nTidak ditemukan hauling activity yang terhubung pada periode/shift/site tersebut."

    lines = [header, "", "| Operator | Username | Employee No | Total |", "|----------|----------|-------------|------:|"]
    for operator_name, operator_username, employee_number, total in rows:
        lines.append(f"| {operator_name} | {operator_username or '-'} | {employee_number or '-'} | {total:,} |")
    lines.append("")
    lines.append(f"Total operator: **{len(rows)}**")
    return "\n".join(lines)

def detect_truck_usage_by_unit(question, context=None):
    q = (question or "").strip()
    ql = q.lower()
    if "truck" not in ql and "truk" not in ql:
        return False, None
    if not any(k in ql for k in ["kapasitas", "capacity", "jumlah", "berapa", "total"]):
        return False, None
    if "id" not in ql and not re.search(r"\bcm[a-z0-9]{5,}\b", ql):
        return False, None
    if "unit" not in ql and "site" not in ql and "lokasi" not in ql and "pit" not in ql and "rom" not in ql:
        return False, None

    unit_id = None
    m = re.search(r"\b(cm[a-z0-9]{5,})\b", ql)
    if m:
        unit_id = m.group(1)
    if not unit_id and context:
        ids = context.get('entities', {}).get('site_ids')
        if ids:
            unit_id = ids[-1]
    return True, unit_id

def generate_truck_usage_by_unit_query():
    return (
        "WITH unit AS ("
        " SELECT 'mining_site'::text as unit_type, ms.id as unit_id, ms.name as unit_name, ms.id as mining_site_id "
        " FROM mining_sites ms WHERE ms.id LIKE :unit_pattern "
        " UNION ALL "
        " SELECT 'loading_point'::text, lp.id, lp.name, lp.\"miningSiteId\" "
        " FROM loading_points lp WHERE lp.id LIKE :unit_pattern "
        " UNION ALL "
        " SELECT 'dumping_point'::text, dp.id, dp.name, dp.\"miningSiteId\" "
        " FROM dumping_points dp WHERE dp.id LIKE :unit_pattern "
        " UNION ALL "
        " SELECT 'road_segment'::text, rs.id, rs.name, rs.\"miningSiteId\" "
        " FROM road_segments rs WHERE rs.id LIKE :unit_pattern "
        " LIMIT 1"
        "), "
        "trucks_used AS ("
        " SELECT DISTINCT t.id, t.capacity "
        " FROM unit "
        " JOIN hauling_activities ha ON ("
        "   (unit.unit_type = 'loading_point' AND ha.\"loadingPointId\" = unit.unit_id) OR "
        "   (unit.unit_type = 'dumping_point' AND ha.\"dumpingPointId\" = unit.unit_id) OR "
        "   (unit.unit_type = 'road_segment' AND ha.\"roadSegmentId\" = unit.unit_id) OR "
        "   (unit.unit_type = 'mining_site')"
        " ) "
        " JOIN loading_points lp ON lp.id = ha.\"loadingPointId\" "
        " JOIN trucks t ON t.id = ha.\"truckId\" "
        " WHERE unit.unit_type <> 'mining_site' OR lp.\"miningSiteId\" = unit.mining_site_id"
        "), "
        "time_range AS ("
        " SELECT MIN(ha.\"loadingStartTime\") as first_time, MAX(ha.\"loadingStartTime\") as last_time "
        " FROM unit "
        " JOIN hauling_activities ha ON ("
        "   (unit.unit_type = 'loading_point' AND ha.\"loadingPointId\" = unit.unit_id) OR "
        "   (unit.unit_type = 'dumping_point' AND ha.\"dumpingPointId\" = unit.unit_id) OR "
        "   (unit.unit_type = 'road_segment' AND ha.\"roadSegmentId\" = unit.unit_id) OR "
        "   (unit.unit_type = 'mining_site')"
        " ) "
        " JOIN loading_points lp ON lp.id = ha.\"loadingPointId\" "
        " WHERE unit.unit_type <> 'mining_site' OR lp.\"miningSiteId\" = unit.mining_site_id"
        ") "
        "SELECT unit.unit_type, unit.unit_id, unit.unit_name, "
        "(SELECT COUNT(*) FROM trucks_used) as total_trucks, "
        "(SELECT COALESCE(SUM(capacity), 0) FROM trucks_used) as total_capacity, "
        "time_range.first_time, time_range.last_time "
        "FROM unit, time_range"
    )

def format_truck_usage_by_unit_answer(df, unit_id):
    if df.empty:
        return f"Maaf, saya tidak menemukan unit/site dengan ID yang mengandung '{unit_id}'."
    row = df.iloc[0]
    unit_type = row.get("unit_type")
    unit_real_id = row.get("unit_id")
    unit_name = row.get("unit_name")
    total_trucks = int(row.get("total_trucks") or 0)
    total_capacity = float(row.get("total_capacity") or 0)
    first_time = str(row.get("first_time") or "")[:19]
    last_time = str(row.get("last_time") or "")[:19]
    unit_label = "unit"
    if unit_type == "mining_site":
        unit_label = "site"
    elif unit_type == "loading_point":
        unit_label = "loading point"
    elif unit_type == "dumping_point":
        unit_label = "dumping point"
    elif unit_type == "road_segment":
        unit_label = "road segment"
    if first_time and last_time:
        period = f"(periode {first_time} s/d {last_time})"
    else:
        period = ""
    return (
        f"Jumlah truck yang dipakai pada {unit_label} **{unit_name}** ({unit_real_id}) adalah **{total_trucks:,}** unit "
        f"dengan total kapasitas **{total_capacity:,.2f} ton** {period}."
    )

def detect_hauling_summary_question(question, context=None):
    q = (question or "").strip()
    ql = q.lower()
    if "hauling" not in ql and "trip" not in ql and "perjalanan" not in ql and "angkut" not in ql:
        return False, None
    summary_words = ["ringkasan", "summary", "rekap", "tampilkan", "lihat", "berapa", "total", "statistik", "laporan"]
    if not any(w in ql for w in summary_words):
        return False, None
    period = "today"
    if "minggu" in ql or "week" in ql:
        period = "week"
    elif "bulan" in ql or "month" in ql:
        period = "month"
    elif "kemarin" in ql or "yesterday" in ql:
        period = "yesterday"
    elif "hari ini" in ql or "today" in ql or "sekarang" in ql:
        period = "today"
    return True, period

def generate_hauling_summary_query(period):
    date_filter = ""
    if period == "today":
        date_filter = "\"loadingStartTime\"::date = CURRENT_DATE"
    elif period == "yesterday":
        date_filter = "\"loadingStartTime\"::date = CURRENT_DATE - INTERVAL '1 day'"
    elif period == "week":
        date_filter = "\"loadingStartTime\" >= CURRENT_DATE - INTERVAL '7 days'"
    elif period == "month":
        date_filter = "\"loadingStartTime\" >= CURRENT_DATE - INTERVAL '30 days'"
    else:
        date_filter = "\"loadingStartTime\"::date = CURRENT_DATE"
    return (
        f"WITH ha AS (SELECT * FROM hauling_activities WHERE {date_filter}), "
        "summary AS ("
        " SELECT COUNT(*) as total_trips, "
        " COALESCE(SUM(\"loadWeight\"), 0) as total_tonnage, "
        " COALESCE(AVG(distance), 0) as avg_distance, "
        " COUNT(*) FILTER (WHERE \"isDelayed\" = true) as delayed_trips "
        " FROM ha"
        "), "
        "delay_cats AS ("
        " SELECT dr.category as delay_category, COUNT(*) as cat_count "
        " FROM ha "
        " JOIN delay_reasons dr ON dr.id = ha.\"delayReasonId\" "
        " WHERE ha.\"isDelayed\" = true "
        " GROUP BY dr.category "
        " ORDER BY cat_count DESC"
        ") "
        "SELECT s.total_trips, s.total_tonnage, s.avg_distance, s.delayed_trips, "
        "CASE WHEN s.total_trips > 0 THEN ROUND((s.delayed_trips::numeric / s.total_trips) * 100, 2) ELSE 0 END as delay_pct, "
        "(SELECT COALESCE(json_agg(row_to_json(dc)), '[]'::json) FROM delay_cats dc) as delay_categories "
        "FROM summary s"
    )

def format_hauling_summary_answer(df, period):
    period_label = {
        "today": "hari ini",
        "yesterday": "kemarin",
        "week": "7 hari terakhir",
        "month": "30 hari terakhir",
    }.get(period, "hari ini")
    if df.empty:
        return f"Tidak ada data hauling untuk periode {period_label}."
    row = df.iloc[0]
    total_trips = int(row.get("total_trips") or 0)
    total_tonnage = float(row.get("total_tonnage") or 0)
    avg_distance = float(row.get("avg_distance") or 0)
    delayed_trips = int(row.get("delayed_trips") or 0)
    delay_pct = float(row.get("delay_pct") or 0)
    delay_cats_raw = row.get("delay_categories")
    delay_cats = []
    if delay_cats_raw:
        if isinstance(delay_cats_raw, str):
            try:
                delay_cats = json.loads(delay_cats_raw)
            except Exception:
                delay_cats = []
        elif isinstance(delay_cats_raw, list):
            delay_cats = delay_cats_raw
    lines = [
        f"## 📊 Ringkasan Aktivitas Hauling ({period_label.capitalize()})",
        "",
        "| Metrik | Nilai |",
        "|--------|------:|",
        f"| Total Trip (Perjalanan) | **{total_trips:,}** kali |",
        f"| Total Tonase | **{total_tonnage:,.2f}** ton |",
        f"| Rata-rata Jarak Tempuh | **{avg_distance:,.2f}** km |",
        f"| Trip Mengalami Delay | **{delayed_trips:,}** ({delay_pct:.2f}%) |",
        "",
    ]
    if delay_cats:
        lines.append("### Kategori Penyebab Delay:")
        lines.append("| Kategori | Jumlah |")
        lines.append("|----------|-------:|")
        for dc in delay_cats:
            cat = dc.get("delay_category") or "UNKNOWN"
            cnt = int(dc.get("cat_count") or 0)
            lines.append(f"| {cat} | {cnt:,} |")
        lines.append("")
    else:
        if delayed_trips > 0:
            lines.append("*Kategori delay tidak tercatat.*")
            lines.append("")
    return "\n".join(lines)

def detect_production_summary_question(question, context=None):
    q = (question or "").strip()
    ql = q.lower()
    has_production = "produksi" in ql or "production" in ql or "batubara" in ql
    has_target = "target" in ql or "perbandingan" in ql or "comparison" in ql
    has_efficiency = "efisiensi" in ql or "efficiency" in ql or "utilisasi" in ql or "utilization" in ql or "cycle time" in ql or "loading" in ql
    if has_production and (has_target or has_efficiency):
        return True, "today"
    return False, None

def generate_production_summary_query():
    return (
        "WITH prod AS ("
        " SELECT COALESCE(SUM(\"actualProduction\"), 0) as total_actual, "
        " COALESCE(SUM(\"targetProduction\"), 0) as total_target, "
        " COALESCE(AVG(\"avgCycleTime\"), 0) as avg_cycle_time, "
        " COALESCE(AVG(\"utilizationRate\"), 0) as avg_utilization "
        " FROM production_records WHERE \"recordDate\" = CURRENT_DATE"
        "), "
        "hauling AS ("
        " SELECT COALESCE(AVG(\"totalCycleTime\"), 0) as ha_avg_cycle, "
        " COALESCE(AVG(\"loadEfficiency\"), 0) as ha_load_eff, "
        " COUNT(*) as trip_count "
        " FROM hauling_activities WHERE \"loadingStartTime\"::date = CURRENT_DATE"
        "), "
        "trucks AS ("
        " SELECT COUNT(*) FILTER (WHERE status = 'HAULING' OR status = 'LOADING' OR status = 'DUMPING') as active_trucks, "
        " COUNT(*) as total_trucks "
        " FROM trucks WHERE \"isActive\" = true"
        ") "
        "SELECT prod.total_actual, prod.total_target, "
        "CASE WHEN prod.total_target > 0 THEN ROUND(((prod.total_actual::numeric / prod.total_target::numeric) * 100), 2) ELSE 0 END as achievement_pct, "
        "COALESCE(NULLIF(prod.avg_cycle_time, 0), hauling.ha_avg_cycle) as avg_cycle_time, "
        "COALESCE(NULLIF(prod.avg_utilization, 0), CASE WHEN trucks.total_trucks > 0 THEN ROUND((trucks.active_trucks::numeric / trucks.total_trucks) * 100, 2) ELSE 0 END) as truck_utilization, "
        "COALESCE(hauling.ha_load_eff * 100, 0) as loading_efficiency, "
        "hauling.trip_count "
        "FROM prod, hauling, trucks"
    )

def format_production_summary_answer(df):
    if df.empty:
        return "Tidak ada data produksi untuk hari ini."
    row = df.iloc[0]
    total_actual = float(row.get("total_actual") or 0)
    total_target = float(row.get("total_target") or 0)
    achievement_pct = float(row.get("achievement_pct") or 0)
    avg_cycle_time = float(row.get("avg_cycle_time") or 0)
    truck_util = float(row.get("truck_utilization") or 0)
    loading_eff = float(row.get("loading_efficiency") or 0)
    trip_count = int(row.get("trip_count") or 0)
    status_icon = "✅" if achievement_pct >= 100 else ("⚠️" if achievement_pct >= 80 else "🔴")
    lines = [
        "## 📊 Ringkasan Produksi Batubara Hari Ini",
        "",
        "### Produksi vs Target",
        "| Metrik | Nilai |",
        "|--------|------:|",
        f"| Total Produksi Aktual | **{total_actual:,.2f}** ton |",
        f"| Target Produksi | **{total_target:,.2f}** ton |",
        f"| Achievement | {status_icon} **{achievement_pct:.2f}%** |",
        "",
        "### Metrik Operasional",
        "| Metrik | Nilai |",
        "|--------|------:|",
        f"| Rata-rata Cycle Time | **{avg_cycle_time:,.1f}** menit |",
        f"| Utilisasi Truk | **{truck_util:.2f}%** |",
        f"| Efisiensi Loading | **{loading_eff:.2f}%** |",
        f"| Total Trip Hari Ini | **{trip_count:,}** trip |",
        "",
    ]
    if achievement_pct >= 100:
        lines.append("✅ **Target produksi tercapai!**")
    elif achievement_pct >= 80:
        gap = total_target - total_actual
        lines.append(f"⚠️ Produksi mendekati target. Masih kurang **{gap:,.2f} ton** untuk memenuhi target.")
    else:
        gap = total_target - total_actual
        lines.append(f"🔴 Produksi masih di bawah target. Dibutuhkan **{gap:,.2f} ton** lagi.")
    return "\n".join(lines)

def detect_fleet_status_question(question, context=None):
    q = (question or "").strip()
    ql = q.lower()
    has_fleet = "armada" in ql or "fleet" in ql or ("truk" in ql and "excavator" in ql) or ("truck" in ql and "excavator" in ql)
    has_status = "status" in ql or "aktif" in ql or "active" in ql or "idle" in ql or "maintenance" in ql or "perawatan" in ql
    has_count = "jumlah" in ql or "berapa" in ql or "total" in ql or "count" in ql
    if has_fleet or (has_status and has_count and ("truk" in ql or "truck" in ql or "excavator" in ql)):
        return True
    return False

def generate_fleet_status_query():
    return (
        "WITH truck_status AS ("
        " SELECT status::text, COUNT(*) as cnt FROM trucks WHERE \"isActive\" = true GROUP BY status"
        "), "
        "exc_status AS ("
        " SELECT status::text, COUNT(*) as cnt FROM excavators WHERE \"isActive\" = true GROUP BY status"
        "), "
        "truck_summary AS ("
        " SELECT "
        " COALESCE(SUM(cnt) FILTER (WHERE status IN ('HAULING', 'LOADING', 'DUMPING', 'IN_QUEUE', 'REFUELING')), 0) as truck_active, "
        " COALESCE(SUM(cnt) FILTER (WHERE status IN ('IDLE', 'STANDBY')), 0) as truck_idle, "
        " COALESCE(SUM(cnt) FILTER (WHERE status IN ('MAINTENANCE', 'BREAKDOWN', 'OUT_OF_SERVICE')), 0) as truck_maintenance, "
        " COALESCE(SUM(cnt), 0) as truck_total "
        " FROM truck_status"
        "), "
        "exc_summary AS ("
        " SELECT "
        " COALESCE(SUM(cnt) FILTER (WHERE status = 'ACTIVE'), 0) as exc_active, "
        " COALESCE(SUM(cnt) FILTER (WHERE status IN ('IDLE', 'STANDBY')), 0) as exc_idle, "
        " COALESCE(SUM(cnt) FILTER (WHERE status IN ('MAINTENANCE', 'BREAKDOWN', 'OUT_OF_SERVICE')), 0) as exc_maintenance, "
        " COALESCE(SUM(cnt), 0) as exc_total "
        " FROM exc_status"
        "), "
        "top_trucks AS ("
        " SELECT id, code, name, \"totalHours\", \"lastMaintenance\" "
        " FROM trucks WHERE \"isActive\" = true ORDER BY \"totalHours\" DESC NULLS LAST LIMIT 5"
        "), "
        "top_excavators AS ("
        " SELECT id, code, name, \"totalHours\", \"lastMaintenance\" "
        " FROM excavators WHERE \"isActive\" = true ORDER BY \"totalHours\" DESC NULLS LAST LIMIT 5"
        ") "
        "SELECT ts.truck_active, ts.truck_idle, ts.truck_maintenance, ts.truck_total, "
        "es.exc_active, es.exc_idle, es.exc_maintenance, es.exc_total, "
        "(SELECT json_agg(row_to_json(tt)) FROM top_trucks tt) as top_trucks_json, "
        "(SELECT json_agg(row_to_json(te)) FROM top_excavators te) as top_excavators_json "
        "FROM truck_summary ts, exc_summary es"
    )

def format_fleet_status_answer(df):
    if df.empty:
        return "Tidak dapat memuat data status armada."
    row = df.iloc[0]
    truck_active = int(row.get("truck_active") or 0)
    truck_idle = int(row.get("truck_idle") or 0)
    truck_maint = int(row.get("truck_maintenance") or 0)
    truck_total = int(row.get("truck_total") or 0)
    exc_active = int(row.get("exc_active") or 0)
    exc_idle = int(row.get("exc_idle") or 0)
    exc_maint = int(row.get("exc_maintenance") or 0)
    exc_total = int(row.get("exc_total") or 0)
    top_trucks_raw = row.get("top_trucks_json")
    top_exc_raw = row.get("top_excavators_json")
    top_trucks = []
    top_exc = []
    if top_trucks_raw:
        if isinstance(top_trucks_raw, str):
            try:
                top_trucks = json.loads(top_trucks_raw)
            except Exception:
                pass
        elif isinstance(top_trucks_raw, list):
            top_trucks = top_trucks_raw
    if top_exc_raw:
        if isinstance(top_exc_raw, str):
            try:
                top_exc = json.loads(top_exc_raw)
            except Exception:
                pass
        elif isinstance(top_exc_raw, list):
            top_exc = top_exc_raw
    lines = [
        "## 🚛 Status Armada & Perawatan",
        "",
        "### Status Truk",
        "| Status | Jumlah |",
        "|--------|-------:|",
        f"| 🟢 Aktif (Beroperasi) | **{truck_active:,}** |",
        f"| 🟡 Idle/Standby | **{truck_idle:,}** |",
        f"| 🔧 Maintenance/Breakdown | **{truck_maint:,}** |",
        f"| **Total** | **{truck_total:,}** |",
        "",
        "### Status Excavator",
        "| Status | Jumlah |",
        "|--------|-------:|",
        f"| 🟢 Aktif (Beroperasi) | **{exc_active:,}** |",
        f"| 🟡 Idle/Standby | **{exc_idle:,}** |",
        f"| 🔧 Maintenance/Breakdown | **{exc_maint:,}** |",
        f"| **Total** | **{exc_total:,}** |",
        "",
    ]
    if top_trucks:
        lines.append("### 🔝 Top 5 Truk dengan Jam Operasi Tertinggi (Perlu Perawatan)")
        lines.append("| Kode | Nama | Total Jam | Last Maintenance |")
        lines.append("|------|------|----------:|------------------|")
        for t in top_trucks[:5]:
            code = t.get("code") or "-"
            name = t.get("name") or "-"
            hours = int(t.get("totalHours") or 0)
            last_m = str(t.get("lastMaintenance") or "-")[:10]
            lines.append(f"| {code} | {name} | {hours:,} | {last_m} |")
        lines.append("")
    if top_exc:
        lines.append("### 🔝 Top 5 Excavator dengan Jam Operasi Tertinggi (Perlu Perawatan)")
        lines.append("| Kode | Nama | Total Jam | Last Maintenance |")
        lines.append("|------|------|----------:|------------------|")
        for e in top_exc[:5]:
            code = e.get("code") or "-"
            name = e.get("name") or "-"
            hours = int(e.get("totalHours") or 0)
            last_m = str(e.get("lastMaintenance") or "-")[:10]
            lines.append(f"| {code} | {name} | {hours:,} | {last_m} |")
        lines.append("")
    return "\n".join(lines)

# ============================================================================
# MINING OPERATIONS KNOWLEDGE BASE
# Real operational parameters based on database statistics
# ============================================================================

MINING_KNOWLEDGE = {
    # Fleet Statistics (from database)
    "fleet": {
        "total_trucks": 601,
        "avg_truck_capacity": 29.33,  # tons
        "max_truck_capacity": 39.0,   # tons
        "min_truck_capacity": 20.0,   # tons
        "total_excavators": 603,
        "avg_bucket_capacity": 10.63,  # cubic meters
        "avg_excavator_production_rate": 5.0,  # tons/min
        "avg_excavator_fuel_consumption": 50.0,  # L/hour
    },
    
    # Hauling Performance Metrics (from database)
    "hauling": {
        "avg_load_weight": 24.13,      # tons per trip
        "avg_distance": 3.87,          # km one way
        "avg_cycle_time": 65.0,        # minutes (full cycle)
        "avg_queue_time": 10.0,        # minutes
        "avg_loading_time": 12.0,      # minutes
        "avg_hauling_time": 18.0,      # minutes (one way)
        "avg_dumping_time": 8.0,       # minutes
        "avg_return_time": 17.0,       # minutes
        "load_efficiency": 0.82,       # 82% of capacity utilized
    },
    
    # Production Metrics (from database)
    "production": {
        "avg_daily_target": 10060,     # tons per day
        "avg_daily_actual": 8993,      # tons per day
        "avg_achievement": 89.5,       # percentage
        "avg_trucks_operating": 10,    # per shift
        "avg_excavators_operating": 8, # per shift
        "avg_utilization_rate": 76.0,  # percentage
    },
    
    # Cost Parameters (industry standard)
    "costs": {
        "fuel_price_per_liter": 15000,   # IDR (solar/diesel)
        "truck_fuel_consumption": 0.8,    # L/km
        "operator_cost_per_hour": 150000, # IDR
        "maintenance_cost_per_hour": 50000, # IDR per truck
        "overhead_cost_per_hour": 100000,  # IDR
    },
    
    # Revenue Parameters (industry standard)
    "revenue": {
        "coal_price_per_ton": 1500000,   # IDR (base price ~$90/ton)
        "premium_coal_price": 1800000,   # IDR (high calorie)
        "low_grade_coal_price": 1200000, # IDR (low calorie)
        "avg_calorie": 5200,             # kcal/kg (GAR)
    },
    
    # Operational Constraints
    "constraints": {
        "max_trucks_per_excavator": 6,
        "shift_duration_hours": 8,
        "shifts_per_day": 3,
        "max_operating_hours_per_day": 22,  # accounting for shift changes
        "weather_impact_factor": 0.85,  # 15% reduction in rainy season
    }
}

def get_operational_stats():
    """Fetch real-time operational statistics from database"""
    stats = {}
    
    try:
        # Get truck availability
        truck_df = fetch_dataframe("""
            SELECT status, COUNT(*) as count 
            FROM trucks 
            WHERE "isActive" = true 
            GROUP BY status
        """)
        stats['truck_status'] = truck_df.to_dict('records') if not truck_df.empty else []
        
        # Get excavator availability  
        exc_df = fetch_dataframe("""
            SELECT status, COUNT(*) as count 
            FROM excavators 
            WHERE "isActive" = true 
            GROUP BY status
        """)
        stats['excavator_status'] = exc_df.to_dict('records') if not exc_df.empty else []
        
        # Get recent production performance
        prod_df = fetch_dataframe("""
            SELECT AVG("actualProduction") as avg_production,
                   AVG(achievement) as avg_achievement
            FROM production_records
            WHERE "recordDate" >= CURRENT_DATE - INTERVAL '7 days'
        """)
        if not prod_df.empty:
            stats['recent_avg_production'] = float(prod_df['avg_production'].iloc[0] or MINING_KNOWLEDGE['production']['avg_daily_actual'])
            stats['recent_achievement'] = float(prod_df['avg_achievement'].iloc[0] or MINING_KNOWLEDGE['production']['avg_achievement'])
        
        # Get average cycle time from recent hauling
        cycle_df = fetch_dataframe("""
            SELECT AVG("totalCycleTime") as avg_cycle,
                   AVG("loadWeight") as avg_load
            FROM hauling_activities
            WHERE "createdAt" >= CURRENT_DATE - INTERVAL '7 days'
            AND "totalCycleTime" > 0
        """)
        if not cycle_df.empty:
            stats['recent_avg_cycle_time'] = float(cycle_df['avg_cycle'].iloc[0] or MINING_KNOWLEDGE['hauling']['avg_cycle_time'])
            stats['recent_avg_load'] = float(cycle_df['avg_load'].iloc[0] or MINING_KNOWLEDGE['hauling']['avg_load_weight'])
            
    except Exception as e:
        print(f"Warning: Could not fetch real-time stats: {e}")
        
    return stats

def calculate_production_simulation(num_trucks, target_tons, distance_km=None, truck_capacity=None):
    """
    Calculate production simulation based on truck allocation
    Returns estimated time, trips, fuel, and costs
    """
    # Use defaults if not provided
    if distance_km is None:
        distance_km = MINING_KNOWLEDGE['hauling']['avg_distance']
    if truck_capacity is None:
        truck_capacity = MINING_KNOWLEDGE['fleet']['avg_truck_capacity']
    
    # Load per trip (accounting for efficiency)
    load_per_trip = truck_capacity * MINING_KNOWLEDGE['hauling']['load_efficiency']
    
    # Cycle time calculation (in minutes)
    base_cycle = MINING_KNOWLEDGE['hauling']['avg_cycle_time']
    # Adjust for distance (proportional)
    distance_factor = distance_km / MINING_KNOWLEDGE['hauling']['avg_distance']
    adjusted_cycle = base_cycle * (0.5 + 0.5 * distance_factor)  # 50% fixed, 50% distance-variable
    
    # Trips needed
    total_trips = math.ceil(target_tons / load_per_trip)
    trips_per_truck = math.ceil(total_trips / num_trucks)
    
    # Time calculation
    total_time_minutes = trips_per_truck * adjusted_cycle
    total_time_hours = total_time_minutes / 60
    
    # Actual production (accounting for 82% efficiency)
    actual_production = total_trips * load_per_trip
    
    # Fuel calculation
    total_distance = total_trips * distance_km * 2  # round trip
    fuel_consumed = total_distance * MINING_KNOWLEDGE['costs']['truck_fuel_consumption']
    
    # Cost calculation
    fuel_cost = fuel_consumed * MINING_KNOWLEDGE['costs']['fuel_price_per_liter']
    operator_cost = num_trucks * total_time_hours * MINING_KNOWLEDGE['costs']['operator_cost_per_hour']
    maintenance_cost = num_trucks * total_time_hours * MINING_KNOWLEDGE['costs']['maintenance_cost_per_hour']
    overhead_cost = total_time_hours * MINING_KNOWLEDGE['costs']['overhead_cost_per_hour']
    total_cost = fuel_cost + operator_cost + maintenance_cost + overhead_cost
    
    # Revenue calculation
    revenue = actual_production * MINING_KNOWLEDGE['revenue']['coal_price_per_ton']
    
    # Profit
    profit = revenue - total_cost
    profit_margin = (profit / revenue * 100) if revenue > 0 else 0
    
    return {
        "input": {
            "num_trucks": num_trucks,
            "target_tons": target_tons,
            "distance_km": distance_km,
            "truck_capacity": truck_capacity
        },
        "production": {
            "total_trips": total_trips,
            "trips_per_truck": trips_per_truck,
            "load_per_trip": round(load_per_trip, 2),
            "actual_production": round(actual_production, 2),
            "efficiency": round(actual_production / target_tons * 100, 1)
        },
        "time": {
            "cycle_time_minutes": round(adjusted_cycle, 1),
            "total_time_minutes": round(total_time_minutes, 1),
            "total_time_hours": round(total_time_hours, 2),
            "shifts_needed": math.ceil(total_time_hours / 8)
        },
        "resources": {
            "total_distance_km": round(total_distance, 2),
            "fuel_consumed_liters": round(fuel_consumed, 2)
        },
        "financials": {
            "fuel_cost": round(fuel_cost),
            "operator_cost": round(operator_cost),
            "maintenance_cost": round(maintenance_cost),
            "overhead_cost": round(overhead_cost),
            "total_cost": round(total_cost),
            "revenue": round(revenue),
            "profit": round(profit),
            "profit_margin_percent": round(profit_margin, 1)
        }
    }

def detect_question_type(question):
    """
    Detect what type of question is being asked
    Returns: 'simulation', 'query', 'analysis', 'general'
    """
    question_lower = question.lower()
    
    # Simulation patterns
    simulation_keywords = [
        'jika', 'bila', 'kalau', 'seandainya', 'misalkan', 'simulasi',
        'kira-kira', 'estimasi', 'perkirakan', 'prediksi',
        'alokasi', 'alokasikan', 'target', 'berapa lama', 'butuh waktu',
        'keuntungan', 'profit', 'biaya', 'cost',
        'optimal', 'efisien', 'terbaik', 'rekomendasi'
    ]
    
    # Analysis patterns
    analysis_keywords = [
        'bandingkan', 'compare', 'tren', 'trend', 'analisis', 'analysis',
        'performa', 'performance', 'produktivitas', 'efisiensi',
        'rata-rata', 'average', 'total', 'ringkasan', 'summary'
    ]
    
    # Check for simulation
    if any(kw in question_lower for kw in simulation_keywords):
        # Additional check for numbers/targets
        if re.search(r'\d+\s*(ton|truk|truck|unit|jam|hour)', question_lower):
            return 'simulation'
    
    # Check for analysis
    if any(kw in question_lower for kw in analysis_keywords):
        return 'analysis'
    
    # Default to database query
    return 'query'

def parse_simulation_parameters(question):
    """
    Extract simulation parameters from natural language question
    """
    params = {}
    question_lower = question.lower()
    
    # Extract number of trucks
    truck_patterns = [
        r'(\d+)\s*(?:unit\s*)?(?:truk|truck)',
        r'(?:truk|truck)\s*(\d+)',
        r'(\d+)\s*(?:unit)',
        r'(?:alokasi|pakai|gunakan)\s*(\d+)'
    ]
    for pattern in truck_patterns:
        match = re.search(pattern, question_lower)
        if match:
            params['num_trucks'] = int(match.group(1))
            break
    
    # Extract truck codes (A-F style)
    truck_code_match = re.search(r'truk\s*([A-Za-z])\s*(?:-|sampai|hingga|to)\s*([A-Za-z])', question_lower)
    if truck_code_match:
        start = ord(truck_code_match.group(1).upper())
        end = ord(truck_code_match.group(2).upper())
        params['num_trucks'] = end - start + 1
        params['truck_codes'] = f"{truck_code_match.group(1).upper()}-{truck_code_match.group(2).upper()}"
    
    # Extract target production
    target_patterns = [
        r'target\s*(?:produksi\s*)?(\d+(?:[.,]\d+)?)\s*(?:ton)',
        r'(\d+(?:[.,]\d+)?)\s*ton',
        r'produksi\s*(\d+(?:[.,]\d+)?)',
    ]
    for pattern in target_patterns:
        match = re.search(pattern, question_lower)
        if match:
            params['target_tons'] = float(match.group(1).replace(',', '.'))
            break
    
    # Extract distance
    distance_match = re.search(r'(\d+(?:[.,]\d+)?)\s*(?:km|kilometer)', question_lower)
    if distance_match:
        params['distance_km'] = float(distance_match.group(1).replace(',', '.'))
    
    # Extract site/location
    site_match = re.search(r'(?:site|pit|lokasi|tambang)\s*([A-Za-z0-9]+)', question_lower)
    if site_match:
        params['site'] = site_match.group(1)
    
    return params

FULL_DATABASE_SCHEMA = """
=== MINING OPERATIONS DATABASE - COMPLETE SCHEMA ===
Total: 29 tables, comprehensive mining operations system

[COMPLETE TABLE DEFINITIONS WITH EXACT COLUMN NAMES]

1. trucks (601 rows) - Armada truk hauling
   COLUMNS: id, code, name, brand, model, "yearManufacture", capacity, "fuelCapacity", "fuelConsumption", "averageSpeed", "maintenanceCost", status, "lastMaintenance", "nextMaintenance", "totalHours", "totalDistance", "currentOperatorId", "currentLocation", "isActive", "purchaseDate", "retirementDate", remarks, "createdAt", "updatedAt"
   STATUS ENUM: 'IDLE', 'HAULING', 'LOADING', 'DUMPING', 'IN_QUEUE', 'MAINTENANCE', 'BREAKDOWN', 'REFUELING', 'STANDBY', 'OUT_OF_SERVICE'
   
2. excavators (603 rows) - Excavator untuk loading
   COLUMNS: id, code, name, brand, model, "yearManufacture", "bucketCapacity", "productionRate", "fuelConsumption", "maintenanceCost", status, "lastMaintenance", "nextMaintenance", "totalHours", "currentLocation", "isActive", "purchaseDate", "retirementDate", remarks, "createdAt", "updatedAt"
   STATUS ENUM: 'ACTIVE', 'IDLE', 'MAINTENANCE', 'BREAKDOWN', 'STANDBY', 'OUT_OF_SERVICE'

3. operators (482 rows) - Operator alat berat
   COLUMNS: id, "userId", "employeeNumber", "licenseNumber", "licenseType", "licenseExpiry", competency, status, shift, "totalHours", rating, salary, "joinDate", "resignDate", "createdAt", "updatedAt"
   LICENSE ENUM: 'SIM_A', 'SIM_B1', 'SIM_B2', 'OPERATOR_ALAT_BERAT'
   STATUS ENUM: 'ACTIVE', 'ON_LEAVE', 'SICK', 'RESIGNED', 'SUSPENDED'
   SHIFT ENUM: 'SHIFT_1', 'SHIFT_2', 'SHIFT_3'

4. users (605 rows) - Pengguna sistem
   COLUMNS: id, username, email, password, "fullName", role, "isActive", "lastLogin", "createdAt", "updatedAt"
   ROLE ENUM: 'ADMIN', 'SUPERVISOR', 'OPERATOR', 'DISPATCHER', 'MAINTENANCE_STAFF'

5. hauling_activities (747 rows) - Aktivitas hauling batubara
    COLUMNS: id, "activityNumber", "truckId", "excavatorId", "operatorId", "excavatorOperatorId", "supervisorId", "loadingPointId", "dumpingPointId", "roadSegmentId", shift, "queueStartTime", "queueEndTime", "loadingStartTime", "loadingEndTime", "departureTime", "arrivalTime", "dumpingStartTime", "dumpingEndTime", "returnTime", "queueDuration", "loadingDuration", "haulingDuration", "dumpingDuration", "returnDuration", "totalCycleTime", "loadWeight", "targetWeight", "loadEfficiency", distance, "fuelConsumed", status, "weatherCondition", "roadCondition", "isDelayed", "delayMinutes", "delayReasonId", "delayReasonDetail", "predictedDelayRisk", "predictedDelayMinutes", remarks, "createdAt", "updatedAt"
   STATUS ENUM: 'PLANNED', 'IN_QUEUE', 'LOADING', 'HAULING', 'DUMPING', 'RETURNING', 'COMPLETED', 'DELAYED', 'CANCELLED', 'INCIDENT'
   ROAD_CONDITION ENUM: 'EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'CRITICAL'

6. production_records (603 rows) - Rekap produksi harian
   COLUMNS: id, "recordDate", shift, "miningSiteId", "targetProduction", "actualProduction", achievement, "avgCalori", "avgAshContent", "avgSulfur", "avgMoisture", "totalTrips", "totalDistance", "totalFuel", "avgCycleTime", "trucksOperating", "trucksBreakdown", "excavatorsOperating", "excavatorsBreakdown", "downtimeHours", "utilizationRate", "equipmentAllocation", remarks, "createdAt", "updatedAt"

7. mining_sites (601 rows) - Lokasi tambang
   COLUMNS: id, code, name, "siteType", "isActive", latitude, longitude, elevation, capacity, description, "createdAt", "updatedAt"
   SITE_TYPE ENUM: 'PIT', 'STOCKPILE', 'CRUSHER', 'PORT', 'COAL_HAULING_ROAD', 'ROM_PAD'

8. loading_points (601 rows) - Titik loading batubara
   COLUMNS: id, code, name, "miningSiteId", "excavatorId", "isActive", "maxQueueSize", latitude, longitude, "coalSeam", "coalQuality", "createdAt", "updatedAt"

9. dumping_points (600 rows) - Titik dumping batubara
   COLUMNS: id, code, name, "miningSiteId", "dumpingType", "isActive", capacity, "currentStock", latitude, longitude, "createdAt", "updatedAt"
   DUMPING_TYPE ENUM: 'STOCKPILE', 'CRUSHER', 'WASTE_DUMP', 'ROM_STOCKPILE', 'PORT'

10. road_segments (600 rows) - Segmen jalan hauling
    COLUMNS: id, code, name, "miningSiteId", "startPoint", "endPoint", distance, "roadCondition", "maxSpeed", gradient, "isActive", "lastMaintenance", "createdAt", "updatedAt"
    ROAD_CONDITION ENUM: 'EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'CRITICAL'

11. vessels (601 rows) - Kapal dan tongkang
    COLUMNS: id, code, name, "vesselType", gt, dwt, loa, capacity, owner, "isOwned", status, "currentLocation", "isActive", remarks, "createdAt", "updatedAt"
    VESSEL_TYPE ENUM: 'MOTHER_VESSEL', 'BARGE', 'TUG_BOAT'
    VESSEL_STATUS ENUM: 'AVAILABLE', 'LOADING', 'SAILING', 'DISCHARGING', 'MAINTENANCE', 'CHARTERED'

12. sailing_schedules (600 rows) - Jadwal pelayaran
    COLUMNS: id, "scheduleNumber", "vesselId", "voyageNumber", "loadingPort", destination, "etaLoading", "etsLoading", "etaDestination", "ataLoading", "loadingStart", "loadingComplete", "atsLoading", "ataDestination", "plannedQuantity", "actualQuantity", buyer, "contractNumber", status, remarks, "createdAt", "updatedAt"
    STATUS ENUM: 'SCHEDULED', 'STANDBY', 'LOADING', 'SAILING', 'ARRIVED', 'DISCHARGING', 'COMPLETED', 'CANCELLED'

13. maintenance_logs (604 rows) - Log perawatan alat
    COLUMNS: id, "maintenanceNumber", "truckId", "excavatorId", "supportEquipmentId", "maintenanceType", "scheduledDate", "actualDate", "completionDate", duration, cost, description, "partsReplaced", "mechanicName", status, "downtimeHours", remarks, "createdAt", "updatedAt"
    MAINTENANCE_TYPE ENUM: 'PREVENTIVE', 'CORRECTIVE', 'PREDICTIVE', 'OVERHAUL', 'INSPECTION'
    STATUS ENUM: 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DELAYED'

14. incident_reports (600 rows) - Laporan insiden
    COLUMNS: id, "incidentNumber", "incidentDate", "reportDate", location, "miningSiteCode", "truckId", "excavatorId", "reportedById", "operatorId", "incidentType", severity, description, "rootCause", injuries, fatalities, "equipmentDamage", "productionLoss", "estimatedCost", "downtimeHours", status, "actionTaken", "preventiveMeasure", photos, documents, remarks, "createdAt", "updatedAt"
    INCIDENT_TYPE ENUM: 'ACCIDENT', 'NEAR_MISS', 'EQUIPMENT_FAILURE', 'SPILL', 'FIRE', 'COLLISION', 'ROLLOVER', 'ENVIRONMENTAL', 'SAFETY_VIOLATION'
    SEVERITY ENUM: 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    STATUS ENUM: 'REPORTED', 'INVESTIGATING', 'RESOLVED', 'CLOSED'

15. fuel_consumptions (600 rows) - Konsumsi BBM
    COLUMNS: id, "consumptionDate", "truckId", "excavatorId", "supportEquipmentId", "fuelType", quantity, "costPerLiter", "totalCost", "operatingHours", distance, "fuelEfficiency", "fuelStation", remarks, "createdAt", "updatedAt"
    FUEL_TYPE ENUM: 'SOLAR', 'BENSIN', 'PERTAMAX'

16. weather_logs (601 rows) - Log cuaca
    COLUMNS: id, timestamp, "miningSiteId", condition, temperature, humidity, "windSpeed", "windDirection", rainfall, visibility, "waveHeight", "seaCondition", "isOperational", "riskLevel", remarks
    CONDITION ENUM: 'CERAH', 'BERAWAN', 'MENDUNG', 'HUJAN_RINGAN', 'HUJAN_SEDANG', 'HUJAN_LEBAT', 'BADAI', 'KABUT'
    VISIBILITY ENUM: 'EXCELLENT', 'GOOD', 'MODERATE', 'POOR', 'VERY_POOR'
    RISK_LEVEL ENUM: 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'

17. delay_reasons (12 rows) - Kategori alasan delay
    COLUMNS: id, code, category, name, description, "isActive"
    CATEGORY ENUM: 'WEATHER', 'EQUIPMENT', 'QUEUE', 'ROAD', 'OPERATOR', 'FUEL', 'ADMINISTRATIVE', 'SAFETY', 'OTHER'

18. support_equipment (600 rows) - Peralatan pendukung
    COLUMNS: id, code, name, "equipmentType", brand, model, status, "lastMaintenance", "totalHours", "isActive", "createdAt", "updatedAt"
    TYPE ENUM: 'GRADER', 'WATER_TRUCK', 'FUEL_TRUCK', 'DOZER', 'COMPACTOR', 'LIGHT_VEHICLE'
    STATUS ENUM: 'ACTIVE', 'IDLE', 'MAINTENANCE', 'BREAKDOWN', 'OUT_OF_SERVICE'

19. queue_logs (600 rows) - Log antrian loading
    COLUMNS: id, "loadingPointId", "truckId", "queueLength", "queueStartTime", "queueEndTime", "waitingTime", timestamp

20. equipment_status_logs (600 rows) - Riwayat status alat
    COLUMNS: id, timestamp, "truckId", "excavatorId", "supportEquipmentId", "previousStatus", "currentStatus", "statusReason", location, "durationMinutes", remarks

21. barge_loading_logs (600 rows) - Log muat tongkang
    COLUMNS: id, "loadingNumber", "vesselCode", "vesselName", "loadingDate", shift, "startTime", "endTime", "stockpileSource", quantity, "loaderUsed", "bargeTrips", "weatherCondition", "tidalCondition", "delayMinutes", "delayReason", remarks, "createdAt", "updatedAt"

22. jetty_berths (600 rows) - Dermaga kapal
    COLUMNS: id, code, name, "portName", "maxVesselSize", "maxDraft", "hasConveyor", "loadingCapacity", "isActive", remarks, "createdAt", "updatedAt"

23. berthing_logs (600 rows) - Log sandar kapal
    COLUMNS: id, "jettyBerthId", "vesselCode", "vesselName", "arrivalTime", "berthingTime", "loadingStart", "loadingEnd", "departureTime", "draftArrival", "draftDeparture", "waitingTime", remarks, "createdAt", "updatedAt"

24. shipment_records (600 rows) - Rekap pengiriman
    COLUMNS: id, "shipmentNumber", "vesselId", "sailingScheduleId", "shipmentDate", "loadingDate", "coalType", quantity, calorie, "totalMoisture", "ashContent", "sulfurContent", "stockpileOrigin", buyer, destination, "surveyorName", "blNumber", "coaNumber", "freightCost", "totalFreight", remarks, "createdAt", "updatedAt"

25. recommendation_logs (600 rows) - Log rekomendasi AI
    COLUMNS: id, "recommendationType", scenario, recommendations, "selectedStrategy", "selectedStrategyId", "implementedAt", "implementedBy", results, "profitActual", "profitPredicted", variance, feedback, "createdAt", "updatedAt"

26. prediction_logs (645 rows) - Log prediksi ML
    COLUMNS: id, "predictionType", "inputParameters", results, accuracy, "executionTime", "modelVersion", timestamp, "createdAt"

27. chatbot_interactions (622 rows) - Riwayat chatbot
    COLUMNS: id, "userId", "sessionId", "userQuestion", "aiResponse", context, "responseTime", rating, timestamp, "createdAt"

28. model_training_logs (0 rows) - Log training model
    COLUMNS: id, "modelType", "modelVersion", "trainingDataSize", "trainingAccuracy", "validationAccuracy", "testAccuracy", hyperparameters, "featureImportance", "trainedAt", "trainedBy", status, remarks, "createdAt"

29. system_configs (21 rows) - Konfigurasi sistem
    COLUMNS: id, "configKey", "configValue", "dataType", category, description, "isActive", "updatedBy", "createdAt", "updatedAt"

[KEY FOREIGN KEY RELATIONSHIPS]
- hauling_activities."truckId" -> trucks.id
- hauling_activities."excavatorId" -> excavators.id
- hauling_activities."operatorId" -> operators.id
- hauling_activities."excavatorOperatorId" -> operators.id
- hauling_activities."supervisorId" -> users.id
- hauling_activities."loadingPointId" -> loading_points.id
- hauling_activities."dumpingPointId" -> dumping_points.id
- hauling_activities."roadSegmentId" -> road_segments.id
- hauling_activities."delayReasonId" -> delay_reasons.id
- production_records."miningSiteId" -> mining_sites.id
- sailing_schedules."vesselId" -> vessels.id
- shipment_records."vesselId" -> vessels.id
- shipment_records."sailingScheduleId" -> sailing_schedules.id
- maintenance_logs."truckId" -> trucks.id
- maintenance_logs."excavatorId" -> excavators.id
- maintenance_logs."supportEquipmentId" -> support_equipment.id
- fuel_consumptions."truckId" -> trucks.id
- fuel_consumptions."excavatorId" -> excavators.id
- incident_reports."truckId" -> trucks.id
- incident_reports."excavatorId" -> excavators.id
- incident_reports."reportedById" -> users.id
- loading_points."miningSiteId" -> mining_sites.id
- loading_points."excavatorId" -> excavators.id
- dumping_points."miningSiteId" -> mining_sites.id
- road_segments."miningSiteId" -> mining_sites.id
- weather_logs."miningSiteId" -> mining_sites.id
- operators."userId" -> users.id
- trucks."currentOperatorId" -> operators.id
- berthing_logs."jettyBerthId" -> jetty_berths.id
- queue_logs."loadingPointId" -> loading_points.id

[POSTGRESQL CRITICAL RULES - MUST FOLLOW]
1. CamelCase columns MUST use double quotes: "isActive", "loadWeight", "createdAt", "totalCycleTime", "bucketCapacity"
2. Enum values are UPPERCASE with single quotes: 'IDLE', 'ACTIVE', 'COMPLETED', 'SHIFT_1'
3. Boolean: lowercase without quotes: true, false
4. Date ranges: "recordDate" >= CURRENT_DATE - INTERVAL '7 days'
5. Active check: "isActive" = true
6. Available trucks: status = 'IDLE' AND "isActive" = true
7. NULL handling: COALESCE(SUM/AVG(...), 0)
8. JOINs: quoted FK - JOIN trucks t ON h."truckId" = t.id
9. Limit large results: LIMIT 50 for lists
10. Order by for top/bottom: ORDER BY column DESC/ASC LIMIT n
"""

QUERY_EXAMPLES = {
    "count": "SELECT COUNT(*) as total FROM {table} WHERE \"isActive\" = true",
    "max": "SELECT * FROM {table} WHERE \"isActive\" = true ORDER BY {column} DESC LIMIT 1",
    "min": "SELECT * FROM {table} WHERE \"isActive\" = true ORDER BY {column} ASC LIMIT 1",
    "avg": "SELECT ROUND(AVG({column})::numeric, 2) as avg_{column} FROM {table} WHERE \"isActive\" = true",
    "sum": "SELECT COALESCE(SUM({column}), 0) as total FROM {table}",
    "group_status": "SELECT status, COUNT(*) as count FROM {table} WHERE \"isActive\" = true GROUP BY status ORDER BY count DESC",
    "recent": "SELECT * FROM {table} ORDER BY \"createdAt\" DESC LIMIT {limit}",
    "join_truck_hauling": "SELECT h.*, t.code as truck_code, t.name as truck_name FROM hauling_activities h JOIN trucks t ON h.\"truckId\" = t.id",
    "date_range": "SELECT * FROM {table} WHERE \"{date_column}\" >= CURRENT_DATE - INTERVAL '{days} days'",
    "top_n": "SELECT {columns} FROM {table} WHERE \"isActive\" = true ORDER BY {order_column} DESC LIMIT {n}",
}

SEMANTIC_QUERY_MAP = {
    "truk": {"table": "trucks", "id_col": "id", "code_col": "code", "name_col": "name"},
    "truck": {"table": "trucks", "id_col": "id", "code_col": "code", "name_col": "name"},
    "excavator": {"table": "excavators", "id_col": "id", "code_col": "code", "name_col": "name"},
    "ekskavator": {"table": "excavators", "id_col": "id", "code_col": "code", "name_col": "name"},
    "alat berat": {"table": "excavators", "id_col": "id", "code_col": "code", "name_col": "name"},
    "operator": {"table": "operators", "id_col": "id", "code_col": "employeeNumber", "name_col": "id"},
    "kapal": {"table": "vessels", "id_col": "id", "code_col": "code", "name_col": "name"},
    "vessel": {"table": "vessels", "id_col": "id", "code_col": "code", "name_col": "name"},
    "tongkang": {"table": "vessels", "id_col": "id", "code_col": "code", "name_col": "name"},
    "barge": {"table": "vessels", "id_col": "id", "code_col": "code", "name_col": "name"},
    "hauling": {"table": "hauling_activities", "id_col": "id", "code_col": "activityNumber", "name_col": "activityNumber"},
    "produksi": {"table": "production_records", "id_col": "id", "code_col": "id", "name_col": "id"},
    "production": {"table": "production_records", "id_col": "id", "code_col": "id", "name_col": "id"},
    "site": {"table": "mining_sites", "id_col": "id", "code_col": "code", "name_col": "name"},
    "tambang": {"table": "mining_sites", "id_col": "id", "code_col": "code", "name_col": "name"},
    "lokasi": {"table": "mining_sites", "id_col": "id", "code_col": "code", "name_col": "name"},
    "loading point": {"table": "loading_points", "id_col": "id", "code_col": "code", "name_col": "name"},
    "titik muat": {"table": "loading_points", "id_col": "id", "code_col": "code", "name_col": "name"},
    "dumping point": {"table": "dumping_points", "id_col": "id", "code_col": "code", "name_col": "name"},
    "titik buang": {"table": "dumping_points", "id_col": "id", "code_col": "code", "name_col": "name"},
    "jalan": {"table": "road_segments", "id_col": "id", "code_col": "code", "name_col": "name"},
    "road": {"table": "road_segments", "id_col": "id", "code_col": "code", "name_col": "name"},
    "maintenance": {"table": "maintenance_logs", "id_col": "id", "code_col": "maintenanceNumber", "name_col": "maintenanceNumber"},
    "perawatan": {"table": "maintenance_logs", "id_col": "id", "code_col": "maintenanceNumber", "name_col": "maintenanceNumber"},
    "insiden": {"table": "incident_reports", "id_col": "id", "code_col": "incidentNumber", "name_col": "incidentNumber"},
    "incident": {"table": "incident_reports", "id_col": "id", "code_col": "incidentNumber", "name_col": "incidentNumber"},
    "kecelakaan": {"table": "incident_reports", "id_col": "id", "code_col": "incidentNumber", "name_col": "incidentNumber"},
    "bbm": {"table": "fuel_consumptions", "id_col": "id", "code_col": "id", "name_col": "id"},
    "fuel": {"table": "fuel_consumptions", "id_col": "id", "code_col": "id", "name_col": "id"},
    "bahan bakar": {"table": "fuel_consumptions", "id_col": "id", "code_col": "id", "name_col": "id"},
    "cuaca": {"table": "weather_logs", "id_col": "id", "code_col": "id", "name_col": "id"},
    "weather": {"table": "weather_logs", "id_col": "id", "code_col": "id", "name_col": "id"},
    "delay": {"table": "delay_reasons", "id_col": "id", "code_col": "code", "name_col": "name"},
    "keterlambatan": {"table": "delay_reasons", "id_col": "id", "code_col": "code", "name_col": "name"},
    "jadwal": {"table": "sailing_schedules", "id_col": "id", "code_col": "scheduleNumber", "name_col": "scheduleNumber"},
    "schedule": {"table": "sailing_schedules", "id_col": "id", "code_col": "scheduleNumber", "name_col": "scheduleNumber"},
    "pelayaran": {"table": "sailing_schedules", "id_col": "id", "code_col": "scheduleNumber", "name_col": "scheduleNumber"},
    "pengiriman": {"table": "shipment_records", "id_col": "id", "code_col": "shipmentNumber", "name_col": "shipmentNumber"},
    "shipment": {"table": "shipment_records", "id_col": "id", "code_col": "shipmentNumber", "name_col": "shipmentNumber"},
    "dermaga": {"table": "jetty_berths", "id_col": "id", "code_col": "code", "name_col": "name"},
    "jetty": {"table": "jetty_berths", "id_col": "id", "code_col": "code", "name_col": "name"},
    "antrian": {"table": "queue_logs", "id_col": "id", "code_col": "id", "name_col": "id"},
    "queue": {"table": "queue_logs", "id_col": "id", "code_col": "id", "name_col": "id"},
}

COLUMN_SYNONYMS = {
    "kapasitas": "capacity",
    "capacity": "capacity",
    "muatan": "loadWeight",
    "load": "loadWeight",
    "berat": "loadWeight",
    "jarak": "distance",
    "distance": "distance",
    "waktu": "totalCycleTime",
    "siklus": "totalCycleTime",
    "cycle": "totalCycleTime",
    "jam": "totalHours",
    "hours": "totalHours",
    "rating": "rating",
    "nilai": "rating",
    "gaji": "salary",
    "salary": "salary",
    "bucket": "bucketCapacity",
    "ember": "bucketCapacity",
    "produksi": "actualProduction",
    "production": "actualProduction",
    "target": "targetProduction",
    "achievement": "achievement",
    "pencapaian": "achievement",
    "bbm": "quantity",
    "fuel": "quantity",
    "biaya": "cost",
    "cost": "cost",
    "harga": "costPerLiter",
    "suhu": "temperature",
    "temperature": "temperature",
    "hujan": "rainfall",
    "rainfall": "rainfall",
    "downtime": "downtimeHours",
    "utilisasi": "utilizationRate",
    "utilization": "utilizationRate",
    "kecepatan": "averageSpeed",
    "speed": "averageSpeed",
}

def get_enhanced_schema():
    return FULL_DATABASE_SCHEMA

SCHEMA_CONTEXT = FULL_DATABASE_SCHEMA

PREDEFINED_QUERIES = {
    "idle_trucks_count": """SELECT COUNT(*) as total FROM trucks WHERE status = 'IDLE' AND "isActive" = true""",
    "largest_truck": """SELECT code, name, brand, model, capacity FROM trucks WHERE "isActive" = true ORDER BY capacity DESC LIMIT 1""",
    "smallest_truck": """SELECT code, name, brand, model, capacity FROM trucks WHERE "isActive" = true ORDER BY capacity ASC LIMIT 1""",
    "active_excavators": """SELECT COUNT(*) as total FROM excavators WHERE "isActive" = true""",
    "idle_excavators": """SELECT COUNT(*) as total FROM excavators WHERE status = 'IDLE' AND "isActive" = true""",
    "mining_sites": """SELECT code, name, "siteType" FROM mining_sites WHERE "isActive" = true""",
    "recent_hauling": """SELECT h."activityNumber", h."loadWeight", h."totalCycleTime", h.status, t.code as truck_code FROM hauling_activities h LEFT JOIN trucks t ON h."truckId" = t.id ORDER BY h."createdAt" DESC LIMIT 10""",
    "truck_status_summary": """SELECT status, COUNT(*) as count FROM trucks WHERE "isActive" = true GROUP BY status ORDER BY count DESC""",
    "excavator_status_summary": """SELECT status, COUNT(*) as count FROM excavators WHERE "isActive" = true GROUP BY status ORDER BY count DESC""",
    "production_summary": """SELECT COALESCE(SUM("actualProduction"), 0) as total_production, COALESCE(AVG(achievement), 0) as avg_achievement FROM production_records""",
    "total_trucks": """SELECT COUNT(*) as total FROM trucks WHERE "isActive" = true""",
    "total_excavators": """SELECT COUNT(*) as total FROM excavators WHERE "isActive" = true""",
    "all_trucks": """SELECT COUNT(*) as total FROM trucks""",
    "all_excavators": """SELECT COUNT(*) as total FROM excavators""",
    "total_operators": """SELECT COUNT(*) as total FROM operators WHERE status = 'ACTIVE'""",
    "all_operators": """SELECT COUNT(*) as total FROM operators""",
    "total_vessels": """SELECT COUNT(*) as total FROM vessels WHERE "isActive" = true""",
    "all_vessels": """SELECT COUNT(*) as total FROM vessels""",
    "total_hauling": """SELECT COUNT(*) as total FROM hauling_activities""",
    "completed_hauling": """SELECT COUNT(*) as total FROM hauling_activities WHERE status = 'COMPLETED'""",
    "total_production_records": """SELECT COUNT(*) as total FROM production_records""",
    "total_maintenance": """SELECT COUNT(*) as total FROM maintenance_logs""",
    "total_incidents": """SELECT COUNT(*) as total FROM incident_reports""",
    "total_fuel": """SELECT COALESCE(SUM(quantity), 0) as total_liters, COALESCE(SUM("totalCost"), 0) as total_cost FROM fuel_consumptions""",
    "total_loading_points": """SELECT COUNT(*) as total FROM loading_points WHERE "isActive" = true""",
    "total_dumping_points": """SELECT COUNT(*) as total FROM dumping_points WHERE "isActive" = true""",
    "total_road_segments": """SELECT COUNT(*) as total FROM road_segments WHERE "isActive" = true""",
    "avg_truck_capacity": """SELECT ROUND(AVG(capacity)::numeric, 2) as avg_capacity, MAX(capacity) as max_capacity, MIN(capacity) as min_capacity FROM trucks WHERE "isActive" = true""",
    "avg_excavator_bucket": """SELECT ROUND(AVG("bucketCapacity")::numeric, 2) as avg_bucket, MAX("bucketCapacity") as max_bucket, MIN("bucketCapacity") as min_bucket FROM excavators WHERE "isActive" = true""",
    "avg_hauling_cycle": """SELECT ROUND(AVG("totalCycleTime")::numeric, 2) as avg_cycle, ROUND(AVG("loadWeight")::numeric, 2) as avg_load, ROUND(AVG(distance)::numeric, 2) as avg_distance FROM hauling_activities WHERE "totalCycleTime" > 0""",
    "daily_production": """SELECT "recordDate", SUM("actualProduction") as production, AVG(achievement) as achievement FROM production_records WHERE "recordDate" >= CURRENT_DATE - INTERVAL '7 days' GROUP BY "recordDate" ORDER BY "recordDate" DESC""",
    "truck_brands": """SELECT brand, COUNT(*) as count FROM trucks WHERE "isActive" = true GROUP BY brand ORDER BY count DESC""",
    "excavator_brands": """SELECT brand, COUNT(*) as count FROM excavators WHERE "isActive" = true GROUP BY brand ORDER BY count DESC""",
    "maintenance_trucks": """SELECT COUNT(*) as total FROM trucks WHERE status = 'MAINTENANCE' AND "isActive" = true""",
    "breakdown_trucks": """SELECT COUNT(*) as total FROM trucks WHERE status = 'BREAKDOWN' AND "isActive" = true""",
    "hauling_trucks": """SELECT COUNT(*) as total FROM trucks WHERE status = 'HAULING' AND "isActive" = true""",
    "loading_trucks": """SELECT COUNT(*) as total FROM trucks WHERE status = 'LOADING' AND "isActive" = true""",
    "weather_today": """SELECT condition, temperature, humidity, rainfall, "riskLevel" FROM weather_logs ORDER BY timestamp DESC LIMIT 1""",
    "recent_incidents": """SELECT "incidentNumber", "incidentType", severity, "incidentDate" FROM incident_reports ORDER BY "incidentDate" DESC LIMIT 5""",
    "active_schedules": """SELECT "scheduleNumber", status, "plannedQuantity" FROM sailing_schedules WHERE status NOT IN ('COMPLETED', 'CANCELLED') ORDER BY "etaLoading" LIMIT 10""",
    "vessel_status": """SELECT status, COUNT(*) as count FROM vessels WHERE "isActive" = true GROUP BY status ORDER BY count DESC""",
    "operator_shifts": """SELECT shift, COUNT(*) as count FROM operators WHERE status = 'ACTIVE' GROUP BY shift ORDER BY shift""",
    "delay_categories": """SELECT category, COUNT(*) as count FROM delay_reasons WHERE "isActive" = true GROUP BY category ORDER BY count DESC""",
    "road_conditions": """SELECT "roadCondition" as condition, COUNT(*) as count FROM road_segments WHERE "isActive" = true GROUP BY "roadCondition" ORDER BY count DESC""",
    "top_trucks_by_hours": """SELECT code, name, "totalHours" FROM trucks WHERE "isActive" = true ORDER BY "totalHours" DESC LIMIT 10""",
    "top_trucks_by_distance": """SELECT code, name, "totalDistance" FROM trucks WHERE "isActive" = true ORDER BY "totalDistance" DESC LIMIT 10""",
    "largest_excavator": """SELECT code, name, brand, model, "bucketCapacity" FROM excavators WHERE "isActive" = true AND "bucketCapacity" IS NOT NULL ORDER BY "bucketCapacity" DESC LIMIT 1""",
    "smallest_excavator": """SELECT code, name, brand, model, "bucketCapacity" FROM excavators WHERE "isActive" = true AND "bucketCapacity" IS NOT NULL ORDER BY "bucketCapacity" ASC LIMIT 1""",
    "largest_vessel": """SELECT code, name, "vesselType", capacity, dwt FROM vessels WHERE "isActive" = true ORDER BY capacity DESC LIMIT 1""",
    "smallest_vessel": """SELECT code, name, "vesselType", capacity, dwt FROM vessels WHERE "isActive" = true ORDER BY capacity ASC LIMIT 1""",
    "top_operators_by_hours": """SELECT "employeeNumber", "totalHours", rating, shift FROM operators WHERE status = 'ACTIVE' ORDER BY "totalHours" DESC LIMIT 10""",
    "top_operators_by_rating": """SELECT "employeeNumber", "totalHours", rating, shift FROM operators WHERE status = 'ACTIVE' ORDER BY rating DESC LIMIT 10""",
    "hauling_by_shift": """SELECT shift, COUNT(*) as total_trips, ROUND(AVG("loadWeight")::numeric, 2) as avg_load, ROUND(AVG("totalCycleTime")::numeric, 2) as avg_cycle FROM hauling_activities GROUP BY shift ORDER BY shift""",
    "hauling_delayed": """SELECT COUNT(*) as total FROM hauling_activities WHERE "isDelayed" = true""",
    "hauling_completed": """SELECT COUNT(*) as total FROM hauling_activities WHERE status = 'COMPLETED'""",
    "hauling_in_progress": """SELECT COUNT(*) as total FROM hauling_activities WHERE status IN ('LOADING', 'HAULING', 'DUMPING', 'RETURNING')""",
    "production_today": """SELECT COALESCE(SUM("actualProduction"), 0) as total, COALESCE(AVG(achievement), 0) as avg_achievement FROM production_records WHERE "recordDate" = CURRENT_DATE""",
    "production_this_month": """SELECT COALESCE(SUM("actualProduction"), 0) as total, COALESCE(AVG(achievement), 0) as avg_achievement FROM production_records WHERE "recordDate" >= DATE_TRUNC('month', CURRENT_DATE)""",
    "production_by_site": """SELECT ms.name as site_name, SUM(pr."actualProduction") as total_production, AVG(pr.achievement) as avg_achievement FROM production_records pr JOIN mining_sites ms ON pr."miningSiteId" = ms.id GROUP BY ms.name ORDER BY total_production DESC""",
    "incidents_by_type": """SELECT "incidentType", COUNT(*) as count FROM incident_reports GROUP BY "incidentType" ORDER BY count DESC""",
    "incidents_by_severity": """SELECT severity, COUNT(*) as count FROM incident_reports GROUP BY severity ORDER BY count DESC""",
    "incidents_this_month": """SELECT COUNT(*) as total FROM incident_reports WHERE "incidentDate" >= DATE_TRUNC('month', CURRENT_DATE)""",
    "maintenance_by_type": """SELECT "maintenanceType", COUNT(*) as count FROM maintenance_logs GROUP BY "maintenanceType" ORDER BY count DESC""",
    "maintenance_pending": """SELECT COUNT(*) as total FROM maintenance_logs WHERE status IN ('SCHEDULED', 'IN_PROGRESS')""",
    "maintenance_completed_month": """SELECT COUNT(*) as total FROM maintenance_logs WHERE status = 'COMPLETED' AND "completionDate" >= DATE_TRUNC('month', CURRENT_DATE)""",
    "fuel_by_equipment": """SELECT CASE WHEN "truckId" IS NOT NULL THEN 'Truck' WHEN "excavatorId" IS NOT NULL THEN 'Excavator' ELSE 'Support Equipment' END as equipment_type, SUM(quantity) as total_liters, SUM("totalCost") as total_cost FROM fuel_consumptions GROUP BY CASE WHEN "truckId" IS NOT NULL THEN 'Truck' WHEN "excavatorId" IS NOT NULL THEN 'Excavator' ELSE 'Support Equipment' END""",
    "fuel_this_month": """SELECT COALESCE(SUM(quantity), 0) as total_liters, COALESCE(SUM("totalCost"), 0) as total_cost FROM fuel_consumptions WHERE "consumptionDate" >= DATE_TRUNC('month', CURRENT_DATE)""",
    "weather_history": """SELECT condition, COUNT(*) as count FROM weather_logs WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days' GROUP BY condition ORDER BY count DESC""",
    "vessels_by_type": """SELECT "vesselType", COUNT(*) as count FROM vessels WHERE "isActive" = true GROUP BY "vesselType" ORDER BY count DESC""",
    "vessels_loading": """SELECT code, name, capacity FROM vessels WHERE status = 'LOADING' AND "isActive" = true""",
    "schedules_this_month": """SELECT COUNT(*) as total FROM sailing_schedules WHERE "etaLoading" >= DATE_TRUNC('month', CURRENT_DATE) AND "etaLoading" < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'""",
    "shipments_this_month": """SELECT COUNT(*) as total_shipments, COALESCE(SUM(quantity), 0) as total_quantity FROM shipment_records WHERE "shipmentDate" >= DATE_TRUNC('month', CURRENT_DATE)""",
    "support_equipment_count": """SELECT "equipmentType", COUNT(*) as count FROM support_equipment WHERE "isActive" = true GROUP BY "equipmentType" ORDER BY count DESC""",
    "queue_avg_wait": """SELECT ROUND(AVG("waitingTime")::numeric, 2) as avg_wait_minutes FROM queue_logs WHERE "waitingTime" IS NOT NULL""",
    "loading_points_with_excavator": """SELECT lp.code, lp.name, e.code as excavator_code, e.name as excavator_name FROM loading_points lp LEFT JOIN excavators e ON lp."excavatorId" = e.id WHERE lp."isActive" = true""",
    "truck_details_all": """SELECT code, name, brand, model, capacity, status, "totalHours", "totalDistance" FROM trucks WHERE "isActive" = true ORDER BY code""",
    "excavator_details_all": """SELECT code, name, brand, model, "bucketCapacity", "productionRate", status, "totalHours" FROM excavators WHERE "isActive" = true ORDER BY code""",
    "operator_details_all": """SELECT "employeeNumber", "licenseType", status, shift, "totalHours", rating, salary FROM operators ORDER BY "employeeNumber" """,
    "hauling_performance": """SELECT DATE("loadingStartTime") as date, COUNT(*) as trips, ROUND(AVG("loadWeight")::numeric, 2) as avg_load, ROUND(AVG("totalCycleTime")::numeric, 2) as avg_cycle, ROUND(SUM("loadWeight")::numeric, 2) as total_hauled FROM hauling_activities WHERE "loadingStartTime" >= CURRENT_DATE - INTERVAL '7 days' GROUP BY DATE("loadingStartTime") ORDER BY date DESC""",
    "efficiency_summary": """SELECT ROUND(AVG("loadEfficiency")::numeric * 100, 2) as avg_load_efficiency, ROUND(AVG("utilizationRate")::numeric, 2) as avg_utilization FROM hauling_activities h, production_records p WHERE h."loadEfficiency" IS NOT NULL""",
    "downtime_summary": """SELECT SUM("downtimeHours") as total_downtime, AVG("downtimeHours") as avg_downtime FROM production_records WHERE "recordDate" >= CURRENT_DATE - INTERVAL '7 days'""",
    "delay_analysis": """SELECT dr.category, dr.name, COUNT(h.id) as occurrences FROM hauling_activities h JOIN delay_reasons dr ON h."delayReasonId" = dr.id WHERE h."isDelayed" = true GROUP BY dr.category, dr.name ORDER BY occurrences DESC LIMIT 10""",
    "cost_summary_maintenance": """SELECT SUM(cost) as total_cost, COUNT(*) as total_jobs FROM maintenance_logs WHERE status = 'COMPLETED' AND "completionDate" >= CURRENT_DATE - INTERVAL '30 days'""",
    "cost_summary_fuel": """SELECT SUM("totalCost") as total_cost, SUM(quantity) as total_liters FROM fuel_consumptions WHERE "consumptionDate" >= CURRENT_DATE - INTERVAL '30 days'""",
    "fleet_summary": """SELECT (SELECT COUNT(*) FROM trucks WHERE "isActive" = true) as total_trucks, (SELECT COUNT(*) FROM excavators WHERE "isActive" = true) as total_excavators, (SELECT COUNT(*) FROM vessels WHERE "isActive" = true) as total_vessels, (SELECT COUNT(*) FROM operators WHERE status = 'ACTIVE') as total_operators""",
    "production_vs_target": """SELECT "recordDate", "targetProduction", "actualProduction", achievement, "trucksOperating", "excavatorsOperating" FROM production_records WHERE "recordDate" >= CURRENT_DATE - INTERVAL '7 days' ORDER BY "recordDate" DESC""",
    "top_hauling_trucks": """SELECT t.code, t.name, COUNT(h.id) as total_trips, SUM(h."loadWeight") as total_hauled FROM hauling_activities h JOIN trucks t ON h."truckId" = t.id WHERE h."createdAt" >= CURRENT_DATE - INTERVAL '7 days' GROUP BY t.code, t.name ORDER BY total_hauled DESC LIMIT 10""",
    "top_hauling_excavators": """SELECT e.code, e.name, COUNT(h.id) as total_trips, SUM(h."loadWeight") as total_loaded FROM hauling_activities h JOIN excavators e ON h."excavatorId" = e.id WHERE h."createdAt" >= CURRENT_DATE - INTERVAL '7 days' GROUP BY e.code, e.name ORDER BY total_loaded DESC LIMIT 10""",
    "truck_fastest": """SELECT code, name, brand, model, "averageSpeed" FROM trucks WHERE "isActive" = true ORDER BY "averageSpeed" DESC LIMIT 1""",
    "truck_slowest": """SELECT code, name, brand, model, "averageSpeed" FROM trucks WHERE "isActive" = true ORDER BY "averageSpeed" ASC LIMIT 1""",
    "truck_most_fuel": """SELECT code, name, brand, "fuelConsumption" FROM trucks WHERE "isActive" = true AND "fuelConsumption" IS NOT NULL ORDER BY "fuelConsumption" DESC LIMIT 1""",
    "truck_least_fuel": """SELECT code, name, brand, "fuelConsumption" FROM trucks WHERE "isActive" = true AND "fuelConsumption" IS NOT NULL ORDER BY "fuelConsumption" ASC LIMIT 1""",
    "truck_most_hours": """SELECT code, name, brand, model, "totalHours" FROM trucks WHERE "isActive" = true ORDER BY "totalHours" DESC LIMIT 1""",
    "truck_most_distance": """SELECT code, name, brand, model, "totalDistance" FROM trucks WHERE "isActive" = true ORDER BY "totalDistance" DESC LIMIT 1""",
    "excavator_highest_production": """SELECT code, name, brand, "productionRate" FROM excavators WHERE "isActive" = true AND "productionRate" IS NOT NULL ORDER BY "productionRate" DESC LIMIT 1""",
    "excavator_most_hours": """SELECT code, name, brand, "totalHours" FROM excavators WHERE "isActive" = true ORDER BY "totalHours" DESC LIMIT 1""",
    "operator_highest_rating": """SELECT "employeeNumber", rating, "totalHours", shift FROM operators WHERE status = 'ACTIVE' ORDER BY rating DESC LIMIT 1""",
    "operator_lowest_rating": """SELECT "employeeNumber", rating, "totalHours", shift FROM operators WHERE status = 'ACTIVE' ORDER BY rating ASC LIMIT 1""",
    "operator_most_salary": """SELECT "employeeNumber", salary, rating, shift FROM operators WHERE status = 'ACTIVE' ORDER BY salary DESC LIMIT 1""",
    "hauling_longest_cycle": """SELECT h."activityNumber", h."totalCycleTime", h."loadWeight", h.distance, t.code as truck_code FROM hauling_activities h JOIN trucks t ON h."truckId" = t.id WHERE h."totalCycleTime" > 0 ORDER BY h."totalCycleTime" DESC LIMIT 1""",
    "hauling_shortest_cycle": """SELECT h."activityNumber", h."totalCycleTime", h."loadWeight", h.distance, t.code as truck_code FROM hauling_activities h JOIN trucks t ON h."truckId" = t.id WHERE h."totalCycleTime" > 0 ORDER BY h."totalCycleTime" ASC LIMIT 1""",
    "hauling_heaviest_load": """SELECT h."activityNumber", h."loadWeight", h."totalCycleTime", t.code as truck_code, t.capacity FROM hauling_activities h JOIN trucks t ON h."truckId" = t.id ORDER BY h."loadWeight" DESC LIMIT 1""",
    "hauling_lightest_load": """SELECT h."activityNumber", h."loadWeight", h."totalCycleTime", t.code as truck_code FROM hauling_activities h JOIN trucks t ON h."truckId" = t.id WHERE h."loadWeight" > 0 ORDER BY h."loadWeight" ASC LIMIT 1""",
    "hauling_farthest_distance": """SELECT h."activityNumber", h.distance, h."loadWeight", t.code as truck_code FROM hauling_activities h JOIN trucks t ON h."truckId" = t.id ORDER BY h.distance DESC LIMIT 1""",
    "production_highest": """SELECT "recordDate", shift, "actualProduction", achievement, ms.name as site_name FROM production_records pr JOIN mining_sites ms ON pr."miningSiteId" = ms.id ORDER BY "actualProduction" DESC LIMIT 1""",
    "production_lowest": """SELECT "recordDate", shift, "actualProduction", achievement, ms.name as site_name FROM production_records pr JOIN mining_sites ms ON pr."miningSiteId" = ms.id WHERE "actualProduction" > 0 ORDER BY "actualProduction" ASC LIMIT 1""",
    "production_best_achievement": """SELECT "recordDate", shift, "actualProduction", achievement, ms.name as site_name FROM production_records pr JOIN mining_sites ms ON pr."miningSiteId" = ms.id ORDER BY achievement DESC LIMIT 1""",
    "production_worst_achievement": """SELECT "recordDate", shift, "actualProduction", achievement, ms.name as site_name FROM production_records pr JOIN mining_sites ms ON pr."miningSiteId" = ms.id WHERE achievement > 0 ORDER BY achievement ASC LIMIT 1""",
    "incident_highest_cost": """SELECT "incidentNumber", "incidentType", severity, "estimatedCost", "downtimeHours", description FROM incident_reports WHERE "estimatedCost" IS NOT NULL ORDER BY "estimatedCost" DESC LIMIT 1""",
    "incident_highest_downtime": """SELECT "incidentNumber", "incidentType", severity, "downtimeHours", "estimatedCost" FROM incident_reports ORDER BY "downtimeHours" DESC LIMIT 1""",
    "fuel_highest_consumption": """SELECT fc.id, fc."consumptionDate", fc.quantity, fc."totalCost", t.code as truck_code FROM fuel_consumptions fc LEFT JOIN trucks t ON fc."truckId" = t.id ORDER BY fc.quantity DESC LIMIT 1""",
    "maintenance_highest_cost": """SELECT "maintenanceNumber", "maintenanceType", cost, "downtimeHours", description FROM maintenance_logs WHERE cost IS NOT NULL ORDER BY cost DESC LIMIT 1""",
    "maintenance_longest_downtime": """SELECT "maintenanceNumber", "maintenanceType", "downtimeHours", cost FROM maintenance_logs ORDER BY "downtimeHours" DESC LIMIT 1""",
    "vessel_largest_capacity": """SELECT code, name, "vesselType", capacity, dwt FROM vessels WHERE "isActive" = true ORDER BY capacity DESC LIMIT 1""",
    "vessel_smallest_capacity": """SELECT code, name, "vesselType", capacity, dwt FROM vessels WHERE "isActive" = true ORDER BY capacity ASC LIMIT 1""",
    "vessel_largest_dwt": """SELECT code, name, "vesselType", dwt, capacity FROM vessels WHERE "isActive" = true ORDER BY dwt DESC LIMIT 1""",
    "road_longest": """SELECT code, name, distance, "roadCondition", "maxSpeed" FROM road_segments WHERE "isActive" = true ORDER BY distance DESC LIMIT 1""",
    "road_shortest": """SELECT code, name, distance, "roadCondition", "maxSpeed" FROM road_segments WHERE "isActive" = true ORDER BY distance ASC LIMIT 1""",
    "road_fastest": """SELECT code, name, "maxSpeed", distance, "roadCondition" FROM road_segments WHERE "isActive" = true ORDER BY "maxSpeed" DESC LIMIT 1""",
    "site_largest_capacity": """SELECT code, name, "siteType", capacity FROM mining_sites WHERE "isActive" = true AND capacity IS NOT NULL ORDER BY capacity DESC LIMIT 1""",
    "dumping_highest_stock": """SELECT code, name, "dumpingType", "currentStock", capacity FROM dumping_points WHERE "isActive" = true ORDER BY "currentStock" DESC LIMIT 1""",
    "loading_longest_queue": """SELECT lp.code, lp.name, lp."maxQueueSize" FROM loading_points lp WHERE lp."isActive" = true ORDER BY lp."maxQueueSize" DESC LIMIT 1""",
    "schedule_largest_quantity": """SELECT "scheduleNumber", "voyageNumber", "plannedQuantity", buyer, destination, status FROM sailing_schedules ORDER BY "plannedQuantity" DESC LIMIT 1""",
    "shipment_largest_quantity": """SELECT "shipmentNumber", quantity, calorie, buyer, destination FROM shipment_records ORDER BY quantity DESC LIMIT 1""",
    "weather_current": """SELECT condition, temperature, humidity, rainfall, "riskLevel", "isOperational" FROM weather_logs ORDER BY timestamp DESC LIMIT 1""",
    "barge_highest_quantity": """SELECT "loadingNumber", "vesselName", quantity, "bargeTrips", shift FROM barge_loading_logs ORDER BY quantity DESC LIMIT 1""",
    "total_production_all": """SELECT COALESCE(SUM("actualProduction"), 0) as total_production, COALESCE(AVG(achievement), 0) as avg_achievement, COUNT(*) as total_records FROM production_records""",
    "total_hauling_stats": """SELECT COUNT(*) as total_trips, COALESCE(SUM("loadWeight"), 0) as total_tonnage, COALESCE(AVG("totalCycleTime"), 0) as avg_cycle, COALESCE(SUM(distance), 0) as total_distance FROM hauling_activities""",
    "total_fuel_all": """SELECT COALESCE(SUM(quantity), 0) as total_liters, COALESCE(SUM("totalCost"), 0) as total_cost FROM fuel_consumptions""",
    "total_maintenance_cost": """SELECT COALESCE(SUM(cost), 0) as total_cost, COALESCE(SUM("downtimeHours"), 0) as total_downtime, COUNT(*) as total_jobs FROM maintenance_logs""",
    "total_incident_cost": """SELECT COALESCE(SUM("estimatedCost"), 0) as total_cost, COALESCE(SUM("downtimeHours"), 0) as total_downtime, SUM(injuries) as total_injuries, COUNT(*) as total_incidents FROM incident_reports""",
    "total_shipment_quantity": """SELECT COALESCE(SUM(quantity), 0) as total_quantity, COUNT(*) as total_shipments, COALESCE(AVG(calorie), 0) as avg_calorie FROM shipment_records""",
}

QUERY_PATTERNS = [
    (r'truk.*kapasitas.*(?:terbesar|maksimum|tertinggi|paling\s+besar)', 'largest_truck', 'largest_truck'),
    (r'truk.*kapasitas.*(?:terkecil|minimum|terendah|paling\s+kecil)', 'smallest_truck', 'smallest_truck'),
    (r'kapasitas.*(?:terbesar|maksimum|tertinggi).*truk', 'largest_truck', 'largest_truck'),
    (r'kapasitas.*(?:terkecil|minimum|terendah).*truk', 'smallest_truck', 'smallest_truck'),
    (r'(?:truk|truck).*(?:terbesar|terbanyak|maksimum|tertinggi)', 'largest_truck', 'largest_truck'),
    (r'(?:truk|truck).*(?:terkecil|minimum|terendah)', 'smallest_truck', 'smallest_truck'),
    (r'excavator.*bucket.*(?:terbesar|maksimum|tertinggi|paling\s+besar)', 'largest_excavator', 'largest_excavator'),
    (r'excavator.*bucket.*(?:terkecil|minimum|terendah|paling\s+kecil)', 'smallest_excavator', 'smallest_excavator'),
    (r'excavator.*(?:kapasitas|terbesar|tertinggi)', 'largest_excavator', 'largest_excavator'),
    (r'excavator.*(?:terkecil|terendah)', 'smallest_excavator', 'smallest_excavator'),
    (r'bucket.*(?:terbesar|maksimum|tertinggi).*excavator', 'largest_excavator', 'largest_excavator'),
    (r'bucket.*(?:terkecil|minimum|terendah).*excavator', 'smallest_excavator', 'smallest_excavator'),
    (r'(?:kapal|vessel|barge).*(?:kapasitas|dwt).*(?:terbesar|maksimum|tertinggi)', 'largest_vessel', 'largest_vessel'),
    (r'(?:kapal|vessel|barge).*(?:kapasitas|dwt).*(?:terkecil|minimum|terendah)', 'smallest_vessel', 'smallest_vessel'),
    (r'(?:kapal|vessel|barge).*(?:terbesar|maksimum|tertinggi)', 'largest_vessel', 'largest_vessel'),
    (r'(?:kapal|vessel|barge).*(?:terkecil|minimum|terendah)', 'smallest_vessel', 'smallest_vessel'),
    (r'(?:berapa|jumlah|total|banyak|ada).*(?:truk|truck)(?:\s+(?:yang\s+)?(?:aktif|active))?(?:\s+saat\s+ini)?', 'total_trucks', 'truck_count'),
    (r'(?:berapa|jumlah|total|banyak|ada).*(?:excavator|ekskavator|alat\s+berat)', 'total_excavators', 'excavator_count'),
    (r'(?:berapa|jumlah|total|banyak|ada).*operator', 'total_operators', 'operator_count'),
    (r'(?:berapa|jumlah|total|banyak|ada).*(?:kapal|vessel|barge|tongkang)', 'total_vessels', 'vessel_count'),
    (r'(?:berapa|jumlah|total|banyak|ada).*(?:hauling|pengangkutan|trip)', 'total_hauling', 'hauling_count'),
    (r'(?:berapa|jumlah|total|banyak|ada).*(?:loading\s+point|titik\s+muat)', 'total_loading_points', 'loading_point_count'),
    (r'(?:berapa|jumlah|total|banyak|ada).*(?:dumping\s+point|titik\s+buang)', 'total_dumping_points', 'dumping_point_count'),
    (r'(?:berapa|jumlah|total|banyak|ada).*(?:road|jalan|segment)', 'total_road_segments', 'road_count'),
    (r'(?:berapa|jumlah|total|banyak|ada).*(?:insiden|incident|kecelakaan)', 'total_incidents', 'incident_count'),
    (r'(?:berapa|jumlah|total|banyak|ada).*(?:maintenance|perawatan)', 'total_maintenance', 'maintenance_count'),
    (r'truk.*(?:idle|tersedia|available|nganggur|menganggur|standby)', 'idle_trucks_count', 'idle_trucks'),
    (r'(?:idle|tersedia|available|nganggur).*truk', 'idle_trucks_count', 'idle_trucks'),
    (r'excavator.*(?:idle|tersedia|available|nganggur)', 'idle_excavators', 'idle_excavators'),
    (r'truk.*(?:maintenance|perawatan|perbaikan|servis)', 'maintenance_trucks', 'maintenance_trucks'),
    (r'truk.*(?:breakdown|rusak|mogok)', 'breakdown_trucks', 'breakdown_trucks'),
    (r'truk.*(?:hauling|mengangkut|berjalan|jalan)', 'hauling_trucks', 'hauling_trucks'),
    (r'truk.*(?:loading|memuat|muat)', 'loading_trucks', 'loading_trucks'),
    (r'status.*truk', 'truck_status_summary', 'truck_status'),
    (r'status.*excavator', 'excavator_status_summary', 'excavator_status'),
    (r'status.*(?:kapal|vessel)', 'vessel_status', 'vessel_status'),
    (r'(?:rata-rata|average|avg|rerata).*kapasitas.*truk', 'avg_truck_capacity', 'avg_truck_capacity'),
    (r'(?:rata-rata|average|avg|rerata).*(?:bucket|ember).*excavator', 'avg_excavator_bucket', 'avg_excavator_bucket'),
    (r'(?:rata-rata|average|avg|rerata).*(?:cycle|siklus).*hauling', 'avg_hauling_cycle', 'avg_hauling_cycle'),
    (r'produksi.*(?:total|keseluruhan|semua)', 'production_summary', 'production_summary'),
    (r'(?:performa|kinerja|performance).*produksi', 'daily_production', 'daily_production'),
    (r'produksi.*(?:harian|per\s+hari|mingguan|7\s+hari|seminggu|minggu)', 'daily_production', 'daily_production'),
    (r'produksi.*(?:hari\s+ini|today)', 'production_today', 'production_today'),
    (r'produksi.*(?:bulan\s+ini|this\s+month)', 'production_this_month', 'production_this_month'),
    (r'produksi.*(?:per\s+site|per\s+lokasi|tiap\s+tambang)', 'production_by_site', 'production_by_site'),
    (r'(?:target|aktual).*produksi', 'production_vs_target', 'production_vs_target'),
    (r'hauling.*(?:terbaru|recent|terakhir)', 'recent_hauling', 'recent_hauling'),
    (r'hauling.*(?:delay|terlambat)', 'hauling_delayed', 'hauling_delayed'),
    (r'hauling.*(?:selesai|complete)', 'hauling_completed', 'hauling_completed'),
    (r'hauling.*(?:berjalan|in\s+progress|sedang)', 'hauling_in_progress', 'hauling_in_progress'),
    (r'hauling.*(?:per\s+shift|tiap\s+shift)', 'hauling_by_shift', 'hauling_by_shift'),
    (r'(?:performa|kinerja).*hauling', 'hauling_performance', 'hauling_performance'),
    (r'(?:mining\s+site|tambang|lokasi\s+tambang|site|pit)', 'mining_sites', 'mining_sites'),
    (r'(?:cuaca|weather)(?:.*(?:hari\s+ini|terkini|sekarang|saat\s+ini))?', 'weather_today', 'weather'),
    (r'(?:riwayat|history).*cuaca', 'weather_history', 'weather_history'),
    (r'insiden.*(?:terbaru|recent|terakhir)', 'recent_incidents', 'recent_incidents'),
    (r'insiden.*(?:per\s+tipe|by\s+type|jenis)', 'incidents_by_type', 'incidents_by_type'),
    (r'insiden.*(?:severity|tingkat|keparahan)', 'incidents_by_severity', 'incidents_by_severity'),
    (r'insiden.*(?:bulan\s+ini|this\s+month)', 'incidents_this_month', 'incidents_this_month'),
    (r'jadwal.*(?:pelayaran|sailing|kapal)', 'active_schedules', 'schedules'),
    (r'jadwal.*(?:bulan\s+ini|this\s+month)', 'schedules_this_month', 'schedules_this_month'),
    (r'(?:merk|brand|merek).*truk', 'truck_brands', 'truck_brands'),
    (r'(?:merk|brand|merek).*excavator', 'excavator_brands', 'excavator_brands'),
    (r'shift.*operator', 'operator_shifts', 'operator_shifts'),
    (r'(?:alasan|kategori|penyebab).*(?:delay|keterlambatan|terlambat)', 'delay_categories', 'delay_categories'),
    (r'(?:analisis|analysis).*delay', 'delay_analysis', 'delay_analysis'),
    (r'kondisi.*(?:jalan|road)', 'road_conditions', 'road_conditions'),
    (r'(?:jalan|road).*kondisi', 'road_conditions', 'road_conditions'),
    (r'truk.*(?:jam\s+operasi|hours|jam).*(?:tertinggi|terbanyak|top)', 'top_trucks_by_hours', 'top_trucks_hours'),
    (r'truk.*(?:jarak\s+tempuh|distance|jarak).*(?:terjauh|terbanyak|top)', 'top_trucks_by_distance', 'top_trucks_distance'),
    (r'(?:konsumsi|penggunaan).*(?:bbm|bahan\s+bakar|fuel|solar)', 'total_fuel', 'fuel_consumption'),
    (r'(?:bbm|fuel).*(?:bulan\s+ini|this\s+month)', 'fuel_this_month', 'fuel_this_month'),
    (r'(?:bbm|fuel).*(?:per\s+alat|per\s+equipment)', 'fuel_by_equipment', 'fuel_by_equipment'),
    (r'maintenance.*(?:per\s+tipe|by\s+type|jenis)', 'maintenance_by_type', 'maintenance_by_type'),
    (r'maintenance.*(?:pending|dijadwalkan|scheduled)', 'maintenance_pending', 'maintenance_pending'),
    (r'maintenance.*(?:selesai|complete).*(?:bulan|month)', 'maintenance_completed_month', 'maintenance_completed_month'),
    (r'operator.*(?:jam|hours).*(?:tertinggi|terbanyak|top)', 'top_operators_by_hours', 'top_operators_hours'),
    (r'operator.*(?:rating|nilai).*(?:tertinggi|terbaik|top)', 'top_operators_by_rating', 'top_operators_rating'),
    (r'(?:kapal|vessel).*(?:per\s+tipe|by\s+type|jenis)', 'vessels_by_type', 'vessels_by_type'),
    (r'(?:kapal|vessel).*(?:loading|muat|sedang\s+muat)', 'vessels_loading', 'vessels_loading'),
    (r'pengiriman.*(?:bulan\s+ini|this\s+month)', 'shipments_this_month', 'shipments_this_month'),
    (r'(?:support\s+equipment|alat\s+pendukung|peralatan\s+pendukung)', 'support_equipment_count', 'support_equipment_count'),
    (r'(?:antrian|queue).*(?:rata-rata|average|avg)', 'queue_avg_wait', 'queue_avg_wait'),
    (r'(?:rata-rata|average|avg).*(?:antrian|queue|tunggu|wait)', 'queue_avg_wait', 'queue_avg_wait'),
    (r'(?:waktu\s+tunggu|waiting\s+time).*(?:rata-rata|average|avg)', 'queue_avg_wait', 'queue_avg_wait'),
    (r'loading\s+point.*excavator', 'loading_points_with_excavator', 'loading_points_with_excavator'),
    (r'(?:detail|daftar|list).*(?:semua\s+)?truk', 'truck_details_all', 'truck_details_all'),
    (r'(?:detail|daftar|list).*(?:semua\s+)?excavator', 'excavator_details_all', 'excavator_details_all'),
    (r'(?:detail|daftar|list).*(?:semua\s+)?operator', 'operator_details_all', 'operator_details_all'),
    (r'(?:efisiensi|efficiency).*(?:summary|ringkasan)?', 'efficiency_summary', 'efficiency_summary'),
    (r'(?:downtime|waktu\s+henti)', 'downtime_summary', 'downtime_summary'),
    (r'(?:biaya|cost).*maintenance', 'cost_summary_maintenance', 'cost_summary_maintenance'),
    (r'(?:biaya|cost).*(?:bbm|fuel)', 'cost_summary_fuel', 'cost_summary_fuel'),
    (r'(?:ringkasan|summary).*(?:armada|fleet)', 'fleet_summary', 'fleet_summary'),
    (r'(?:top|ranking).*truk.*hauling', 'top_hauling_trucks', 'top_hauling_trucks'),
    (r'(?:top|ranking).*excavator.*(?:hauling|loading)', 'top_hauling_excavators', 'top_hauling_excavators'),
    (r'truk.*(?:tercepat|fastest|paling\s+cepat|kecepatan.*tertinggi|speed.*tertinggi)', 'truck_fastest', 'truck_fastest'),
    (r'(?:tercepat|fastest|paling\s+cepat).*truk', 'truck_fastest', 'truck_fastest'),
    (r'truk.*(?:terlambat|slowest|paling\s+lambat|kecepatan.*terendah)', 'truck_slowest', 'truck_slowest'),
    (r'(?:terlambat|slowest|paling\s+lambat).*truk', 'truck_slowest', 'truck_slowest'),
    (r'truk.*(?:boros|konsumsi.*bbm.*(?:tertinggi|terbanyak)|fuel.*(?:tertinggi|terbanyak))', 'truck_most_fuel', 'truck_most_fuel'),
    (r'truk.*(?:hemat|konsumsi.*bbm.*(?:terendah|paling\s+sedikit)|fuel.*(?:terendah|paling\s+sedikit))', 'truck_least_fuel', 'truck_least_fuel'),
    (r'excavator.*(?:produksi|production).*(?:tertinggi|terbanyak)', 'excavator_highest_production', 'excavator_highest_production'),
    (r'operator.*(?:gaji|salary).*(?:tertinggi|terbesar)', 'operator_most_salary', 'operator_most_salary'),
    (r'operator.*rating.*(?:terendah|terburuk)', 'operator_lowest_rating', 'operator_lowest_rating'),
    (r'hauling.*(?:siklus|cycle).*(?:terlama|terpanjang|longest)', 'hauling_longest_cycle', 'hauling_longest_cycle'),
    (r'hauling.*(?:siklus|cycle).*(?:tercepat|terpendek|shortest)', 'hauling_shortest_cycle', 'hauling_shortest_cycle'),
    (r'hauling.*(?:muatan|load).*(?:terberat|terbesar|heaviest)', 'hauling_heaviest_load', 'hauling_heaviest_load'),
    (r'hauling.*(?:muatan|load).*(?:teringan|terkecil|lightest)', 'hauling_lightest_load', 'hauling_lightest_load'),
    (r'hauling.*(?:jarak|distance).*(?:terjauh|terpanjang|farthest)', 'hauling_farthest_distance', 'hauling_farthest_distance'),
    (r'produksi.*(?:tertinggi|terbesar|highest)', 'production_highest', 'production_highest'),
    (r'produksi.*(?:terendah|terkecil|lowest)', 'production_lowest', 'production_lowest'),
    (r'(?:achievement|pencapaian).*(?:terbaik|tertinggi|best)', 'production_best_achievement', 'production_best_achievement'),
    (r'(?:achievement|pencapaian).*(?:terburuk|terendah|worst)', 'production_worst_achievement', 'production_worst_achievement'),
    (r'insiden.*(?:biaya|cost).*(?:tertinggi|terbesar)', 'incident_highest_cost', 'incident_highest_cost'),
    (r'insiden.*(?:downtime).*(?:tertinggi|terlama)', 'incident_highest_downtime', 'incident_highest_downtime'),
    (r'maintenance.*(?:biaya|cost).*(?:tertinggi|terbesar)', 'maintenance_highest_cost', 'maintenance_highest_cost'),
    (r'maintenance.*(?:downtime).*(?:terlama|tertinggi)', 'maintenance_longest_downtime', 'maintenance_longest_downtime'),
    (r'(?:jalan|road).*(?:terpanjang|terjauh|longest)', 'road_longest', 'road_longest'),
    (r'(?:jalan|road).*(?:terpendek|terdekat|shortest)', 'road_shortest', 'road_shortest'),
    (r'(?:jalan|road).*(?:tercepat|kecepatan.*tertinggi)', 'road_fastest', 'road_fastest'),
    (r'(?:total|keseluruhan).*produksi', 'total_production_all', 'total_production_all'),
    (r'(?:total|keseluruhan).*hauling', 'total_hauling_stats', 'total_hauling_stats'),
    (r'(?:total|keseluruhan).*(?:bbm|fuel)', 'total_fuel_all', 'total_fuel_all'),
    (r'(?:total|keseluruhan).*(?:biaya\s+)?maintenance', 'total_maintenance_cost', 'total_maintenance_cost'),
    (r'(?:total|keseluruhan).*(?:biaya\s+)?insiden', 'total_incident_cost', 'total_incident_cost'),
    (r'(?:total|keseluruhan).*(?:shipment|pengiriman)', 'total_shipment_quantity', 'total_shipment_quantity'),
    (r'(?:cuaca|weather).*(?:sekarang|saat\s+ini|current|terkini)', 'weather_current', 'weather_current'),
    (r'barge.*(?:quantity|muatan).*(?:terbesar|tertinggi)', 'barge_highest_quantity', 'barge_highest_quantity'),
]

INTENT_KEYWORDS = {
    "count": ["berapa", "jumlah", "total", "banyak", "ada berapa", "hitung", "count"],
    "max": ["terbesar", "tertinggi", "maksimum", "paling besar", "paling tinggi", "biggest", "largest", "maximum", "top"],
    "min": ["terkecil", "terendah", "minimum", "paling kecil", "paling rendah", "smallest", "lowest", "minimum"],
    "avg": ["rata-rata", "average", "rerata", "mean"],
    "sum": ["total", "jumlah", "sum", "keseluruhan"],
    "list": ["daftar", "list", "semua", "tampilkan", "lihat", "show", "all"],
    "status": ["status", "kondisi", "keadaan", "state"],
    "recent": ["terbaru", "terakhir", "recent", "latest", "baru"],
    "compare": ["bandingkan", "compare", "perbandingan", "versus", "vs"],
    "trend": ["tren", "trend", "perkembangan", "history", "riwayat"],
    "detail": ["detail", "rinci", "lengkap", "info", "informasi"],
}

def get_fast_answer(question):
    question_lower = question.lower().strip()
    
    complex_indicators = [
        'dan', 'serta', 'juga', 'tampilkan', 'breakdown revenue', 'breakdown cost',
        'perbandingan', 'bandingkan', 'analisis', 'simulasi', 'profit', 'estimasi',
        'hitung', 'berdasarkan parameter', 'beserta', 'termasuk', ':'
    ]
    
    word_count = len(question_lower.split())
    has_complex_indicator = any(ind in question_lower for ind in complex_indicators)
    
    if word_count > 20 or has_complex_indicator:
        return None, None
    
    for pattern, query_key, answer_type in QUERY_PATTERNS:
        if re.search(pattern, question_lower):
            query = PREDEFINED_QUERIES.get(query_key)
            if query:
                return query, answer_type
    
    return None, None

def smart_query_builder(question):
    question_lower = question.lower()
    
    entity = None
    for keyword, info in SEMANTIC_QUERY_MAP.items():
        if keyword in question_lower:
            entity = info
            break
    
    if not entity:
        return None
    
    intent = None
    for intent_type, keywords in INTENT_KEYWORDS.items():
        if any(kw in question_lower for kw in keywords):
            intent = intent_type
            break
    
    if not intent:
        intent = "list"
    
    column = None
    for synonym, col_name in COLUMN_SYNONYMS.items():
        if synonym in question_lower:
            column = col_name
            break
    
    table = entity["table"]
    has_is_active = table in TABLES_WITH_IS_ACTIVE
    
    if intent == "count":
        if has_is_active:
            return f'SELECT COUNT(*) as total FROM {table} WHERE "isActive" = true'
        return f'SELECT COUNT(*) as total FROM {table}'
    elif intent == "max" and column:
        if has_is_active:
            return f'SELECT * FROM {table} WHERE "isActive" = true ORDER BY "{column}" DESC LIMIT 1'
        return f'SELECT * FROM {table} ORDER BY "{column}" DESC LIMIT 1'
    elif intent == "min" and column:
        if has_is_active:
            return f'SELECT * FROM {table} WHERE "isActive" = true ORDER BY "{column}" ASC LIMIT 1'
        return f'SELECT * FROM {table} ORDER BY "{column}" ASC LIMIT 1'
    elif intent == "avg" and column:
        if has_is_active:
            return f'SELECT ROUND(AVG("{column}")::numeric, 2) as avg_{column} FROM {table} WHERE "isActive" = true'
        return f'SELECT ROUND(AVG("{column}")::numeric, 2) as avg_{column} FROM {table}'
    elif intent == "status":
        if has_is_active:
            return f'SELECT status, COUNT(*) as count FROM {table} WHERE "isActive" = true GROUP BY status ORDER BY count DESC'
        return f'SELECT status, COUNT(*) as count FROM {table} GROUP BY status ORDER BY count DESC'
    elif intent == "recent":
        return f'SELECT * FROM {table} ORDER BY "createdAt" DESC LIMIT 10'
    elif intent == "list":
        if has_is_active:
            return f'SELECT * FROM {table} WHERE "isActive" = true LIMIT 20'
        return f'SELECT * FROM {table} LIMIT 20'
    
    return None

def format_fast_answer(query_type, df, question):
    if df.empty:
        return "Tidak ada data yang ditemukan."
    
    row = df.iloc[0]
    
    formatters = {
        'truck_count': lambda r: f"Berdasarkan data yang tersedia, jumlah truk aktif saat ini adalah **{r.get('total', r.iloc[0])} unit**.",
        'excavator_count': lambda r: f"Berdasarkan data yang tersedia, jumlah excavator aktif saat ini adalah **{r.get('total', r.iloc[0])} unit**.",
        'operator_count': lambda r: f"Jumlah operator aktif saat ini adalah **{r.get('total', r.iloc[0])} orang**.",
        'vessel_count': lambda r: f"Jumlah kapal/vessel aktif saat ini adalah **{r.get('total', r.iloc[0])} unit**.",
        'hauling_count': lambda r: f"Total aktivitas hauling yang tercatat adalah **{r.get('total', r.iloc[0]):,} trip**.",
        'loading_point_count': lambda r: f"Jumlah loading point aktif adalah **{r.get('total', r.iloc[0])} lokasi**.",
        'dumping_point_count': lambda r: f"Jumlah dumping point aktif adalah **{r.get('total', r.iloc[0])} lokasi**.",
        'road_count': lambda r: f"Jumlah segment jalan aktif adalah **{r.get('total', r.iloc[0])} segment**.",
        'incident_count': lambda r: f"Total insiden yang tercatat adalah **{r.get('total', r.iloc[0])} kejadian**.",
        'maintenance_count': lambda r: f"Total log maintenance adalah **{r.get('total', r.iloc[0])} record**.",
        'idle_trucks': lambda r: f"Saat ini terdapat **{r.get('total', r.iloc[0])} unit truk** dalam status IDLE (tersedia untuk digunakan).",
        'idle_excavators': lambda r: f"Saat ini terdapat **{r.get('total', r.iloc[0])} unit excavator** dalam status IDLE.",
        'maintenance_trucks': lambda r: f"Saat ini terdapat **{r.get('total', r.iloc[0])} unit truk** dalam status MAINTENANCE.",
        'breakdown_trucks': lambda r: f"Saat ini terdapat **{r.get('total', r.iloc[0])} unit truk** dalam status BREAKDOWN.",
        'hauling_trucks': lambda r: f"Saat ini terdapat **{r.get('total', r.iloc[0])} unit truk** yang sedang melakukan hauling.",
        'loading_trucks': lambda r: f"Saat ini terdapat **{r.get('total', r.iloc[0])} unit truk** yang sedang loading.",
        'largest_truck': lambda r: f"Truk dengan kapasitas terbesar adalah **{r.get('code', '')} ({r.get('name', '')})** dengan kapasitas **{r.get('capacity', 0):.1f} ton**, brand **{r.get('brand', '')}** model **{r.get('model', '')}**.",
        'smallest_truck': lambda r: f"Truk dengan kapasitas terkecil adalah **{r.get('code', '')} ({r.get('name', '')})** dengan kapasitas **{r.get('capacity', 0):.1f} ton**, brand **{r.get('brand', '')}** model **{r.get('model', '')}**.",
        'truck_fastest': lambda r: f"Truk tercepat adalah **{r.get('code', '')} ({r.get('name', '')})** dengan kecepatan rata-rata **{r.get('averageSpeed', 0):.1f} km/jam**, brand **{r.get('brand', '')}** model **{r.get('model', '')}**.",
        'truck_slowest': lambda r: f"Truk paling lambat adalah **{r.get('code', '')} ({r.get('name', '')})** dengan kecepatan rata-rata **{r.get('averageSpeed', 0):.1f} km/jam**, brand **{r.get('brand', '')}** model **{r.get('model', '')}**.",
        'truck_most_fuel': lambda r: f"Truk dengan konsumsi BBM tertinggi adalah **{r.get('code', '')} ({r.get('name', '')})** dengan konsumsi **{r.get('fuelConsumption', 0):.2f} liter/jam**, brand **{r.get('brand', '')}**.",
        'truck_least_fuel': lambda r: f"Truk dengan konsumsi BBM terendah adalah **{r.get('code', '')} ({r.get('name', '')})** dengan konsumsi **{r.get('fuelConsumption', 0):.2f} liter/jam**, brand **{r.get('brand', '')}**.",
        'truck_most_hours': lambda r: f"Truk dengan jam operasi terbanyak adalah **{r.get('code', '')} ({r.get('name', '')})** dengan total **{r.get('totalHours', 0):,.0f} jam**, brand **{r.get('brand', '')}** model **{r.get('model', '')}**.",
        'truck_most_distance': lambda r: f"Truk dengan jarak tempuh terbanyak adalah **{r.get('code', '')} ({r.get('name', '')})** dengan total **{r.get('totalDistance', 0):,.0f} km**, brand **{r.get('brand', '')}** model **{r.get('model', '')}**.",
        'excavator_highest_production': lambda r: f"Excavator dengan production rate tertinggi adalah **{r.get('code', '')} ({r.get('name', '')})** dengan rate **{r.get('productionRate', 0):.1f} ton/jam**, brand **{r.get('brand', '')}**.",
        'operator_highest_rating': lambda r: f"Operator dengan rating tertinggi adalah **{r.get('employeeNumber', '')}** dengan rating **{r.get('rating', 0):.1f}**, jam kerja **{r.get('totalHours', 0):,.0f} jam**, shift **{r.get('shift', '')}**.",
        'operator_lowest_rating': lambda r: f"Operator dengan rating terendah adalah **{r.get('employeeNumber', '')}** dengan rating **{r.get('rating', 0):.1f}**, jam kerja **{r.get('totalHours', 0):,.0f} jam**, shift **{r.get('shift', '')}**.",
        'operator_most_salary': lambda r: f"Operator dengan gaji tertinggi adalah **{r.get('employeeNumber', '')}** dengan gaji **Rp {r.get('salary', 0):,.0f}**, rating **{r.get('rating', 0):.1f}**, shift **{r.get('shift', '')}**.",
        'hauling_longest_cycle': lambda r: f"Hauling dengan cycle time terlama adalah **{r.get('activityNumber', '')}** dengan durasi **{r.get('totalCycleTime', 0):.0f} menit**, muatan **{r.get('loadWeight', 0):.1f} ton**, jarak **{r.get('distance', 0):.1f} km**, truk **{r.get('truck_code', '')}**.",
        'hauling_shortest_cycle': lambda r: f"Hauling dengan cycle time tercepat adalah **{r.get('activityNumber', '')}** dengan durasi **{r.get('totalCycleTime', 0):.0f} menit**, muatan **{r.get('loadWeight', 0):.1f} ton**, truk **{r.get('truck_code', '')}**.",
        'hauling_heaviest_load': lambda r: f"Hauling dengan muatan terberat adalah **{r.get('activityNumber', '')}** dengan berat **{r.get('loadWeight', 0):.1f} ton**, cycle time **{r.get('totalCycleTime', 0):.0f} menit**, truk **{r.get('truck_code', '')}** (kapasitas {r.get('capacity', 0):.0f} ton).",
        'hauling_lightest_load': lambda r: f"Hauling dengan muatan teringan adalah **{r.get('activityNumber', '')}** dengan berat **{r.get('loadWeight', 0):.1f} ton**, truk **{r.get('truck_code', '')}**.",
        'hauling_farthest_distance': lambda r: f"Hauling dengan jarak terjauh adalah **{r.get('activityNumber', '')}** dengan jarak **{r.get('distance', 0):.1f} km**, muatan **{r.get('loadWeight', 0):.1f} ton**, truk **{r.get('truck_code', '')}**.",
        'production_highest': lambda r: f"Produksi tertinggi tercatat pada **{str(r.get('recordDate', ''))[:10]}** shift **{r.get('shift', '')}** di **{r.get('site_name', '')}** dengan **{r.get('actualProduction', 0):,.0f} ton** (achievement {r.get('achievement', 0):.1f}%).",
        'production_lowest': lambda r: f"Produksi terendah tercatat pada **{str(r.get('recordDate', ''))[:10]}** shift **{r.get('shift', '')}** di **{r.get('site_name', '')}** dengan **{r.get('actualProduction', 0):,.0f} ton** (achievement {r.get('achievement', 0):.1f}%).",
        'production_best_achievement': lambda r: f"Achievement terbaik tercatat pada **{str(r.get('recordDate', ''))[:10]}** shift **{r.get('shift', '')}** di **{r.get('site_name', '')}** dengan **{r.get('achievement', 0):.1f}%** (produksi {r.get('actualProduction', 0):,.0f} ton).",
        'production_worst_achievement': lambda r: f"Achievement terburuk tercatat pada **{str(r.get('recordDate', ''))[:10]}** shift **{r.get('shift', '')}** di **{r.get('site_name', '')}** dengan **{r.get('achievement', 0):.1f}%** (produksi {r.get('actualProduction', 0):,.0f} ton).",
        'incident_highest_cost': lambda r: f"Insiden dengan biaya tertinggi adalah **{r.get('incidentNumber', '')}** tipe **{r.get('incidentType', '')}** severity **{r.get('severity', '')}** dengan estimasi biaya **Rp {r.get('estimatedCost', 0):,.0f}**, downtime **{r.get('downtimeHours', 0):.1f} jam**.",
        'incident_highest_downtime': lambda r: f"Insiden dengan downtime terlama adalah **{r.get('incidentNumber', '')}** tipe **{r.get('incidentType', '')}** severity **{r.get('severity', '')}** dengan downtime **{r.get('downtimeHours', 0):.1f} jam**, estimasi biaya **Rp {r.get('estimatedCost', 0):,.0f}**.",
        'maintenance_highest_cost': lambda r: f"Maintenance dengan biaya tertinggi adalah **{r.get('maintenanceNumber', '')}** tipe **{r.get('maintenanceType', '')}** dengan biaya **Rp {r.get('cost', 0):,.0f}**, downtime **{r.get('downtimeHours', 0):.1f} jam**.",
        'maintenance_longest_downtime': lambda r: f"Maintenance dengan downtime terlama adalah **{r.get('maintenanceNumber', '')}** tipe **{r.get('maintenanceType', '')}** dengan downtime **{r.get('downtimeHours', 0):.1f} jam**, biaya **Rp {r.get('cost', 0):,.0f}**.",
        'vessel_largest_capacity': lambda r: f"Vessel dengan kapasitas terbesar adalah **{r.get('code', '')} ({r.get('name', '')})** tipe **{r.get('vesselType', '')}** dengan kapasitas **{r.get('capacity', 0):,.0f} ton**, DWT **{r.get('dwt', 0):,.0f} ton**.",
        'vessel_largest_dwt': lambda r: f"Vessel dengan DWT terbesar adalah **{r.get('code', '')} ({r.get('name', '')})** tipe **{r.get('vesselType', '')}** dengan DWT **{r.get('dwt', 0):,.0f} ton**, kapasitas **{r.get('capacity', 0):,.0f} ton**.",
        'road_longest': lambda r: f"Jalan terpanjang adalah **{r.get('code', '')} ({r.get('name', '')})** dengan jarak **{r.get('distance', 0):.2f} km**, kondisi **{r.get('roadCondition', '')}**, max speed **{r.get('maxSpeed', 0):.0f} km/jam**.",
        'road_shortest': lambda r: f"Jalan terpendek adalah **{r.get('code', '')} ({r.get('name', '')})** dengan jarak **{r.get('distance', 0):.2f} km**, kondisi **{r.get('roadCondition', '')}**, max speed **{r.get('maxSpeed', 0):.0f} km/jam**.",
        'road_fastest': lambda r: f"Jalan dengan max speed tertinggi adalah **{r.get('code', '')} ({r.get('name', '')})** dengan max speed **{r.get('maxSpeed', 0):.0f} km/jam**, jarak **{r.get('distance', 0):.2f} km**, kondisi **{r.get('roadCondition', '')}**.",
        'weather_current': lambda r: f"Cuaca saat ini: **{r.get('condition', '')}**, suhu **{r.get('temperature', 0)}°C**, kelembaban **{r.get('humidity', 0)}%**, curah hujan **{r.get('rainfall', 0)} mm**, risk level **{r.get('riskLevel', '')}**, operasional: **{'Ya' if r.get('isOperational') else 'Tidak'}**.",
        'barge_highest_quantity': lambda r: f"Barge loading dengan quantity tertinggi adalah **{r.get('loadingNumber', '')}** vessel **{r.get('vesselName', '')}** dengan **{r.get('quantity', 0):,.0f} ton**, **{r.get('bargeTrips', 0)} trips**, shift **{r.get('shift', '')}**.",
        'total_production_all': lambda r: f"Total produksi keseluruhan: **{r.get('total_production', 0):,.0f} ton** dari **{r.get('total_records', 0):,} record** dengan rata-rata achievement **{r.get('avg_achievement', 0):.1f}%**.",
        'avg_truck_capacity': lambda r: f"Rata-rata kapasitas truk adalah **{r.get('avg_capacity', 0):.2f} ton** (Max: {r.get('max_capacity', 0):.1f} ton, Min: {r.get('min_capacity', 0):.1f} ton).",
        'avg_excavator_bucket': lambda r: f"Rata-rata kapasitas bucket excavator adalah **{r.get('avg_bucket', 0):.2f} m³** (Max: {r.get('max_bucket', 0):.1f} m³, Min: {r.get('min_bucket', 0):.1f} m³).",
        'avg_hauling_cycle': lambda r: f"Rata-rata siklus hauling: **{r.get('avg_cycle', 0) or 0:.1f} menit**, Rata-rata muatan: **{r.get('avg_load', 0) or 0:.1f} ton**, Rata-rata jarak: **{r.get('avg_distance', 0) or 0:.1f} km**.",
        'production_summary': lambda r: f"Total produksi tercatat: **{r.get('total_production', 0) or 0:,.0f} ton** dengan rata-rata achievement **{r.get('avg_achievement', 0) or 0:.1f}%**.",
        'fuel_consumption': lambda r: f"Total konsumsi BBM: **{r.get('total_liters', 0) or 0:,.0f} liter** dengan total biaya **Rp {r.get('total_cost', 0) or 0:,.0f}**.",
        'largest_excavator': lambda r: f"Excavator dengan bucket terbesar adalah **{r.get('code', 'N/A')} ({r.get('name', 'N/A')})** dengan kapasitas bucket **{r.get('bucketCapacity', 0) or 0:.1f} m³**, brand **{r.get('brand', 'N/A') or 'N/A'}** model **{r.get('model', 'N/A') or 'N/A'}**.",
        'smallest_excavator': lambda r: f"Excavator dengan bucket terkecil adalah **{r.get('code', 'N/A')} ({r.get('name', 'N/A')})** dengan kapasitas bucket **{r.get('bucketCapacity', 0) or 0:.1f} m³**, brand **{r.get('brand', 'N/A') or 'N/A'}** model **{r.get('model', 'N/A') or 'N/A'}**.",
        'largest_vessel': lambda r: f"Kapal dengan kapasitas terbesar adalah **{r.get('code', 'N/A')} ({r.get('name', 'N/A')})** dengan kapasitas **{r.get('capacity', 0) or 0:,.0f} ton**, DWT: **{r.get('dwt', 0) or 0:,.0f}**, tipe: **{r.get('vesselType', 'N/A') or 'N/A'}**.",
        'smallest_vessel': lambda r: f"Kapal dengan kapasitas terkecil adalah **{r.get('code', 'N/A')} ({r.get('name', 'N/A')})** dengan kapasitas **{r.get('capacity', 0) or 0:,.0f} ton**, DWT: **{r.get('dwt', 0) or 0:,.0f}**, tipe: **{r.get('vesselType', 'N/A') or 'N/A'}**.",
    }
    
    if query_type in formatters:
        try:
            return formatters[query_type](row)
        except Exception:
            pass
    
    if query_type == 'truck_status':
        lines = ["**Status Truk Saat Ini:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r['status']}: **{r['count']} unit**")
        return "\n".join(lines)
    
    if query_type == 'excavator_status':
        lines = ["**Status Excavator Saat Ini:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r['status']}: **{r['count']} unit**")
        return "\n".join(lines)
    
    if query_type == 'vessel_status':
        lines = ["**Status Vessel Saat Ini:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r['status']}: **{r['count']} unit**")
        return "\n".join(lines)
    
    if query_type == 'truck_brands':
        lines = ["**Distribusi Brand Truk:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r['brand']}: **{r['count']} unit**")
        return "\n".join(lines)
    
    if query_type == 'excavator_brands':
        lines = ["**Distribusi Brand Excavator:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r['brand']}: **{r['count']} unit**")
        return "\n".join(lines)
    
    if query_type == 'mining_sites':
        lines = ["**Daftar Mining Site Aktif:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r['code']}: **{r['name']}** (Tipe: {r.get('siteType', 'N/A')})")
        return "\n".join(lines)
    
    if query_type == 'recent_hauling':
        lines = ["**10 Aktivitas Hauling Terakhir:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r.get('activityNumber', 'N/A')}: Truk {r.get('truck_code', 'N/A')}, Muatan {r.get('loadWeight', 0):.1f} ton, Siklus {r.get('totalCycleTime', 0):.0f} menit ({r.get('status', 'N/A')})")
        return "\n".join(lines)
    
    if query_type == 'daily_production':
        lines = ["**Produksi 7 Hari Terakhir:**"]
        for _, r in df.iterrows():
            date_str = str(r.get('recordDate', ''))[:10]
            lines.append(f"- {date_str}: **{r.get('production', 0):,.0f} ton** (Achievement: {r.get('achievement', 0):.1f}%)")
        return "\n".join(lines)
    
    if query_type == 'weather':
        return f"**Cuaca Terkini:** {row.get('condition', 'N/A')}, Suhu: {row.get('temperature', 'N/A')}°C, Kelembaban: {row.get('humidity', 'N/A')}%, Curah Hujan: {row.get('rainfall', 0)} mm, Risk Level: {row.get('riskLevel', 'N/A')}"
    
    if query_type == 'recent_incidents':
        lines = ["**5 Insiden Terakhir:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r.get('incidentNumber', 'N/A')}: {r.get('incidentType', 'N/A')} (Severity: {r.get('severity', 'N/A')}, Tanggal: {str(r.get('incidentDate', ''))[:10]})")
        return "\n".join(lines)
    
    if query_type == 'schedules':
        lines = ["**Jadwal Pelayaran Aktif:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r.get('scheduleNumber', 'N/A')}: Status {r.get('status', 'N/A')}, Qty: {r.get('plannedQuantity', 0):,.0f} ton")
        return "\n".join(lines)
    
    if query_type == 'operator_shifts':
        lines = ["**Distribusi Operator per Shift:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r['shift']}: **{r['count']} operator**")
        return "\n".join(lines)
    
    if query_type == 'delay_categories':
        lines = ["**Kategori Delay:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r['category']}: **{r['count']} jenis**")
        return "\n".join(lines)
    
    if query_type == 'road_conditions':
        lines = ["**Kondisi Jalan:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r['condition']}: **{r['count']} segment**")
        return "\n".join(lines)
    
    if query_type == 'top_trucks_hours':
        lines = ["**Top 10 Truk Berdasarkan Jam Operasi:**"]
        for idx, r in df.iterrows():
            lines.append(f"{idx+1}. {r.get('code', 'N/A')} ({r.get('name', 'N/A')}): **{r.get('totalHours', 0):,.0f} jam**")
        return "\n".join(lines)
    
    if query_type == 'top_trucks_distance':
        lines = ["**Top 10 Truk Berdasarkan Jarak Tempuh:**"]
        for idx, r in df.iterrows():
            lines.append(f"{idx+1}. {r.get('code', 'N/A')} ({r.get('name', 'N/A')}): **{r.get('totalDistance', 0):,.0f} km**")
        return "\n".join(lines)
    
    if query_type == 'largest_excavator':
        return f"Excavator dengan bucket terbesar adalah **{row.get('code', '')} ({row.get('name', '')})** dengan bucket **{row.get('bucketCapacity', 0):.1f} m³**, brand **{row.get('brand', '')}** model **{row.get('model', '')}**."
    
    if query_type == 'smallest_excavator':
        return f"Excavator dengan bucket terkecil adalah **{row.get('code', '')} ({row.get('name', '')})** dengan bucket **{row.get('bucketCapacity', 0):.1f} m³**, brand **{row.get('brand', '')}** model **{row.get('model', '')}**."
    
    if query_type == 'largest_vessel':
        return f"Kapal dengan kapasitas terbesar adalah **{row.get('code', '')} ({row.get('name', '')})** dengan kapasitas **{row.get('capacity', 0):,.0f} ton**, DWT **{row.get('dwt', 0):,.0f} ton**, tipe **{row.get('vesselType', '')}**."
    
    if query_type == 'smallest_vessel':
        return f"Kapal dengan kapasitas terkecil adalah **{row.get('code', '')} ({row.get('name', '')})** dengan kapasitas **{row.get('capacity', 0):,.0f} ton**, DWT **{row.get('dwt', 0):,.0f} ton**, tipe **{row.get('vesselType', '')}**."
    
    if query_type == 'production_today':
        return f"Produksi hari ini: **{row.get('total', 0):,.0f} ton** dengan rata-rata achievement **{row.get('avg_achievement', 0):.1f}%**."
    
    if query_type == 'production_this_month':
        return f"Produksi bulan ini: **{row.get('total', 0):,.0f} ton** dengan rata-rata achievement **{row.get('avg_achievement', 0):.1f}%**."
    
    if query_type == 'production_by_site':
        lines = ["**Produksi per Mining Site:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r.get('site_name', 'N/A')}: **{r.get('total_production', 0):,.0f} ton** (Achievement: {r.get('avg_achievement', 0):.1f}%)")
        return "\n".join(lines)
    
    if query_type == 'production_vs_target':
        lines = ["**Target vs Aktual Produksi (7 Hari Terakhir):**"]
        for _, r in df.iterrows():
            date_str = str(r.get('recordDate', ''))[:10]
            lines.append(f"- {date_str}: Target **{r.get('targetProduction', 0):,.0f}** vs Aktual **{r.get('actualProduction', 0):,.0f}** (Achievement: {r.get('achievement', 0):.1f}%)")
        return "\n".join(lines)
    
    if query_type == 'hauling_delayed':
        return f"Total hauling yang mengalami delay: **{row.get('total', 0):,} trip**."
    
    if query_type == 'hauling_completed':
        return f"Total hauling yang selesai (COMPLETED): **{row.get('total', 0):,} trip**."
    
    if query_type == 'hauling_in_progress':
        return f"Total hauling yang sedang berjalan: **{row.get('total', 0):,} trip**."
    
    if query_type == 'hauling_by_shift':
        lines = ["**Statistik Hauling per Shift:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r['shift']}: **{r.get('total_trips', 0):,} trip**, Avg Load: {r.get('avg_load', 0):.1f} ton, Avg Cycle: {r.get('avg_cycle', 0):.0f} menit")
        return "\n".join(lines)
    
    if query_type == 'hauling_performance':
        lines = ["**Performa Hauling 7 Hari Terakhir:**"]
        for _, r in df.iterrows():
            date_str = str(r.get('date', ''))[:10]
            lines.append(f"- {date_str}: **{r.get('trips', 0):,} trip**, Total: {r.get('total_hauled', 0):,.0f} ton, Avg Load: {r.get('avg_load', 0):.1f} ton")
        return "\n".join(lines)
    
    if query_type == 'weather_history':
        lines = ["**Riwayat Cuaca 7 Hari Terakhir:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r['condition']}: **{r['count']} kejadian**")
        return "\n".join(lines)
    
    if query_type == 'incidents_by_type':
        lines = ["**Insiden per Tipe:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r['incidentType']}: **{r['count']} kejadian**")
        return "\n".join(lines)
    
    if query_type == 'incidents_by_severity':
        lines = ["**Insiden per Severity:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r['severity']}: **{r['count']} kejadian**")
        return "\n".join(lines)
    
    if query_type == 'incidents_this_month':
        return f"Total insiden bulan ini: **{row.get('total', 0)} kejadian**."
    
    if query_type == 'maintenance_by_type':
        lines = ["**Maintenance per Tipe:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r['maintenanceType']}: **{r['count']} job**")
        return "\n".join(lines)
    
    if query_type == 'maintenance_pending':
        return f"Total maintenance yang pending/scheduled: **{row.get('total', 0)} job**."
    
    if query_type == 'maintenance_completed_month':
        return f"Total maintenance selesai bulan ini: **{row.get('total', 0)} job**."
    
    if query_type == 'fuel_this_month':
        return f"Konsumsi BBM bulan ini: **{row.get('total_liters', 0):,.0f} liter** dengan total biaya **Rp {row.get('total_cost', 0):,.0f}**."
    
    if query_type == 'fuel_by_equipment':
        lines = ["**Konsumsi BBM per Tipe Equipment:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r['equipment_type']}: **{r.get('total_liters', 0):,.0f} liter** (Rp {r.get('total_cost', 0):,.0f})")
        return "\n".join(lines)
    
    if query_type == 'vessels_by_type':
        lines = ["**Kapal per Tipe:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r['vesselType']}: **{r['count']} unit**")
        return "\n".join(lines)
    
    if query_type == 'vessels_loading':
        lines = ["**Kapal Sedang Loading:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r['code']}: {r['name']} (Kapasitas: {r.get('capacity', 0):,.0f} ton)")
        return "\n".join(lines)
    
    if query_type == 'schedules_this_month':
        return f"Total jadwal pelayaran bulan ini: **{row.get('total', 0)} jadwal**."
    
    if query_type == 'shipments_this_month':
        return f"Pengiriman bulan ini: **{row.get('total_shipments', 0)} shipment** dengan total quantity **{row.get('total_quantity', 0):,.0f} ton**."
    
    if query_type == 'support_equipment_count':
        lines = ["**Support Equipment per Tipe:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r['equipmentType']}: **{r['count']} unit**")
        return "\n".join(lines)
    
    if query_type == 'queue_avg_wait':
        return f"Rata-rata waktu tunggu antrian: **{row.get('avg_wait_minutes', 0):.1f} menit**."
    
    if query_type == 'loading_points_with_excavator':
        lines = ["**Loading Point dan Excavator:**"]
        for _, r in df.iterrows():
            exc = r.get('excavator_code', 'N/A') or 'Tidak ada'
            lines.append(f"- {r['code']}: {r['name']} → Excavator: {exc}")
        return "\n".join(lines)
    
    if query_type == 'top_operators_hours':
        lines = ["**Top 10 Operator Berdasarkan Jam Kerja:**"]
        for idx, r in df.iterrows():
            lines.append(f"{idx+1}. {r.get('employeeNumber', 'N/A')}: **{r.get('totalHours', 0):,.0f} jam** (Rating: {r.get('rating', 0):.1f}, Shift: {r.get('shift', 'N/A')})")
        return "\n".join(lines)
    
    if query_type == 'top_operators_rating':
        lines = ["**Top 10 Operator Berdasarkan Rating:**"]
        for idx, r in df.iterrows():
            lines.append(f"{idx+1}. {r.get('employeeNumber', 'N/A')}: **Rating {r.get('rating', 0):.1f}** ({r.get('totalHours', 0):,.0f} jam, Shift: {r.get('shift', 'N/A')})")
        return "\n".join(lines)
    
    if query_type == 'delay_analysis':
        lines = ["**Analisis Penyebab Delay (Top 10):**"]
        for idx, r in df.iterrows():
            lines.append(f"{idx+1}. [{r.get('category', 'N/A')}] {r.get('name', 'N/A')}: **{r.get('occurrences', 0)} kejadian**")
        return "\n".join(lines)
    
    if query_type == 'efficiency_summary':
        return f"Ringkasan Efisiensi: Load Efficiency **{row.get('avg_load_efficiency', 0):.1f}%**, Utilization Rate **{row.get('avg_utilization', 0):.1f}%**."
    
    if query_type == 'downtime_summary':
        return f"Ringkasan Downtime (7 hari): Total **{row.get('total_downtime', 0):.1f} jam**, Rata-rata **{row.get('avg_downtime', 0):.1f} jam/hari**."
    
    if query_type == 'cost_summary_maintenance':
        return f"Biaya Maintenance (30 hari): Total **Rp {row.get('total_cost', 0):,.0f}** dari **{row.get('total_jobs', 0)} job**."
    
    if query_type == 'cost_summary_fuel':
        return f"Biaya BBM (30 hari): Total **Rp {row.get('total_cost', 0):,.0f}** untuk **{row.get('total_liters', 0):,.0f} liter**."
    
    if query_type == 'fleet_summary':
        return f"**Ringkasan Armada:** Truk: **{row.get('total_trucks', 0)} unit**, Excavator: **{row.get('total_excavators', 0)} unit**, Vessel: **{row.get('total_vessels', 0)} unit**, Operator: **{row.get('total_operators', 0)} orang**."
    
    if query_type == 'top_hauling_trucks':
        lines = ["**Top 10 Truk Hauling (7 Hari Terakhir):**"]
        for idx, r in df.iterrows():
            lines.append(f"{idx+1}. {r.get('code', 'N/A')} ({r.get('name', 'N/A')}): **{r.get('total_trips', 0)} trip**, Total: {r.get('total_hauled', 0):,.0f} ton")
        return "\n".join(lines)
    
    if query_type == 'top_hauling_excavators':
        lines = ["**Top 10 Excavator Loading (7 Hari Terakhir):**"]
        for idx, r in df.iterrows():
            lines.append(f"{idx+1}. {r.get('code', 'N/A')} ({r.get('name', 'N/A')}): **{r.get('total_trips', 0)} trip**, Total: {r.get('total_loaded', 0):,.0f} ton")
        return "\n".join(lines)
    
    if query_type == 'truck_details_all':
        lines = [f"**Daftar Truk Aktif ({len(df)} unit):**"]
        for _, r in df.head(15).iterrows():
            lines.append(f"- {r['code']}: {r['name']} | {r.get('brand', 'N/A')} {r.get('model', '')} | {r.get('capacity', 0):.0f}t | {r['status']}")
        if len(df) > 15:
            lines.append(f"... dan {len(df)-15} truk lainnya")
        return "\n".join(lines)
    
    if query_type == 'excavator_details_all':
        lines = [f"**Daftar Excavator Aktif ({len(df)} unit):**"]
        for _, r in df.head(15).iterrows():
            lines.append(f"- {r['code']}: {r['name']} | {r.get('brand', 'N/A')} | Bucket: {r.get('bucketCapacity', 0):.1f}m³ | {r['status']}")
        if len(df) > 15:
            lines.append(f"... dan {len(df)-15} excavator lainnya")
        return "\n".join(lines)
    
    if query_type == 'operator_details_all':
        lines = [f"**Daftar Operator ({len(df)} orang):**"]
        for _, r in df.head(15).iterrows():
            lines.append(f"- {r['employeeNumber']}: {r.get('licenseType', 'N/A')} | {r['status']} | {r.get('shift', 'N/A')} | Rating: {r.get('rating', 0):.1f}")
        if len(df) > 15:
            lines.append(f"... dan {len(df)-15} operator lainnya")
        return "\n".join(lines)
    
    return f"Data ditemukan: {len(df)} baris."

def get_predefined_query(question):
    question_lower = question.lower()
    
    fast_query, _ = get_fast_answer(question)
    if fast_query:
        return fast_query
    
    smart_query = smart_query_builder(question)
    if smart_query:
        return smart_query
    
    return None

DYNAMIC_TABLE_MAP = {
    "trucks": {
        "columns": ["id", "code", "name", "brand", "model", "yearManufacture", "capacity", "fuelCapacity", "fuelConsumption", "averageSpeed", "maintenanceCost", "status", "lastMaintenance", "nextMaintenance", "totalHours", "totalDistance", "currentOperatorId", "currentLocation", "isActive", "purchaseDate", "retirementDate", "remarks", "createdAt", "updatedAt"],
        "numeric_cols": ["capacity", "fuelCapacity", "fuelConsumption", "averageSpeed", "maintenanceCost", "totalHours", "totalDistance", "yearManufacture"],
        "status_enum": ["IDLE", "HAULING", "LOADING", "DUMPING", "IN_QUEUE", "MAINTENANCE", "BREAKDOWN", "REFUELING", "STANDBY", "OUT_OF_SERVICE"]
    },
    "excavators": {
        "columns": ["id", "code", "name", "brand", "model", "yearManufacture", "bucketCapacity", "productionRate", "fuelConsumption", "maintenanceCost", "status", "lastMaintenance", "nextMaintenance", "totalHours", "currentLocation", "isActive", "purchaseDate", "retirementDate", "remarks", "createdAt", "updatedAt"],
        "numeric_cols": ["bucketCapacity", "productionRate", "fuelConsumption", "maintenanceCost", "totalHours", "yearManufacture"],
        "status_enum": ["ACTIVE", "IDLE", "MAINTENANCE", "BREAKDOWN", "STANDBY", "OUT_OF_SERVICE"]
    },
    "operators": {
        "columns": ["id", "userId", "employeeNumber", "licenseNumber", "licenseType", "licenseExpiry", "competency", "status", "shift", "totalHours", "rating", "salary", "joinDate", "resignDate", "createdAt", "updatedAt"],
        "numeric_cols": ["totalHours", "rating", "salary"],
        "status_enum": ["ACTIVE", "ON_LEAVE", "SICK", "RESIGNED", "SUSPENDED"]
    },
    "hauling_activities": {
        "columns": ["id", "activityNumber", "truckId", "excavatorId", "operatorId", "excavatorOperatorId", "supervisorId", "loadingPointId", "dumpingPointId", "roadSegmentId", "shift", "queueStartTime", "queueEndTime", "loadingStartTime", "loadingEndTime", "departureTime", "arrivalTime", "dumpingStartTime", "dumpingEndTime", "returnTime", "queueDuration", "loadingDuration", "haulingDuration", "dumpingDuration", "returnDuration", "totalCycleTime", "loadWeight", "targetWeight", "loadEfficiency", "distance", "fuelConsumed", "status", "weatherCondition", "roadCondition", "isDelayed", "delayMinutes", "delayReasonId", "delayReasonDetail", "predictedDelayRisk", "predictedDelayMinutes", "remarks", "createdAt", "updatedAt"],
        "numeric_cols": ["queueDuration", "loadingDuration", "haulingDuration", "dumpingDuration", "returnDuration", "totalCycleTime", "loadWeight", "targetWeight", "loadEfficiency", "distance", "fuelConsumed", "delayMinutes", "predictedDelayMinutes"],
        "status_enum": ["PLANNED", "IN_QUEUE", "LOADING", "HAULING", "DUMPING", "RETURNING", "COMPLETED", "DELAYED", "CANCELLED", "INCIDENT"]
    },
    "production_records": {
        "columns": ["id", "recordDate", "shift", "miningSiteId", "targetProduction", "actualProduction", "achievement", "avgCalori", "avgAshContent", "avgSulfur", "avgMoisture", "totalTrips", "totalDistance", "totalFuel", "avgCycleTime", "trucksOperating", "trucksBreakdown", "excavatorsOperating", "excavatorsBreakdown", "downtimeHours", "utilizationRate", "equipmentAllocation", "remarks", "createdAt", "updatedAt"],
        "numeric_cols": ["targetProduction", "actualProduction", "achievement", "avgCalori", "avgAshContent", "avgSulfur", "avgMoisture", "totalTrips", "totalDistance", "totalFuel", "avgCycleTime", "trucksOperating", "trucksBreakdown", "excavatorsOperating", "excavatorsBreakdown", "downtimeHours", "utilizationRate"],
        "status_enum": []
    },
    "vessels": {
        "columns": ["id", "code", "name", "vesselType", "gt", "dwt", "loa", "capacity", "owner", "isOwned", "status", "currentLocation", "isActive", "remarks", "createdAt", "updatedAt"],
        "numeric_cols": ["gt", "dwt", "loa", "capacity"],
        "status_enum": ["AVAILABLE", "LOADING", "SAILING", "DISCHARGING", "MAINTENANCE", "CHARTERED"]
    },
    "mining_sites": {
        "columns": ["id", "code", "name", "siteType", "isActive", "latitude", "longitude", "elevation", "capacity", "description", "createdAt", "updatedAt"],
        "numeric_cols": ["latitude", "longitude", "elevation", "capacity"],
        "status_enum": []
    },
    "maintenance_logs": {
        "columns": ["id", "maintenanceNumber", "truckId", "excavatorId", "supportEquipmentId", "maintenanceType", "scheduledDate", "actualDate", "completionDate", "duration", "cost", "description", "partsReplaced", "mechanicName", "status", "downtimeHours", "remarks", "createdAt", "updatedAt"],
        "numeric_cols": ["duration", "cost", "downtimeHours"],
        "status_enum": ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "DELAYED"]
    },
    "incident_reports": {
        "columns": ["id", "incidentNumber", "incidentDate", "reportDate", "location", "miningSiteCode", "truckId", "excavatorId", "reportedById", "operatorId", "incidentType", "severity", "description", "rootCause", "injuries", "fatalities", "equipmentDamage", "productionLoss", "estimatedCost", "downtimeHours", "status", "actionTaken", "preventiveMeasure", "photos", "documents", "remarks", "createdAt", "updatedAt"],
        "numeric_cols": ["injuries", "fatalities", "productionLoss", "estimatedCost", "downtimeHours"],
        "status_enum": ["REPORTED", "INVESTIGATING", "RESOLVED", "CLOSED"]
    },
    "fuel_consumptions": {
        "columns": ["id", "consumptionDate", "truckId", "excavatorId", "supportEquipmentId", "fuelType", "quantity", "costPerLiter", "totalCost", "operatingHours", "distance", "fuelEfficiency", "fuelStation", "remarks", "createdAt", "updatedAt"],
        "numeric_cols": ["quantity", "costPerLiter", "totalCost", "operatingHours", "distance", "fuelEfficiency"],
        "status_enum": []
    },
    "weather_logs": {
        "columns": ["id", "timestamp", "miningSiteId", "condition", "temperature", "humidity", "windSpeed", "windDirection", "rainfall", "visibility", "waveHeight", "seaCondition", "isOperational", "riskLevel", "remarks"],
        "numeric_cols": ["temperature", "humidity", "windSpeed", "rainfall", "waveHeight"],
        "status_enum": []
    },
    "sailing_schedules": {
        "columns": ["id", "scheduleNumber", "vesselId", "voyageNumber", "loadingPort", "destination", "etaLoading", "etsLoading", "etaDestination", "ataLoading", "loadingStart", "loadingComplete", "atsLoading", "ataDestination", "plannedQuantity", "actualQuantity", "buyer", "contractNumber", "status", "remarks", "createdAt", "updatedAt"],
        "numeric_cols": ["plannedQuantity", "actualQuantity"],
        "status_enum": ["SCHEDULED", "STANDBY", "LOADING", "SAILING", "ARRIVED", "DISCHARGING", "COMPLETED", "CANCELLED"]
    },
    "shipment_records": {
        "columns": ["id", "shipmentNumber", "vesselId", "sailingScheduleId", "shipmentDate", "loadingDate", "coalType", "quantity", "calorie", "totalMoisture", "ashContent", "sulfurContent", "stockpileOrigin", "buyer", "destination", "surveyorName", "blNumber", "coaNumber", "freightCost", "totalFreight", "remarks", "createdAt", "updatedAt"],
        "numeric_cols": ["quantity", "calorie", "totalMoisture", "ashContent", "sulfurContent", "freightCost", "totalFreight"],
        "status_enum": []
    },
    "loading_points": {
        "columns": ["id", "code", "name", "miningSiteId", "excavatorId", "isActive", "maxQueueSize", "latitude", "longitude", "coalSeam", "coalQuality", "createdAt", "updatedAt"],
        "numeric_cols": ["maxQueueSize", "latitude", "longitude"],
        "status_enum": []
    },
    "dumping_points": {
        "columns": ["id", "code", "name", "miningSiteId", "dumpingType", "isActive", "capacity", "currentStock", "latitude", "longitude", "createdAt", "updatedAt"],
        "numeric_cols": ["capacity", "currentStock", "latitude", "longitude"],
        "status_enum": []
    },
    "road_segments": {
        "columns": ["id", "code", "name", "miningSiteId", "startPoint", "endPoint", "distance", "roadCondition", "maxSpeed", "gradient", "isActive", "lastMaintenance", "createdAt", "updatedAt"],
        "numeric_cols": ["distance", "maxSpeed", "gradient"],
        "status_enum": []
    },
    "support_equipment": {
        "columns": ["id", "code", "name", "equipmentType", "brand", "model", "status", "lastMaintenance", "totalHours", "isActive", "createdAt", "updatedAt"],
        "numeric_cols": ["totalHours"],
        "status_enum": ["ACTIVE", "IDLE", "MAINTENANCE", "BREAKDOWN", "OUT_OF_SERVICE"]
    },
    "delay_reasons": {
        "columns": ["id", "code", "category", "name", "description", "isActive"],
        "numeric_cols": [],
        "status_enum": []
    },
    "queue_logs": {
        "columns": ["id", "loadingPointId", "truckId", "queueLength", "queueStartTime", "queueEndTime", "waitingTime", "timestamp"],
        "numeric_cols": ["queueLength", "waitingTime"],
        "status_enum": []
    },
    "barge_loading_logs": {
        "columns": ["id", "loadingNumber", "vesselCode", "vesselName", "loadingDate", "shift", "startTime", "endTime", "stockpileSource", "quantity", "loaderUsed", "bargeTrips", "weatherCondition", "tidalCondition", "delayMinutes", "delayReason", "remarks", "createdAt", "updatedAt"],
        "numeric_cols": ["quantity", "bargeTrips", "delayMinutes"],
        "status_enum": []
    },
    "berthing_logs": {
        "columns": ["id", "jettyBerthId", "vesselCode", "vesselName", "arrivalTime", "berthingTime", "loadingStart", "loadingEnd", "departureTime", "draftArrival", "draftDeparture", "waitingTime", "remarks", "createdAt", "updatedAt"],
        "numeric_cols": ["draftArrival", "draftDeparture", "waitingTime"],
        "status_enum": []
    },
    "jetty_berths": {
        "columns": ["id", "code", "name", "portName", "maxVesselSize", "maxDraft", "hasConveyor", "loadingCapacity", "isActive", "remarks", "createdAt", "updatedAt"],
        "numeric_cols": ["maxVesselSize", "maxDraft", "loadingCapacity"],
        "status_enum": []
    },
    "users": {
        "columns": ["id", "username", "email", "password", "fullName", "role", "isActive", "lastLogin", "createdAt", "updatedAt"],
        "numeric_cols": [],
        "status_enum": []
    }
}

ALL_TABLE_NAMES = list(DYNAMIC_TABLE_MAP.keys())

def detect_tables_from_question(question):
    question_lower = question.lower()
    detected = []
    table_keywords = {
        "trucks": ["truk", "truck", "armada", "kendaraan", "angkutan"],
        "excavators": ["excavator", "ekskavator", "alat berat", "loader", "backhoe"],
        "operators": ["operator", "pengemudi", "driver", "pekerja"],
        "hauling_activities": ["hauling", "pengangkutan", "trip", "ritase", "siklus", "cycle"],
        "production_records": ["produksi", "production", "output", "hasil", "achievement", "target"],
        "vessels": ["kapal", "vessel", "tongkang", "barge", "tug", "ship"],
        "mining_sites": ["site", "tambang", "pit", "lokasi", "area"],
        "maintenance_logs": ["maintenance", "perawatan", "perbaikan", "servis", "service"],
        "incident_reports": ["insiden", "incident", "kecelakaan", "accident", "kejadian"],
        "fuel_consumptions": ["bbm", "fuel", "bahan bakar", "solar", "bensin", "konsumsi"],
        "weather_logs": ["cuaca", "weather", "hujan", "suhu", "temperature"],
        "sailing_schedules": ["jadwal", "schedule", "pelayaran", "sailing", "voyage"],
        "shipment_records": ["pengiriman", "shipment", "kiriman", "ekspor"],
        "loading_points": ["loading point", "titik muat", "pit loading"],
        "dumping_points": ["dumping point", "titik buang", "stockpile"],
        "road_segments": ["jalan", "road", "segment", "rute", "jalur"],
        "support_equipment": ["support equipment", "alat pendukung", "grader", "dozer", "water truck"],
        "delay_reasons": ["delay", "keterlambatan", "alasan", "penyebab"],
        "queue_logs": ["antrian", "queue", "tunggu", "waiting"],
        "barge_loading_logs": ["barge loading", "muat tongkang"],
        "berthing_logs": ["sandar", "berthing", "dermaga"],
        "jetty_berths": ["jetty", "dermaga", "pelabuhan"],
        "users": ["user", "pengguna", "akun", "login"]
    }
    for table, keywords in table_keywords.items():
        if any(kw in question_lower for kw in keywords):
            detected.append(table)
    return detected if detected else ["trucks", "hauling_activities", "production_records"]

def is_out_of_scope(question):
    question_lower = question.lower()
    out_of_scope_keywords = [
        "politik", "agama", "sepak bola", "film", "musik", "resep", "masakan",
        "berita", "gosip", "artis", "selebriti", "bitcoin", "crypto", "forex",
        "saham non mining", "investasi", "jodoh", "cinta", "pacaran", "game online"
    ]
    mining_keywords = [
        "truk", "truck", "excavator", "hauling", "produksi", "production", "tambang",
        "mining", "batubara", "coal", "vessel", "kapal", "operator", "maintenance",
        "fuel", "bbm", "cuaca", "jadwal", "schedule", "insiden", "incident",
        "delay", "keterlambatan", "jalan", "road", "loading", "dumping", "shift",
        "ton", "kapasitas", "cycle", "siklus", "operasi", "alat", "equipment"
    ]
    has_out_of_scope = any(kw in question_lower for kw in out_of_scope_keywords)
    has_mining_context = any(kw in question_lower for kw in mining_keywords)
    if has_out_of_scope and not has_mining_context:
        return True
    return False

def generate_sql_query(user_question, context=None):
    if is_out_of_scope(user_question):
        return None
    
    enhanced_question = user_question
    if context:
        entities = context.get('entities', {})
        if is_follow_up_question(user_question):
            if entities.get('production_ids') and 'produksi' not in user_question.lower() and 'production' not in user_question.lower():
                prod_ids = entities['production_ids']
                enhanced_question = f"{user_question} (Konteks: production record ID yang dimaksud adalah {', '.join(prod_ids)})"
            if entities.get('truck_ids') and 'truk' not in user_question.lower():
                enhanced_question = f"{user_question} (Konteks: truck ID yang dimaksud adalah {', '.join(entities['truck_ids'])})"
        
    predefined = get_predefined_query(enhanced_question)
    if predefined:
        return predefined
    
    detected_tables = detect_tables_from_question(enhanced_question)
    relevant_schema = []
    for table in detected_tables[:5]:
        if table in DYNAMIC_TABLE_MAP:
            info = DYNAMIC_TABLE_MAP[table]
            relevant_schema.append(f"Table: {table}\nColumns: {', '.join(info['columns'])}\nNumeric: {', '.join(info['numeric_cols'])}\nStatus values: {', '.join(info['status_enum'])}")
    
    schema_context = "\n\n".join(relevant_schema)
    
    context_prompt = build_context_prompt(context) if context else ""
    
    prompt = f"""You are an expert PostgreSQL query generator for a mining operations database.

DETECTED RELEVANT TABLES:
{schema_context}

FULL SCHEMA REFERENCE:
{FULL_DATABASE_SCHEMA}

{f"CONVERSATION CONTEXT:{chr(10)}{context_prompt}" if context_prompt else ""}

USER QUESTION: {enhanced_question}

IMPORTANT CONTEXT RULES:
- If the question mentions "sisa" (remaining), "kurang" (shortage), or asks "berapa lagi" (how much more), calculate: ("targetProduction" - "actualProduction")
- If conversation context mentions specific IDs (like production IDs starting with 'cm'), use them in WHERE clause with LIKE 'id%' pattern
- For follow-up questions about the same record, reference the IDs from context
- When calculating remaining/shortage: SELECT ("targetProduction" - "actualProduction") as remaining_tons

TASK: Generate a valid PostgreSQL SELECT query to answer the user's question.

ABSOLUTE RULES - FOLLOW EXACTLY:
1. Output ONLY the raw SQL query - no explanations, no markdown, no code blocks, no comments
2. CamelCase columns MUST use double quotes: "isActive", "loadWeight", "createdAt", "totalCycleTime", "bucketCapacity", "totalHours", "actualProduction", "targetProduction"
3. Enum values MUST be UPPERCASE in single quotes: 'IDLE', 'ACTIVE', 'COMPLETED', 'SHIFT_1'
4. Boolean: lowercase without quotes: true, false
5. For "largest/terbesar/tertinggi/maksimum": ORDER BY column DESC LIMIT 1
6. For "smallest/terkecil/terendah/minimum": ORDER BY column ASC LIMIT 1
7. For counts: SELECT COUNT(*) as total
8. For "available/tersedia/idle": status = 'IDLE' AND "isActive" = true
9. Use COALESCE for aggregates: COALESCE(SUM(...), 0), COALESCE(AVG(...), 0)
10. Date ranges: WHERE "recordDate" >= CURRENT_DATE - INTERVAL '7 days'
11. JOINs: JOIN trucks t ON h."truckId" = t.id
12. LIMIT large results: LIMIT 50
13. If question is about comparison/analysis across multiple entities, use appropriate JOINs
14. For "rata-rata/average": use AVG() with ROUND() and COALESCE
15. For "total/sum/jumlah keseluruhan": use SUM() with COALESCE
16. For partial ID matches (e.g., 'cmj2lperp0'): use id LIKE 'cmj2lperp0%'
17. For "sisa/remaining/kurang": SELECT id, "targetProduction", "actualProduction", ("targetProduction" - "actualProduction") as sisa_ton

COMMON PATTERNS:
- Truk kapasitas terbesar: SELECT code, name, capacity FROM trucks WHERE "isActive" = true ORDER BY capacity DESC LIMIT 1
- Excavator bucket terbesar: SELECT code, name, "bucketCapacity" FROM excavators WHERE "isActive" = true ORDER BY "bucketCapacity" DESC LIMIT 1
- Total produksi: SELECT COALESCE(SUM("actualProduction"), 0) as total FROM production_records
- Sisa produksi untuk ID tertentu: SELECT id, "targetProduction", "actualProduction", ("targetProduction" - "actualProduction") as sisa_ton FROM production_records WHERE id LIKE 'xxx%'
- Hauling dengan delay: SELECT * FROM hauling_activities WHERE "isDelayed" = true LIMIT 50
- Status distribution: SELECT status, COUNT(*) as count FROM trucks WHERE "isActive" = true GROUP BY status
- Join hauling with truck: SELECT h.*, t.code as truck_code FROM hauling_activities h JOIN trucks t ON h."truckId" = t.id

SQL Query:"""
    
    try:
        response = ollama.chat(model=MODEL_NAME, messages=[
            {'role': 'system', 'content': 'You are a PostgreSQL expert. Output ONLY the raw SQL SELECT statement. No explanations, no markdown, no code blocks. Use double quotes for camelCase columns. Use single quotes for enum values. For partial ID matching, use LIKE with wildcard %.'},
            {'role': 'user', 'content': prompt}
        ])
        sql = response['message']['content'].strip()
        
        sql = re.sub(r'```sql\s*', '', sql, flags=re.IGNORECASE)
        sql = re.sub(r'```\s*', '', sql)
        sql = re.sub(r'^SQL:\s*', '', sql, flags=re.IGNORECASE)
        sql = re.sub(r'^Query:\s*', '', sql, flags=re.IGNORECASE)
        sql = sql.strip()
        
        lines = sql.split('\n')
        clean_lines = []
        for line in lines:
            if line and not line.startswith('--') and not line.lower().startswith('here') and not line.lower().startswith('this'):
                clean_lines.append(line)
        sql = ' '.join(clean_lines)
        
        if not sql.upper().startswith('SELECT'):
            select_match = re.search(r'(SELECT\s+.+)', sql, re.IGNORECASE | re.DOTALL)
            if select_match:
                sql = select_match.group(1)
        
        return sql
    except Exception as e:
        print(f"Error generating SQL: {e}")
        return None

def format_currency(amount):
    """Format number as Indonesian Rupiah"""
    if amount >= 1_000_000_000:
        return f"Rp {amount/1_000_000_000:.2f} Miliar"
    elif amount >= 1_000_000:
        return f"Rp {amount/1_000_000:.2f} Juta"
    elif amount >= 1000:
        return f"Rp {amount/1000:.1f} Ribu"
    return f"Rp {amount:,.0f}"

def format_time(hours):
    """Format hours into human readable time"""
    if hours < 1:
        return f"{int(hours * 60)} menit"
    elif hours < 24:
        h = int(hours)
        m = int((hours - h) * 60)
        if m > 0:
            return f"{h} jam {m} menit"
        return f"{h} jam"
    else:
        days = int(hours / 24)
        remaining_hours = int(hours % 24)
        if remaining_hours > 0:
            return f"{days} hari {remaining_hours} jam"
        return f"{days} hari"

def generate_simulation_response(params, sim_result):
    """Generate a detailed natural language response for simulation results"""
    
    response = f"""## 📊 Hasil Simulasi Produksi

### Input Parameter:
- **Jumlah Truk:** {params.get('num_trucks', sim_result['input']['num_trucks'])} unit
- **Target Produksi:** {sim_result['input']['target_tons']:,.0f} ton
- **Jarak Hauling:** {sim_result['input']['distance_km']:.1f} km (satu arah)
- **Kapasitas Truk:** {sim_result['input']['truck_capacity']:.1f} ton

### ⏱️ Estimasi Waktu:
- **Waktu Siklus per Trip:** {sim_result['time']['cycle_time_minutes']:.0f} menit
- **Total Waktu Operasi:** {format_time(sim_result['time']['total_time_hours'])}
- **Shift Dibutuhkan:** {sim_result['time']['shifts_needed']} shift

### 🚛 Detail Produksi:
- **Total Trip:** {sim_result['production']['total_trips']:,} trip
- **Trip per Truk:** {sim_result['production']['trips_per_truck']:,} trip
- **Muatan per Trip:** {sim_result['production']['load_per_trip']:.1f} ton
- **Produksi Aktual:** {sim_result['production']['actual_production']:,.0f} ton
- **Efisiensi:** {sim_result['production']['efficiency']:.1f}%

### ⛽ Konsumsi Sumber Daya:
- **Total Jarak Tempuh:** {sim_result['resources']['total_distance_km']:,.1f} km
- **BBM Terpakai:** {sim_result['resources']['fuel_consumed_liters']:,.0f} liter

### 💰 Analisis Finansial:
| Komponen | Nilai |
|----------|-------|
| Biaya BBM | {format_currency(sim_result['financials']['fuel_cost'])} |
| Biaya Operator | {format_currency(sim_result['financials']['operator_cost'])} |
| Biaya Maintenance | {format_currency(sim_result['financials']['maintenance_cost'])} |
| Biaya Overhead | {format_currency(sim_result['financials']['overhead_cost'])} |
| **Total Biaya** | **{format_currency(sim_result['financials']['total_cost'])}** |
| **Pendapatan** | **{format_currency(sim_result['financials']['revenue'])}** |
| **PROFIT** | **{format_currency(sim_result['financials']['profit'])}** |
| **Margin Profit** | **{sim_result['financials']['profit_margin_percent']:.1f}%** |

### 📈 Kesimpulan:
"""
    
    profit = sim_result['financials']['profit']
    margin = sim_result['financials']['profit_margin_percent']
    time_hours = sim_result['time']['total_time_hours']
    
    if profit > 0 and margin > 30:
        response += f"Simulasi ini menunjukkan **hasil yang sangat menguntungkan** dengan margin profit {margin:.1f}%. "
    elif profit > 0 and margin > 15:
        response += f"Simulasi ini menunjukkan **hasil yang baik** dengan margin profit {margin:.1f}%. "
    elif profit > 0:
        response += f"Simulasi ini masih menghasilkan **keuntungan tipis** dengan margin {margin:.1f}%. "
    else:
        response += f"⚠️ **Peringatan:** Simulasi ini menunjukkan **potensi kerugian**. Pertimbangkan untuk menambah jumlah truk atau mengurangi jarak. "
    
    if time_hours <= 8:
        response += f"Target dapat dicapai dalam **satu shift** ({format_time(time_hours)})."
    elif time_hours <= 24:
        response += f"Target membutuhkan **{sim_result['time']['shifts_needed']} shift** untuk diselesaikan."
    else:
        response += f"Target membutuhkan waktu **{format_time(time_hours)}** - pertimbangkan penambahan armada."
    
    return response

def handle_simulation_question(user_question):
    """Handle simulation/what-if questions"""
    params = parse_simulation_parameters(user_question)
    
    # Default values if not parsed
    if 'num_trucks' not in params:
        params['num_trucks'] = 5
    if 'target_tons' not in params:
        params['target_tons'] = 500
    
    # Run simulation
    sim_result = calculate_production_simulation(
        num_trucks=params['num_trucks'],
        target_tons=params['target_tons'],
        distance_km=params.get('distance_km'),
        truck_capacity=params.get('truck_capacity')
    )
    
    # Generate response
    response = generate_simulation_response(params, sim_result)
    
    return {
        "type": "simulation",
        "params": params,
        "result": sim_result,
        "response": response
    }

def execute_and_summarize_stream(user_question, session_id=None, conversation_history=None):
    context = get_conversation_context(session_id) if session_id else None
    
    new_entities = extract_entities_from_text(user_question)
    context = merge_contexts(context, new_entities, user_question)
    
    if conversation_history:
        for hist_item in conversation_history[-5:]:
            if isinstance(hist_item, dict):
                role = hist_item.get('role', '')
                content = hist_item.get('content', hist_item.get('question', ''))
                if content and role == 'user':
                    hist_entities = extract_entities_from_text(content)
                    context = merge_contexts(context, hist_entities, content, None)
                elif content and role == 'assistant':
                    if context and context.get('conversation_history'):
                        for ch in context['conversation_history']:
                            if ch.get('answer') is None:
                                ch['answer'] = content[:500]
                                break
    
    if session_id:
        set_conversation_context(session_id, context)
    
    yield json.dumps({"type": "step", "status": "thinking", "message": "Menganalisis pertanyaan..."}) + "\n"

    is_prod_summary_q, period = detect_production_summary_question(user_question, context)
    if is_prod_summary_q:
        q = generate_production_summary_query()
        yield json.dumps({"type": "sql", "query": q}) + "\n"
        try:
            df = fetch_dataframe(q)
            answer = format_production_summary_answer(df)
            yield json.dumps({"type": "answer", "content": answer}) + "\n"
            yield json.dumps({"type": "step", "status": "completed", "message": "Selesai"}) + "\n"
            if context:
                context['conversation_history'][-1]['answer'] = answer[:500]
                context['last_sql'] = q
                if session_id:
                    set_conversation_context(session_id, context)
            return
        except Exception as e:
            yield json.dumps({"type": "step", "status": "error", "message": f"Error: {str(e)}"}) + "\n"
            yield json.dumps({"type": "answer", "content": "Maaf, terjadi kesalahan saat mengambil ringkasan produksi dari database."}) + "\n"
            yield json.dumps({"type": "step", "status": "completed", "message": "Selesai"}) + "\n"
            return

    is_fleet_status_q = detect_fleet_status_question(user_question, context)
    if is_fleet_status_q:
        q = generate_fleet_status_query()
        yield json.dumps({"type": "sql", "query": q}) + "\n"
        try:
            df = fetch_dataframe(q)
            answer = format_fleet_status_answer(df)
            yield json.dumps({"type": "answer", "content": answer}) + "\n"
            yield json.dumps({"type": "step", "status": "completed", "message": "Selesai"}) + "\n"
            if context:
                context['conversation_history'][-1]['answer'] = answer[:500]
                context['last_sql'] = q
                if session_id:
                    set_conversation_context(session_id, context)
            return
        except Exception as e:
            yield json.dumps({"type": "step", "status": "error", "message": f"Error: {str(e)}"}) + "\n"

    is_site_count_q, site_name = detect_production_record_count_by_site(user_question, context)
    if is_site_count_q:
        if not site_name:
            yield json.dumps({"type": "answer", "content": "Mohon sebutkan nama site yang ingin dihitung production record-nya."}) + "\n"
            yield json.dumps({"type": "step", "status": "completed", "message": "Selesai"}) + "\n"
            return
        q = generate_production_record_count_by_site_query()
        yield json.dumps({"type": "sql", "query": q}) + "\n"
        try:
            df = fetch_dataframe(q, params={"pattern": f"%{site_name}%"})
            answer = format_production_record_count_by_site_answer(df, site_name)
            yield json.dumps({"type": "answer", "content": answer}) + "\n"
            yield json.dumps({"type": "step", "status": "completed", "message": "Selesai"}) + "\n"
            if context:
                context['conversation_history'][-1]['answer'] = answer[:500]
                context['last_sql'] = q
                if session_id:
                    set_conversation_context(session_id, context)
            return
        except Exception as e:
            yield json.dumps({"type": "step", "status": "error", "message": f"Error: {str(e)}"}) + "\n"

    is_ops_q, pr_id = detect_operator_summary_by_production_record(user_question, context)
    if is_ops_q:
        if not pr_id:
            yield json.dumps({"type": "answer", "content": "Mohon sebutkan production record ID yang ingin dianalisis operator-nya."}) + "\n"
            yield json.dumps({"type": "step", "status": "completed", "message": "Selesai"}) + "\n"
            return
        q = generate_operator_summary_by_production_record_query()
        yield json.dumps({"type": "sql", "query": q}) + "\n"
        try:
            df = fetch_dataframe(q, params={"pr_pattern": f"{pr_id}%"})
            answer = format_operator_summary_by_production_record_answer(df, pr_id)
            yield json.dumps({"type": "answer", "content": answer}) + "\n"
            yield json.dumps({"type": "step", "status": "completed", "message": "Selesai"}) + "\n"
            if context:
                context['conversation_history'][-1]['answer'] = answer[:500]
                context['last_sql'] = q
                if session_id:
                    set_conversation_context(session_id, context)
            return
        except Exception as e:
            yield json.dumps({"type": "step", "status": "error", "message": f"Error: {str(e)}"}) + "\n"

    is_truck_q, unit_id = detect_truck_usage_by_unit(user_question, context)
    if is_truck_q:
        if not unit_id:
            yield json.dumps({"type": "answer", "content": "Mohon sebutkan unit/site ID yang ingin dihitung penggunaan truck dan total kapasitasnya."}) + "\n"
            yield json.dumps({"type": "step", "status": "completed", "message": "Selesai"}) + "\n"
            return
        q = generate_truck_usage_by_unit_query()
        yield json.dumps({"type": "sql", "query": q}) + "\n"
        try:
            df = fetch_dataframe(q, params={"unit_pattern": f"{unit_id}%"})
            answer = format_truck_usage_by_unit_answer(df, unit_id)
            yield json.dumps({"type": "answer", "content": answer}) + "\n"
            yield json.dumps({"type": "step", "status": "completed", "message": "Selesai"}) + "\n"
            if context:
                context['conversation_history'][-1]['answer'] = answer[:500]
                context['last_sql'] = q
                if session_id:
                    set_conversation_context(session_id, context)
            return
        except Exception as e:
            yield json.dumps({"type": "step", "status": "error", "message": f"Error: {str(e)}"}) + "\n"

    is_hauling_summary_q, period = detect_hauling_summary_question(user_question, context)
    if is_hauling_summary_q:
        q = generate_hauling_summary_query(period)
        yield json.dumps({"type": "sql", "query": q}) + "\n"
        try:
            df = fetch_dataframe(q)
            answer = format_hauling_summary_answer(df, period)
            yield json.dumps({"type": "answer", "content": answer}) + "\n"
            yield json.dumps({"type": "step", "status": "completed", "message": "Selesai"}) + "\n"
            if context:
                context['conversation_history'][-1]['answer'] = answer[:500]
                context['last_sql'] = q
                if session_id:
                    set_conversation_context(session_id, context)
            return
        except Exception as e:
            yield json.dumps({"type": "step", "status": "error", "message": f"Error: {str(e)}"}) + "\n"

    is_remaining_q, prod_id = detect_remaining_production_question(user_question, context)
    if is_remaining_q:
        if context:
            if prod_id:
                try:
                    chk = fetch_dataframe("SELECT 1 FROM production_records WHERE id LIKE :pattern LIMIT 1", params={"pattern": f"{prod_id}%"})
                    if chk.empty:
                        prod_id = None
                except Exception:
                    pass
            if not prod_id:
                prod_id = resolve_production_record_id_from_context(context)
        if prod_id:
            yield json.dumps({"type": "step", "status": "remaining_production", "message": f"Mendeteksi pertanyaan sisa produksi untuk ID: {prod_id}..."}) + "\n"
            
            remaining_query = generate_remaining_production_query(prod_id)
            yield json.dumps({"type": "sql", "query": remaining_query}) + "\n"
            
            try:
                df = fetch_dataframe(remaining_query, params={"pattern": f"{prod_id}%"})
                answer = format_remaining_production_answer(df, prod_id)
                yield json.dumps({"type": "answer", "content": answer}) + "\n"
                yield json.dumps({"type": "step", "status": "completed", "message": "Selesai"}) + "\n"
                
                if context:
                    context['conversation_history'][-1]['answer'] = answer[:500]
                    context['last_sql'] = remaining_query
                    if session_id:
                        set_conversation_context(session_id, context)
                return
            except Exception as e:
                yield json.dumps({"type": "step", "status": "error", "message": f"Error: {str(e)}, mencoba metode alternatif..."}) + "\n"
        else:
            yield json.dumps({"type": "step", "status": "need_context", "message": "Pertanyaan tentang sisa produksi terdeteksi, membutuhkan ID production record..."}) + "\n"
            
            clarification_msg = """⚠️ **Butuh ID Production Record**

Saya mendeteksi Anda bertanya tentang sisa produksi yang harus dipenuhi. 

Untuk menjawab pertanyaan ini, saya membutuhkan **Production Record ID** yang spesifik. 

**Contoh cara bertanya:**
- "Berapa sisa ton untuk production id cmj2lperp000o112mre46nezv?"
- "Berapa ton lagi agar production id [ID] terpenuhi targetnya?"

**Tips:** ID production record biasanya dimulai dengan "cm" diikuti karakter alfanumerik.

Mohon sebutkan ID production record yang ingin Anda cek."""

            yield json.dumps({"type": "answer", "content": clarification_msg}) + "\n"
            yield json.dumps({"type": "step", "status": "completed", "message": "Menunggu ID production record"}) + "\n"
            return
    
    if is_out_of_scope(user_question):
        yield json.dumps({"type": "step", "status": "out_of_scope", "message": "Pertanyaan di luar konteks database"}) + "\n"
        yield json.dumps({"type": "answer", "content": "Maaf, pertanyaan Anda di luar ruang lingkup database operasi pertambangan. Saya hanya dapat menjawab pertanyaan terkait: truk, excavator, hauling, produksi, kapal/vessel, operator, maintenance, insiden, BBM/fuel, cuaca, jadwal pelayaran, dan data operasional tambang lainnya."}) + "\n"
        yield json.dumps({"type": "step", "status": "completed", "message": "Selesai"}) + "\n"
        return
    
    question_type = detect_question_type(user_question)
    
    if question_type == 'simulation':
        yield json.dumps({"type": "step", "status": "simulation_mode", "message": "Mendeteksi pertanyaan simulasi..."}) + "\n"
        
        params = parse_simulation_parameters(user_question)
        
        if 'num_trucks' not in params and 'target_tons' not in params:
            yield json.dumps({"type": "step", "status": "parsing", "message": "Mengekstrak parameter dari pertanyaan..."}) + "\n"
            
            extract_prompt = f"""Extract simulation parameters from this question:
"{user_question}"

Return JSON only:
{{"num_trucks": <number or null>, "target_tons": <number or null>, "distance_km": <number or null>, "site": "<string or null>"}}

JSON:"""
            
            try:
                extract_response = ollama.chat(model=MODEL_NAME, messages=[
                    {'role': 'system', 'content': 'Extract parameters and return only valid JSON.'},
                    {'role': 'user', 'content': extract_prompt}
                ])
                extracted = extract_response['message']['content'].strip()
                json_match = re.search(r'\{[^}]+\}', extracted)
                if json_match:
                    parsed = json.loads(json_match.group())
                    if parsed.get('num_trucks'):
                        params['num_trucks'] = int(parsed['num_trucks'])
                    if parsed.get('target_tons'):
                        params['target_tons'] = float(parsed['target_tons'])
                    if parsed.get('distance_km'):
                        params['distance_km'] = float(parsed['distance_km'])
            except:
                pass
        
        if 'num_trucks' not in params:
            params['num_trucks'] = 5
        if 'target_tons' not in params:
            params['target_tons'] = 500
        
        yield json.dumps({
            "type": "step", 
            "status": "calculating", 
            "message": f"Menghitung simulasi: {params.get('num_trucks')} truk, {params.get('target_tons')} ton target..."
        }) + "\n"
        
        sim_result = calculate_production_simulation(
            num_trucks=params['num_trucks'],
            target_tons=params['target_tons'],
            distance_km=params.get('distance_km'),
            truck_capacity=params.get('truck_capacity')
        )
        
        yield json.dumps({
            "type": "simulation_result",
            "params": params,
            "result": sim_result
        }) + "\n"
        
        response = generate_simulation_response(params, sim_result)
        
        yield json.dumps({"type": "answer", "content": response}) + "\n"
        yield json.dumps({"type": "step", "status": "completed", "message": "Simulasi selesai"}) + "\n"
        
        context['conversation_history'][-1]['answer'] = response[:500]
        if session_id:
            set_conversation_context(session_id, context)
        return
    
    is_followup = is_follow_up_question(user_question)
    if is_followup and context:
        yield json.dumps({"type": "step", "status": "context_aware", "message": "Mendeteksi pertanyaan lanjutan, menggunakan konteks percakapan..."}) + "\n"
    
    fast_query, query_type = get_fast_answer(user_question)
    if fast_query and not is_followup:
        yield json.dumps({"type": "step", "status": "fast_path", "message": "Menggunakan fast-path untuk query sederhana"}) + "\n"
        yield json.dumps({"type": "sql", "query": fast_query}) + "\n"
        
        try:
            cache_key = get_cache_key(fast_query)
            cached = get_cached_result(cache_key)
            if cached is not None:
                yield json.dumps({"type": "step", "status": "cached", "message": "Data dari cache"}) + "\n"
                df = cached
            else:
                df = fetch_dataframe(fast_query)
                set_cached_result(cache_key, df)
            
            answer = format_fast_answer(query_type, df, user_question)
            yield json.dumps({"type": "answer", "content": answer}) + "\n"
            yield json.dumps({"type": "step", "status": "completed", "message": "Selesai"}) + "\n"
            
            context['conversation_history'][-1]['answer'] = answer[:500]
            context['last_sql'] = fast_query
            if session_id:
                set_conversation_context(session_id, context)
            return
        except Exception as e:
            yield json.dumps({"type": "step", "status": "fallback", "message": f"Fast-path gagal: {str(e)}, mencoba metode standar..."}) + "\n"
    
    yield json.dumps({"type": "step", "status": "thinking", "message": "Menyusun query ke database"}) + "\n"
    sql_query = generate_sql_query(user_question, context)
    
    if not sql_query:
        if is_out_of_scope(user_question):
            yield json.dumps({"type": "error", "message": "Pertanyaan di luar konteks"}) + "\n"
            yield json.dumps({"type": "answer", "content": "Maaf, pertanyaan Anda di luar ruang lingkup database operasi pertambangan. Saya dapat membantu dengan pertanyaan tentang: truk, excavator, hauling, produksi, kapal/vessel, operator, maintenance, insiden, BBM, cuaca, jadwal pelayaran, dan data operasional tambang lainnya."}) + "\n"
        else:
            yield json.dumps({"type": "error", "message": "Gagal membuat query SQL"}) + "\n"
            yield json.dumps({"type": "answer", "content": "Maaf, saya tidak dapat memahami pertanyaan Anda. Silakan coba dengan pertanyaan yang lebih spesifik terkait operasi pertambangan, misalnya: 'Berapa jumlah truk aktif?', 'Truk mana yang memiliki kapasitas terbesar?', 'Bagaimana produksi minggu ini?'"}) + "\n"
        return

    yield json.dumps({"type": "step", "status": "generated_sql", "message": "Berhasil membuat query ke database", "detail": sql_query}) + "\n"
    yield json.dumps({"type": "sql", "query": sql_query}) + "\n"

    if not sql_query.upper().strip().startswith("SELECT"):
        yield json.dumps({"type": "error", "message": "Query ditolak (Bukan SELECT)"}) + "\n"
        yield json.dumps({"type": "answer", "content": "Maaf, query yang dihasilkan tidak valid. Silakan coba pertanyaan lain."}) + "\n"
        return

    yield json.dumps({"type": "step", "status": "executing", "message": "Mencari data di database..."}) + "\n"
    
    max_retries = 2
    last_error = None
    df = None
    
    for attempt in range(max_retries):
        try:
            df = fetch_dataframe(sql_query)
            break
        except Exception as e:
            last_error = str(e)
            if attempt == 0 and ("column" in last_error.lower() or "relation" in last_error.lower() or "syntax" in last_error.lower()):
                yield json.dumps({"type": "step", "status": "retrying", "message": "Query error, mencoba perbaikan..."}) + "\n"
                
                fix_prompt = f"""The following SQL query failed with error: {last_error}

Original query: {sql_query}

Fix the query to work with PostgreSQL. Common fixes:
- Use double quotes for camelCase columns: "isActive", "createdAt"
- Check table/column names exist
- Use correct enum values

Output ONLY the corrected SQL query:"""
                
                try:
                    fix_response = ollama.chat(model=MODEL_NAME, messages=[
                        {'role': 'system', 'content': 'Fix the SQL query. Output only the corrected query.'},
                        {'role': 'user', 'content': fix_prompt}
                    ])
                    fixed_sql = fix_response['message']['content'].strip()
                    fixed_sql = re.sub(r'```sql\s*', '', fixed_sql, flags=re.IGNORECASE)
                    fixed_sql = re.sub(r'```\s*', '', fixed_sql)
                    fixed_sql = fixed_sql.strip()
                    
                    if fixed_sql.upper().startswith('SELECT'):
                        sql_query = fixed_sql
                        yield json.dumps({"type": "step", "status": "fixed_sql", "message": "Query diperbaiki", "detail": sql_query}) + "\n"
                except:
                    pass
            else:
                break
    
    if df is None:
        yield json.dumps({"type": "step", "status": "error", "message": f"Database error: {last_error}"}) + "\n"
        yield json.dumps({"type": "answer", "content": f"Maaf, terjadi kesalahan saat mengakses database. Silakan coba pertanyaan dengan kata-kata berbeda."}) + "\n"
        return
        
    if df.empty:
        yield json.dumps({"type": "step", "status": "empty_result", "message": "Data tidak ditemukan"}) + "\n"
        yield json.dumps({"type": "answer", "content": "Query berhasil dijalankan namun tidak ada data yang ditemukan untuk kriteria tersebut."}) + "\n"
        return
        
    yield json.dumps({"type": "step", "status": "data_found", "message": f"Data ditemukan ({len(df)} baris), memuat jawaban.."}) + "\n"
    
    context['last_query_result'] = df.to_dict('records')[:10]
    context['last_sql'] = sql_query
    
    if len(df) > 50:
        df = df.head(50)
        
    data_str = df.to_string(max_rows=50, max_cols=15)
    
    context_prompt = build_context_prompt(context) if context else ""
    
    summary_prompt = f"""Anda adalah Asisten AI Operasi Pertambangan yang profesional dan berpengetahuan luas.

PERTANYAAN USER: {user_question}

{f"KONTEKS PERCAKAPAN:{chr(10)}{context_prompt}" if context_prompt else ""}

DATA DARI DATABASE:
{data_str}

KONTEKS OPERASI TAMBANG:
- Rata-rata kapasitas truk: {MINING_KNOWLEDGE['fleet']['avg_truck_capacity']} ton
- Rata-rata waktu siklus hauling: {MINING_KNOWLEDGE['hauling']['avg_cycle_time']} menit
- Target produksi harian: {MINING_KNOWLEDGE['production']['avg_daily_target']} ton
- Harga batubara: Rp {MINING_KNOWLEDGE['revenue']['coal_price_per_ton']:,}/ton

INSTRUKSI:
1. Jawab pertanyaan user berdasarkan data di atas dengan jelas, detail, dan profesional
2. Jika data menunjukkan hasil spesifik (nama, kode, angka), sebutkan dengan jelas
3. Gunakan Bahasa Indonesia yang profesional dan teknis
4. Jangan mengarang informasi yang tidak ada di data
5. Jika diminta "terbesar/terkecil/tertinggi", identifikasi dengan tepat dari data
6. Format angka dengan satuan yang sesuai (ton, km, liter, dll)
7. Berikan insight atau rekomendasi jika relevan
8. Jika ada data performa, bandingkan dengan rata-rata industri
9. Jika user bertanya tentang "sisa" atau "remaining", hitung selisih target - aktual
10. Jika ada konteks percakapan sebelumnya, gunakan untuk memberikan jawaban yang kontekstual

JAWABAN:"""
    
    yield json.dumps({"type": "step", "status": "summarizing", "message": "Menyusun jawaban..."}) + "\n"
    
    try:
        response = ollama.chat(model=MODEL_NAME, messages=[
            {'role': 'system', 'content': 'Anda adalah asisten pertambangan profesional. Jawab berdasarkan data yang diberikan saja, dalam Bahasa Indonesia dengan gaya yang informatif dan helpful. Perhatikan konteks percakapan untuk memberikan jawaban yang relevan.'},
            {'role': 'user', 'content': summary_prompt}
        ])
        
        answer = response['message']['content'].strip()
        
        if not answer:
            answer = "Data berhasil ditemukan, namun saya mengalami kesulitan menyusun jawaban. Silakan lihat data mentah di atas."
        
        yield json.dumps({"type": "answer", "content": answer}) + "\n"
        yield json.dumps({"type": "step", "status": "completed", "message": "Selesai"}) + "\n"
        
        context['conversation_history'][-1]['answer'] = answer[:500]
        if session_id:
            set_conversation_context(session_id, context)
        
    except Exception as e:
        yield json.dumps({"type": "step", "status": "error", "message": f"Error summarizing: {str(e)}"}) + "\n"
        
        simple_answer = f"Data ditemukan ({len(df)} baris). "
        if len(df) == 1:
            row = df.iloc[0]
            cols = df.columns.tolist()
            details = []
            for col in cols[:5]:
                val = row[col]
                if pd.notna(val):
                    details.append(f"{col}: {val}")
            simple_answer += ", ".join(details)
        else:
            simple_answer += f"Terdapat {len(df)} data yang sesuai dengan kriteria pencarian."
        
        yield json.dumps({"type": "answer", "content": simple_answer}) + "\n"
        yield json.dumps({"type": "step", "status": "completed", "message": "Selesai"}) + "\n"

def execute_and_summarize(user_question, session_id=None, conversation_history=None):
    steps = []
    answer = ""
    sql_query = None
    
    for chunk in execute_and_summarize_stream(user_question, session_id, conversation_history):
        data = json.loads(chunk)
        if data['type'] == 'step':
            steps.append({"status": data['status'], "message": data['message'], "detail": data.get('detail')})
        elif data['type'] == 'sql':
            sql_query = data['query']
        elif data['type'] == 'answer':
            answer = data['content']
            
    return {
        "answer": answer,
        "steps": steps,
        "sql_query": sql_query
    }
