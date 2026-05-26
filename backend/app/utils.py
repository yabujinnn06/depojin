import re

_RX_INVISIBLE = re.compile(r"[\r\n\t ]")

JUNK_STOK_LABELS = {"STOKKOD", "STOKKODU", "KOD", "KODU", "STOK", "SKU", "URUNKOD", "URUNKODU"}
SYSTEM_SHEET_NAMES = {"SAYIMPANELI", "STOKVERI", "TARAMALOG", "AYARLAR"}


def normalize_seri(raw) -> str:
    if raw is None:
        return ""
    s = _RX_INVISIBLE.sub("", str(raw))
    s = s.strip().upper()
    while " X" in s:
        s = s.replace(" X", "X")
    while "X " in s:
        s = s.replace("X ", "X")
    return s


def normalize_stok_kodu(raw) -> str:
    if raw is None:
        return ""
    if isinstance(raw, float):
        return str(int(raw)) if raw.is_integer() else str(raw)
    if isinstance(raw, int):
        return str(raw)
    return _RX_INVISIBLE.sub("", str(raw)).strip()


def temizle_metin(raw) -> str:
    if raw is None:
        return ""
    if isinstance(raw, float):
        return str(int(raw)) if raw.is_integer() else str(raw)
    return _RX_INVISIBLE.sub("", str(raw)).strip()


def temizle_portal_sayi(raw) -> int:
    if raw is None:
        return 0
    if isinstance(raw, bool):
        return 0
    if isinstance(raw, (int, float)):
        try:
            return int(raw)
        except (TypeError, ValueError, OverflowError):
            return 0
    s = _RX_INVISIBLE.sub("", str(raw)).strip()
    if not s:
        return 0
    try:
        return int(float(s))
    except (TypeError, ValueError):
        return 0


def is_junk_stok_header(stok_kodu_raw) -> bool:
    if stok_kodu_raw is None:
        return False
    s = str(stok_kodu_raw).strip().upper().replace(" ", "")
    return s in JUNK_STOK_LABELS


def is_system_sheet(name: str) -> bool:
    return name.strip().upper() in SYSTEM_SHEET_NAMES


def candidate_seri_keys(scan_input) -> list[str]:
    norm = normalize_seri(scan_input)
    if not norm:
        return []
    keys = [norm]
    if len(norm) > 2:
        idx = norm.find("X", 1)
        if 0 < idx < len(norm) - 1:
            serpart = norm[idx + 1:]
            if serpart and serpart not in keys:
                keys.append(serpart)
    return keys
