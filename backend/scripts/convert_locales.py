import json
import os
import polib

def flatten(d, prefix=''):
    items = []
    for k, v in d.items():
        key = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            items.extend(flatten(v, key))
        else:
            items.append((key, v))
    return items

def convert():
    frontend_locales_path = '../../src/i18n/locales'
    backend_translations_path = '../translations'
    
    langs = ['ru', 'en', 'kk', 'es', 'zh']
    
    for lang in langs:
        json_file = os.path.join(frontend_locales_path, f'{lang}.json')
        if not os.path.exists(json_file):
            print(f"Skipping {lang}, file not found: {json_file}")
            continue
            
        print(f"Converting {lang}...")
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        po = polib.POFile()
        po.metadata = {
            'Project-Id-Version': '1.0',
            'Report-Msgid-Bugs-To': 'you@example.com',
            'POT-Creation-Date': '2026-04-16 12:00+0000',
            'PO-Revision-Date': '2026-04-16 12:00+0000',
            'Last-Translator': 'you <you@example.com>',
            'Language-Team': 'Russian <yourteam@example.com>',
            'MIME-Version': '1.0',
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Transfer-Encoding': '8bit',
        }
        
        flat_data = flatten(data)
        for msgid, msgstr in flat_data:
            entry = polib.POEntry(
                msgid=msgid,
                msgstr=msgstr
            )
            po.append(entry)
            
        dest_dir = os.path.join(backend_translations_path, lang, 'LC_MESSAGES')
        os.makedirs(dest_dir, exist_ok=True)
        po.save(os.path.join(dest_dir, 'messages.po'))
        po.save_as_mofile(os.path.join(dest_dir, 'messages.mo'))
        print(f"Saved {lang} to {dest_dir}")

if __name__ == "__main__":
    convert()
