import os
import re
import requests
from bs4 import BeautifulSoup
from supabase import create_client, Client

# Supabase setup
url = os.environ.get("VITE_SUPABASE_URL", "https://avrnbefzxtznpodugacz.supabase.co")
key = os.environ.get("VITE_SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2cm5iZWZ6eHR6bnBvZHVnYWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2MTU3MzksImV4cCI6MjA5OTE5MTczOX0._wZp4bK1b2XGSYYUWzQTw2mkyCyKvwOi6iyIIuauRKI")
supabase: Client = create_client(url, key)

TRANSLATION_ID = 1
BOOK_ID = 'mat'

def scrape_chapter(chapter_num):
    print(f"Scraping chapter {chapter_num}...")
    if chapter_num == 1:
        url = "https://augustino.net/tin-mung-theo-thanh-mat-theu"
    else:
        url = f"https://augustino.net/tin-mung-theo-thanh-mat-theu-chuong-{chapter_num}"
        
    response = requests.get(url)
    if response.status_code != 200:
        print(f"Failed to fetch chapter {chapter_num}: HTTP {response.status_code}")
        return []

    soup = BeautifulSoup(response.text, 'html.parser')
    
    # In augustino.net, the content is inside a div with id "page-content" or class "content"
    content_div = soup.find('div', id='page-content') or soup.find('div', class_='content')
    if not content_div:
        print(f"Could not find content div for chapter {chapter_num}")
        return []

    verses_data = []
    
    # We find all <sub> elements which represent verse numbers
    subs = content_div.find_all('sub', id=re.compile(r'^\d+$'))
    
    for sub in subs:
        verse_num_str = sub.get('id')
        if not verse_num_str.isdigit():
            continue
        verse_num = int(verse_num_str)
        
        # The text for this verse is everything after this <sub> tag until the next <sub> tag or end of paragraph
        verse_nodes = []
        current_node = sub.next_sibling
        while current_node:
            if current_node.name == 'sub' and current_node.get('id', '').isdigit():
                break  # Next verse starts
            
            if current_node.name not in ['p', 'div', 'br', 'hr']:
                if hasattr(current_node, 'get_text'):
                    verse_nodes.append(current_node.get_text(strip=False))
                elif isinstance(current_node, str):
                    verse_nodes.append(str(current_node))
            else:
                verse_nodes.append(" ")
            
            current_node = current_node.next_sibling
            
            if current_node is None:
                parent = sub.parent
                if parent:
                    next_p = parent.find_next_sibling(['p', 'div'])
                    if next_p:
                        first_sub = next_p.find('sub', id=re.compile(r'^\d+$'))
                        if first_sub:
                            for child in next_p.contents:
                                if child == first_sub:
                                    break
                                if hasattr(child, 'get_text'):
                                    verse_nodes.append(child.get_text(strip=False))
                                elif isinstance(child, str):
                                    verse_nodes.append(str(child))
                        else:
                            verse_nodes.append(next_p.get_text(separator=' ', strip=False))
        
        verse_text = ''.join(verse_nodes).strip()
        verse_text = re.sub(r'\s+', ' ', verse_text).strip()
        
        if verse_text:
            verses_data.append({
                'translation_id': TRANSLATION_ID,
                'book_id': BOOK_ID,
                'chapter': chapter_num,
                'verse_num': verse_num,
                'verse_text': verse_text
            })

    # Extract verse 1
    first_sub = content_div.find('sub', id='2')
    if first_sub and not any(v['verse_num'] == 1 for v in verses_data):
        verse1_nodes = []
        for p in content_div.find_all('p'):
            for child in p.contents:
                if child == first_sub:
                    break
                if child.name == 'sub' and child.get('id', '').isdigit():
                    continue
                if hasattr(child, 'get_text'):
                    verse1_nodes.append(child.get_text(strip=False))
                elif isinstance(child, str):
                    verse1_nodes.append(str(child))
            if first_sub in p.contents:
                break
        
        verse1_text = ''.join(verse1_nodes).strip()
        verse1_text = re.sub(r'\s+', ' ', verse1_text).strip()
        
        # Remove trailing verse numbers if accidentally included
        verse1_text = re.sub(r'\s*\d+$', '', verse1_text).strip()
        
        if verse1_text:
            verses_data.insert(0, {
                'translation_id': TRANSLATION_ID,
                'book_id': BOOK_ID,
                'chapter': chapter_num,
                'verse_num': 1,
                'verse_text': verse1_text
            })

    return verses_data

def main():
    print("Starting Matthew scraper...")
    all_verses = []
    for ch in range(1, 29):
        verses = scrape_chapter(ch)
        print(f"Chapter {ch}: found {len(verses)} verses")
        all_verses.extend(verses)
        
    print(f"Total verses scraped: {len(all_verses)}")
    
    # Insert to Supabase in batches
    batch_size = 100
    for i in range(0, len(all_verses), batch_size):
        batch = all_verses[i:i+batch_size]
        try:
            res = supabase.table('verses').upsert(batch, on_conflict='translation_id,book_id,chapter,verse_num').execute()
            print(f"Inserted batch {i//batch_size + 1}")
        except Exception as e:
            print(f"Error inserting batch {i//batch_size + 1}: {e}")

if __name__ == "__main__":
    main()
