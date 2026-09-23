"""
data/cities.py
定義台灣 22 個縣市常數、城市代碼與 SVG ID 映射。
"""

from typing import List, Dict, Optional

# 台灣 22 個標準行政區清單（依中央氣象署 CWA 規範）
TAIWAN_CITIES: List[str] = [
    "基隆市", "臺北市", "新北市", "桃園市", "新竹市", "新竹縣", "苗栗縣",
    "臺中市", "彰化縣", "南投縣", "雲林縣", "嘉義市", "嘉義縣", "臺南市",
    "高雄市", "屏東縣", "宜蘭縣", "花蓮縣", "臺東縣", "澎湖縣", "金門縣", "連江縣"
]

# 縣市與 SVG 元素 ID 對應表
CITY_SVG_MAP: Dict[str, str] = {
    "基隆市": "TW-KEE",
    "臺北市": "TW-TPE",
    "新北市": "TW-NWT",
    "桃園市": "TW-TAO",
    "新竹市": "TW-HSZ",
    "新竹縣": "TW-HSQ",
    "苗栗縣": "TW-MIA",
    "臺中市": "TW-TXG",
    "彰化縣": "TW-CHA",
    "南投縣": "TW-NAN",
    "雲林縣": "TW-YUN",
    "嘉義市": "TW-CYI",
    "嘉義縣": "TW-CYQ",
    "臺南市": "TW-TNN",
    "高雄市": "TW-KHH",
    "屏東縣": "TW-PIF",
    "宜蘭縣": "TW-ILA",
    "花蓮縣": "TW-HUA",
    "臺東縣": "TW-TTT",
    "澎湖縣": "TW-PEN",
    "金門縣": "TW-KIN",
    "連江縣": "TW-LIE"
}

# SVG ID 逆向查縣市名
SVG_CITY_MAP: Dict[str, str] = {v: k for k, v in CITY_SVG_MAP.items()}

# 俗體字／異體字正規化對照表
CITY_ALIASES: Dict[str, str] = {
    "台北市": "臺北市",
    "台中市": "臺中市",
    "台南市": "臺南市",
    "台東縣": "臺東縣",
    "台北": "臺北市",
    "台中": "臺中市",
    "台南": "臺南市",
    "高雄": "高雄市",
    "基隆": "基隆市",
    "新北": "新北市",
    "桃園": "桃園市",
    "新竹": "新竹市",
    "苗栗": "苗栗縣",
    "彰化": "彰化縣",
    "南投": "南投縣",
    "雲林": "雲林縣",
    "嘉義": "嘉義市",
    "屏東": "屏東縣",
    "宜蘭": "宜蘭縣",
    "花蓮": "花蓮縣",
    "台東": "臺東縣",
    "澎湖": "澎湖縣",
    "金門": "金門縣",
    "馬祖": "連江縣",
    "連江": "連江縣"
}


def normalize_city_name(city_name: str) -> Optional[str]:
    """
    將傳入的縣市名稱正規化為標準 22 縣市名稱。
    若非有效縣市則回傳 None。
    """
    if not city_name:
        return None
    name = city_name.strip()
    if name in TAIWAN_CITIES:
        return name
    if name in CITY_ALIASES:
        return CITY_ALIASES[name]
    # 嘗試將 '台' 替換為 '臺'
    alt_name = name.replace("台", "臺")
    if alt_name in TAIWAN_CITIES:
        return alt_name
    return None


def is_valid_city(city_name: str) -> bool:
    """檢查縣市名稱是否合法"""
    return normalize_city_name(city_name) is not None
