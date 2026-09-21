"""네이버 증권(https://stock.naver.com/market/stock/kr) 국내 주식 상위 종목 크롤러.

화면의 표는 자바스크립트로 그려지기 때문에 requests + BeautifulSoup만으로는 빈 페이지가 받아진다.
그래서 두 가지 방식을 지원한다.

1) API 방식 (기본): 화면이 내부적으로 호출하는 JSON API에서 직접 가져온다.
       python stock_crawler.py --market KOSPI --top 200
2) HTML 방식: 브라우저에서 저장/복사한 화면 HTML을 BeautifulSoup으로 파싱한다.
       python stock_crawler.py --html page.html

결과는 콘솔에 출력하고 stock_top.csv 로 저장한다.
필요 패키지: pip install requests beautifulsoup4
"""
import argparse
import csv
import sys
import time

import requests
from bs4 import BeautifulSoup

API_URL = "https://stock.naver.com/api/domestic/market/stock/default"
HEADERS = {
    "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                   "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"),
    "Accept-Language": "ko-KR,ko;q=0.9",
}
COLUMNS = ["순위", "종목명", "종목코드", "현재가", "전일대비", "등락률(%)",
           "거래량", "거래대금(백만)", "고가", "저가", "시가총액(억)"]


def to_int(value):
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return 0


# ---------------------------------------------------------------- API 방식
PAGE_SIZE = 200  # 한 번에 늘려 가는 크기(페이지 크기)
DELAY = 0.3      # 요청 사이 대기(초): 서버 부담을 줄이기 위함


def fetch_page(market, page, page_size):
    """page(1부터) 번째 페이지의 종목 목록을 돌려준다.

    이 API는 page 파라미터를 무시하고 pageSize(=앞에서부터 개수)만 지원한다.
    그래서 pageSize = page * page_size 로 요청하고, 앞 페이지 분량을 잘라 내서
    이번 페이지에 해당하는 구간만 사용한다.
    """
    res = requests.get(API_URL, params={"marketType": market, "pageSize": page * page_size},
                       headers=HEADERS, timeout=20)
    res.raise_for_status()
    return res.json()[(page - 1) * page_size:]


def fetch_all(market, page_size=PAGE_SIZE, max_pages=20):
    """마지막 페이지(page_size보다 적게 오는 페이지)까지 페이징하며 전체 종목을 모은다."""
    items, seen = [], set()
    for page in range(1, max_pages + 1):
        chunk = fetch_page(market, page, page_size)
        new = [x for x in chunk if x["itemcode"] not in seen]  # 순서가 바뀌어도 중복 방지
        seen.update(x["itemcode"] for x in new)
        items.extend(new)
        print(f"  {page}페이지: {len(chunk)}건 (누적 {len(items)}건)", file=sys.stderr)
        if len(chunk) < page_size:
            break
        time.sleep(DELAY)
    return items


def fetch_from_api(market="KOSPI", top=200, sort_by="amount"):
    """전체 종목을 페이징으로 모은 뒤 정렬해서 상위 top개를 돌려준다.

    market : KOSPI / KOSDAQ / KONEX / ALL
    sort_by: amount(거래대금) / volume(거래량) / rate(등락률)
    API는 정렬 옵션을 받지 않으므로 전체를 받아 직접 정렬한다.
    """
    items = fetch_all(market)

    key = {"amount": lambda x: to_int(x.get("tradeAmount")),
           "volume": lambda x: to_int(x.get("tradeVolume")),
           "rate": lambda x: float(x.get("prevChangeRate") or 0)}[sort_by]
    items.sort(key=key, reverse=True)

    rows = []
    for rank, x in enumerate(items[:top], 1):
        rate = float(x.get("prevChangeRate") or 0)
        change = to_int(x.get("prevChangePrice"))
        # upDownGb: 4,5 = 하락 계열 (API가 부호 없이 내려줌)
        if str(x.get("upDownGb")) in ("4", "5"):
            rate, change = -abs(rate), -abs(change)
        rows.append([
            rank, x["itemname"], x["itemcode"], to_int(x["nowPrice"]), change, rate,
            to_int(x["tradeVolume"]), to_int(x["tradeAmount"]) // 1_000_000,
            to_int(x["highPrice"]), to_int(x["lowPrice"]),
            to_int(x["marketSum"]) // 100_000_000,
        ])
    return rows


# --------------------------------------------------------------- HTML 방식
def parse_html(html):
    """화면 HTML의 '홈 주식 테이블'을 BeautifulSoup으로 파싱한다.

    class 이름 뒤의 해시(예: _AS2zw)는 배포마다 바뀌므로 class^= (접두어) 로 찾고,
    변하지 않는 caption / 구조를 기준으로 삼는다.
    """
    soup = BeautifulSoup(html, "html.parser")
    caption = soup.find("caption", string=lambda s: s and "주식 테이블" in s)
    table = caption.find_parent("table") if caption else soup.select_one("table")
    if table is None:
        raise ValueError("주식 테이블을 찾지 못했습니다. 표가 그려진 뒤의 HTML인지 확인하세요.")

    rows = []
    for tr in table.select("tbody tr"):
        tds = tr.find_all("td")
        if len(tds) < 8:
            continue
        index = tds[0].select_one(".index")
        name = tds[0].select_one('[class^="SingleLineText_text"]')
        img = tds[0].select_one("img")
        code = ""
        if img and img.get("src"):
            # .../logo/stock/Stock005930.svg -> 005930
            code = img["src"].rsplit("Stock", 1)[-1].split(".")[0]

        price = tds[1].select_one('[class^="SingleLinePrice_price"]')
        change_box = tds[2].select_one('[class^="ModulePriceChange_amount"]')
        percent = tds[2].select_one('[class^="ModulePercent_module-percent"]')
        volume = tds[3].select_one('[class^="SingleLinePrice_price"]')
        value = tds[4].select_one('[class^="SingleLinePrice_price"]')
        high = tds[5].select_one('[class^="SingleLinePrice_price"]')
        low = tds[6].select_one('[class^="SingleLinePrice_price"]')
        cap = tds[7].select_one('[class^="SingleLineText_text"]')

        falling = tds[2].select_one('[class*="_fall"]') is not None
        rate_text = percent.get_text(strip=True).strip("()%+") if percent else "0"
        change_text = change_box.get_text(strip=True).replace(",", "") if change_box else "0"
        # 등락 아이콘 안의 접근성 텍스트("상승"/"하락")가 섞이므로 숫자만 남긴다.
        change = to_int("".join(c for c in change_text if c.isdigit()))
        rate = float(rate_text.replace(",", "") or 0)
        if falling:
            change, rate = -change, -abs(rate)

        text = lambda n: n.get_text(strip=True) if n else ""
        num = lambda n: to_int(text(n).replace(",", ""))
        rows.append([
            int(text(index) or len(rows) + 1), text(name), code, num(price), change, rate,
            num(volume), num(value), num(high), num(low), text(cap),
        ])
    return rows


# -------------------------------------------------------------------- 출력
def show(rows):
    print(f"{'순위':>3}  {'종목명':<12} {'현재가':>10} {'등락률':>8} {'거래량':>12} {'거래대금(백만)':>15}")
    for r in rows:
        print(f"{r[0]:>3}  {r[1]:<12} {r[3]:>10,} {r[5]:>+7.2f}% {r[6]:>12,} {r[7]:>15,}")


def save_csv(rows, path):
    with open(path, "w", newline="", encoding="utf-8-sig") as f:  # utf-8-sig: 엑셀에서 한글 깨짐 방지
        w = csv.writer(f)
        w.writerow(COLUMNS)
        w.writerows(rows)


def main():
    ap = argparse.ArgumentParser(description="네이버 증권 국내 주식 상위 종목 크롤러")
    ap.add_argument("--market", default="KOSPI", choices=["KOSPI", "KOSDAQ", "KONEX", "ALL"])
    ap.add_argument("--top", type=int, default=200, help="저장할 상위 종목 수 (기본 200)")
    ap.add_argument("--sort", default="amount", choices=["amount", "volume", "rate"],
                    help="amount=거래대금, volume=거래량, rate=등락률")
    ap.add_argument("--html", help="API 대신 저장해 둔 화면 HTML 파일을 파싱")
    ap.add_argument("--out", default="stock_top.csv")
    args = ap.parse_args()

    try:
        if args.html:
            with open(args.html, encoding="utf-8") as f:
                rows = parse_html(f.read())
        else:
            rows = fetch_from_api(args.market, args.top, args.sort)
    except (requests.RequestException, ValueError, OSError) as e:
        sys.exit(f"오류: {e}")

    show(rows)
    save_csv(rows, args.out)
    print(f"\n{len(rows)}건을 {args.out} 에 저장했습니다.")


if __name__ == "__main__":
    main()
