from pathlib import Path
import re

SERVICE = Path("lib/quickcommerce/daily-deals-service.ts")

text = SERVICE.read_text()

original = text

# -------------------------------------------------------
# PATCH 1
# category mapper
# -------------------------------------------------------

old = '''
  if (/beauty|skin|makeup/.test(normalized)) return "Beauty";
  if (/fashion|shoe|watch/.test(normalized)) return "Fashion";
  if (/home|kitchen|appliance/.test(normalized)) return "Home";
  if (/grocery|food|snack/.test(normalized)) return "Food";
'''

new = '''
  if (/beauty|skin|makeup/.test(normalized)) return "Beauty";
  if (/fashion|shoe|watch/.test(normalized)) return "Fashion";
  if (/home|kitchen|appliance/.test(normalized)) return "Home";

  if (
    /grocery|milk|curd|paneer|cheese|butter|rice|atta|flour|oil|ghee|dal|lentil|salt|sugar|tea|coffee|biscuit|cookies|snack|chips|juice|soft drink|vegetable|fruit|banana|apple|onion|tomato|potato|detergent|soap|shampoo|toothpaste|cleaner|baby/.test(
      normalized,
    )
  )
    return "Grocery";

  if (/food/.test(normalized)) return "Food";
'''

if old in text:
    text = text.replace(old, new)

# -------------------------------------------------------
# PATCH 2
# Grocery product types
# -------------------------------------------------------

marker = '''
  if (
    /\\bsmart[\\s-]?watch(?:es)?\\b|\\bfitness tracker\\b|\\bfitness band\\b/.test(
      value,
    )
  )
    return "Smart Watches";
'''

insert = marker + '''

  if (/\\bmilk\\b/.test(value)) return "Milk";
  if (/\\bcurd\\b|\\byogurt\\b/.test(value)) return "Curd";
  if (/\\bpaneer\\b/.test(value)) return "Paneer";
  if (/\\bcheese\\b/.test(value)) return "Cheese";
  if (/\\bbutter\\b/.test(value)) return "Butter";

  if (/\\batta\\b|\\bflour\\b/.test(value)) return "Atta";
  if (/\\brice\\b/.test(value)) return "Rice";
  if (/\\bdal\\b|\\blentil\\b/.test(value)) return "Dal";
  if (/\\boil\\b/.test(value)) return "Cooking Oil";
  if (/\\bghee\\b/.test(value)) return "Ghee";

  if (/\\btea\\b/.test(value)) return "Tea";
  if (/\\bcoffee\\b/.test(value)) return "Coffee";

  if (/\\bbiscuit\\b|\\bcookie\\b/.test(value))
    return "Biscuits";

  if (/\\bchips\\b|\\bsnack\\b/.test(value))
    return "Snacks";

  if (/\\bfruit\\b|\\bapple\\b|\\bbanana\\b/.test(value))
    return "Fruits";

  if (/\\bvegetable\\b|\\bonion\\b|\\btomato\\b|\\bpotato\\b/.test(value))
    return "Vegetables";

  if (/\\bdetergent\\b/.test(value))
    return "Detergents";

  if (/\\bsoap\\b/.test(value))
    return "Soap";

  if (/\\bshampoo\\b/.test(value))
    return "Shampoo";

  if (/\\btoothpaste\\b/.test(value))
    return "Toothpaste";
'''

if marker in text:
    text = text.replace(marker, insert)

# -------------------------------------------------------
# PATCH 3
# default discovery keywords
# -------------------------------------------------------

pattern = re.compile(
    r"const mandatoryKeywords\s*=\s*\[(.*?)\];",
    re.S,
)

m = pattern.search(text)

if m:

    body = m.group(1)

    grocery = [
        '"milk"',
        '"curd"',
        '"paneer"',
        '"rice"',
        '"atta"',
        '"dal"',
        '"cooking oil"',
        '"ghee"',
        '"tea"',
        '"coffee"',
        '"biscuits"',
        '"chips"',
        '"fruits"',
        '"vegetables"',
        '"soap"',
        '"detergent"',
        '"shampoo"',
    ]

    for k in grocery:
        if k not in body:
            body += "\n  " + k + ","

    text = (
        text[:m.start(1)]
        + body
        + text[m.end(1):]
    )

if text == original:
    raise SystemExit("PATCH-004.1B: nothing changed")

SERVICE.write_text(text)

print("PATCH-004.1B INSTALLED")
