# gymnast_avatar_fetcher.py
import os
import re
import time
import json
import requests
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from io import BytesIO
from bs4 import BeautifulSoup
import concurrent.futures
from typing import Dict, List, Optional

# ==========================================
# 运动员数据（从 e_score_data.js 提取，共60人）
# ==========================================
GYMNASTS = [
    # Algeria
    {"id": "nemour", "name": "Kaylia Nemour", "country": "ALG"},
    # Australia
    {"id": "mcdonald", "name": "Kate McDonald", "country": "AUS"},
    {"id": "pass", "name": "Ruby Pass", "country": "AUS"},
    # Austria
    {"id": "moerz", "name": "Charize Moerz", "country": "AUT"},
    # Belgium
    {"id": "brassart", "name": "Maellyse Brassart", "country": "BEL"},
    # Brazil
    {"id": "saraiva", "name": "Flavia Saraiva", "country": "BRA"},
    {"id": "barbosa", "name": "Jade Barbosa", "country": "BRA"},
    {"id": "soares", "name": "Julia Soares", "country": "BRA"},
    {"id": "andrade", "name": "Rebeca Andrade", "country": "BRA"},
    # Canada
    {"id": "tran", "name": "Aurelie Tran", "country": "CAN"},
    {"id": "stewart", "name": "Ava Stewart", "country": "CAN"},
    {"id": "lee_c", "name": "Cassie Lee", "country": "CAN"},
    {"id": "black", "name": "Elisabeth Black", "country": "CAN"},
    # China
    {"id": "ou", "name": "Ou Yushan", "country": "CHN"},
    {"id": "qiu", "name": "Qiu Qiyuan", "country": "CHN"},
    {"id": "zhang", "name": "Zhang Yihan", "country": "CHN"},
    {"id": "zhou", "name": "Zhou Yaqin", "country": "CHN"},
    # Colombia
    {"id": "blanco", "name": "Luisa Blanco", "country": "COL"},
    # Czechia
    {"id": "artonomova", "name": "Sona Artonomova", "country": "CZE"},
    # Egypt
    {"id": "mahmoud", "name": "Jana Mahmoud", "country": "EGY"},
    # France
    {"id": "mdjds", "name": "Melanie de Jesus Dos Santos", "country": "FRA"},
    {"id": "eijken", "name": "Ming van Eijken", "country": "FRA"},
    {"id": "osyssek", "name": "Morgane Osyssek-Reimer", "country": "FRA"},
    # Germany
    {"id": "kevric", "name": "Helen Kevric", "country": "GER"},
    {"id": "schaefer", "name": "Pauline Schaefer-Betz", "country": "GER"},
    {"id": "voss", "name": "Sarah Voss", "country": "GER"},
    # Great Britain
    {"id": "martin", "name": "Abigail Martin", "country": "GBR"},
    {"id": "fenton", "name": "Georgia-Mae Fenton", "country": "GBR"},
    {"id": "evans", "name": "Ruby Evans", "country": "GBR"},
    # Haiti
    {"id": "brown", "name": "Lynzee Brown", "country": "HAI"},
    # Hungary
    {"id": "czifra", "name": "Bettina Czifra", "country": "HUN"},
    # Italy
    {"id": "damato", "name": "Alice D'Amato", "country": "ITA"},
    {"id": "andreoli", "name": "Angela Andreoli", "country": "ITA"},
    {"id": "esposito", "name": "Manila Esposito", "country": "ITA"},
    # Japan
    {"id": "nakamura", "name": "Haruka Nakamura", "country": "JPN"},
    {"id": "okumura", "name": "Mana Okumura", "country": "JPN"},
    {"id": "kishi", "name": "Rina Kishi", "country": "JPN"},
    {"id": "ushioku", "name": "Kohane Ushioku", "country": "JPN"},
    # South Korea
    {"id": "eom", "name": "Dohyun Eom", "country": "KOR"},
    {"id": "shin", "name": "Shin Solyi", "country": "KOR"},
    {"id": "lee_y", "name": "Yunseo Lee", "country": "KOR"},
    # Mexico
    {"id": "sandoval", "name": "Antziri Sandoval", "country": "MEX"},
    # Netherlands
    {"id": "wevers", "name": "Lieke Wevers", "country": "NED"},
    {"id": "visser", "name": "Naomi Visser", "country": "NED"},
    {"id": "volleman", "name": "Tisha Volleman", "country": "NED"},
    # New Zealand
    {"id": "rose", "name": "Georgia-Rose Brown", "country": "NZL"},
    # Panama
    {"id": "heron", "name": "Hillary Heron", "country": "PAN"},
    # Philippines
    {"id": "finnegan", "name": "Aleah Finnegan", "country": "PHI"},
    {"id": "malabuyo", "name": "Emma Malabuyo", "country": "PHI"},
    {"id": "ruivivar", "name": "Levi Ruivivar", "country": "PHI"},
    # Portugal
    {"id": "martins", "name": "Filipa Martins", "country": "POR"},
    # North Korea
    {"id": "an", "name": "An Chang Ok", "country": "PRK"},
    # Romania
    {"id": "ghigoarta", "name": "Amalia Ghigoarta", "country": "ROU"},
    {"id": "barbosu", "name": "Ana Barbosu", "country": "ROU"},
    {"id": "cosman", "name": "Lilia Cosman", "country": "ROU"},
    {"id": "voinea", "name": "Sabrina Maneca-Voinea", "country": "ROU"},
    # South Africa
    {"id": "rooskrantz", "name": "Caitlin Rooskrantz", "country": "RSA"},
    # Slovenia
    {"id": "hirjak", "name": "Lucija Hirjak", "country": "SLO"},
    # Spain
    {"id": "petisco", "name": "Alba Petisco", "country": "ESP"},
    {"id": "perez", "name": "Ana Perez", "country": "ESP"},
    {"id": "casabuena", "name": "Laura Casabuena", "country": "ESP"},
    # Switzerland
    {"id": "bickel", "name": "Lena Bickel", "country": "SUI"},
    # Ukraine
    {"id": "lashchevska", "name": "Anna Lashchevska", "country": "UKR"},
    # United States
    {"id": "carey", "name": "Jade Carey", "country": "USA"},
    {"id": "chiles", "name": "Jordan Chiles", "country": "USA"},
    {"id": "biles", "name": "Simone Biles", "country": "USA"},
    {"id": "lee", "name": "Sunisa Lee", "country": "USA"},
]


# ==========================================
# 头像爬取器
# ==========================================
class AvatarFetcher:
    def __init__(self, output_dir="images"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
        })
        self.downloaded = []
        self.failed = []

    def download_image(self, url: str, save_path: Path) -> bool:
        """下载图片"""
        try:
            time.sleep(0.2)
            resp = self.session.get(url, timeout=15, stream=True)
            if resp.status_code == 200:
                img = Image.open(BytesIO(resp.content))
                # 统一保存为 PNG 格式
                save_path = save_path.with_suffix('.png')
                img.save(save_path, 'PNG')
                print(f"  ✅ 已保存: {save_path.name}")
                return True
            return False
        except Exception as e:
            return False

    # 方案1: Wikipedia
    def fetch_from_wikipedia(self, name: str, save_path: Path) -> bool:
        """从 Wikipedia 获取图片"""
        try:
            # 搜索 Wikipedia
            search_url = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={requests.utils.quote(name)}+gymnast&format=json"
            resp = self.session.get(search_url, timeout=10)
            if resp.status_code != 200:
                return False
            
            data = resp.json()
            if not data.get('query', {}).get('search'):
                return False
            
            page_title = data['query']['search'][0]['title']
            
            # 获取页面图片
            img_url = f"https://en.wikipedia.org/w/api.php?action=query&titles={requests.utils.quote(page_title)}&prop=pageimages&format=json&pithumbsize=500"
            img_resp = self.session.get(img_url, timeout=10)
            img_data = img_resp.json()
            
            pages = img_data.get('query', {}).get('pages', {})
            for page in pages.values():
                if page.get('thumbnail', {}).get('source'):
                    img_src = page['thumbnail']['source']
                    return self.download_image(img_src, save_path)
            return False
        except Exception:
            return False

    # 方案2: 奥运官网
    def fetch_from_olympics(self, name: str, save_path: Path) -> bool:
        """从 Olympics.com 获取"""
        try:
            name_formatted = name.lower().replace(' ', '-').replace("'", "")
            cdn_urls = [
                f"https://img.olympicchannel.com/images/athletes/{name_formatted}.png",
                f"https://resources.olympics.com/photo/athletes/{name_formatted}.jpg",
            ]
            for url in cdn_urls:
                if self.download_image(url, save_path):
                    return True
            return False
        except Exception:
            return False

    # 方案3: 国际体联官网
    def fetch_from_fig(self, name: str, save_path: Path) -> bool:
        """从 FIG 官网获取"""
        try:
            search_name = name.lower().replace(' ', '-')
            fig_url = f"https://www.gymnastics.sport/site/athletes/bio_detail.php?id=search&name={requests.utils.quote(name)}"
            resp = self.session.get(fig_url, timeout=10)
            if resp.status_code != 200:
                return False
            
            soup = BeautifulSoup(resp.text, 'html.parser')
            img_tag = soup.find('img', src=re.compile(r'athlete|photo', re.I))
            
            if img_tag and img_tag.get('src'):
                img_url = img_tag['src']
                if not img_url.startswith('http'):
                    img_url = 'https://www.gymnastics.sport' + img_url
                return self.download_image(img_url, save_path)
            return False
        except Exception:
            return False

    # 方案4: 创建占位图
    def create_placeholder(self, name: str, save_path: Path) -> bool:
        """创建带名字首字母的占位图"""
        try:
            img = Image.new('RGB', (400, 400), color=(100, 150, 200))
            draw = ImageDraw.Draw(img)
            
            # 获取名字首字母
            initials = ''.join([w[0].upper() for w in name.split()[:2]])
            
            try:
                font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 120)
            except:
                try:
                    font = ImageFont.truetype("arial.ttf", 120)
                except:
                    font = ImageFont.load_default()
            
            # 居中绘制
            bbox = draw.textbbox((0, 0), initials, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
            x = (400 - text_width) // 2
            y = (400 - text_height) // 2
            
            draw.text((x, y), initials, fill='white', font=font)
            img.save(save_path.with_suffix('.png'), 'PNG')
            print(f"  🎨 创建占位图: {save_path.name}")
            return True
        except Exception as e:
            print(f"  ❌ 占位图创建失败: {e}")
            return False

    def fetch_avatar(self, gymnast: Dict) -> bool:
        """主爬取函数"""
        name = gymnast['name']
        athlete_id = gymnast['id']
        save_path = self.output_dir / f"{athlete_id}.png"
        
        if save_path.exists():
            print(f"⏭️ 已存在: {athlete_id}.png")
            return True
        
        print(f"\n🔍 搜索: {name} ({athlete_id})")
        
        strategies = [
            ("Wikipedia", self.fetch_from_wikipedia),
            ("Olympics", self.fetch_from_olympics),
            ("FIG官网", self.fetch_from_fig),
        ]
        
        for source_name, strategy in strategies:
            print(f"  尝试 {source_name}...")
            if strategy(name, save_path):
                self.downloaded.append((name, save_path))
                return True
        
        print(f"  ⚠️ 未找到，创建占位图")
        self.create_placeholder(name, save_path)
        self.failed.append(name)
        return False

    def run(self, max_workers: int = 5):
        """批量运行"""
        print(f"🎯 开始爬取 {len(GYMNASTS)} 位运动员头像")
        print(f"📁 保存目录: {self.output_dir.absolute()}")
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = [executor.submit(self.fetch_avatar, g) for g in GYMNASTS]
            concurrent.futures.wait(futures)
        
        print("\n" + "="*50)
        print(f"✅ 成功: {len(self.downloaded)} 张")
        print(f"❌ 占位图: {len(self.failed)} 张")
        if self.failed:
            print(f"占位图名单: {', '.join(self.failed)}")
        print("="*50)


# ==========================================
# 生成 HTML 使用的图片路径配置文件
# ==========================================
def generate_image_config(output_dir: Path):
    """生成图片配置文件，方便在 HTML 中引用"""
    config = {
        "images": {}
    }
    
    for img_file in output_dir.glob("*.png"):
        athlete_id = img_file.stem
        config["images"][athlete_id] = f"./images/{img_file.name}"
    
    # 保存为 JSON
    config_path = output_dir.parent / "image_paths.json"
    with open(config_path, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)
    
    print(f"\n📄 图片路径配置已保存: {config_path}")
    
    # 同时生成一个可以直接复制到 e_score_data.js 的代码片段
    js_snippet = "// 在 gymnastsData 中添加 image 字段:\n"
    for athlete in GYMNASTS:
        img_path = f"./images/{athlete['id']}.png"
        js_snippet += f"// {athlete['id']}: image: \"{img_path}\",\n"
    
    with open(output_dir.parent / "image_fields_snippet.txt", 'w', encoding='utf-8') as f:
        f.write(js_snippet)
    print(f"📝 代码片段已保存: {output_dir.parent / 'image_fields_snippet.txt'}")


# ==========================================
# 主函数
# ==========================================
def main():
    # 1. 爬取头像
    fetcher = AvatarFetcher(output_dir="images")
    fetcher.run(max_workers=5)
    
    # 2. 生成配置文件
    generate_image_config(Path("images"))


if __name__ == "__main__":
    main()