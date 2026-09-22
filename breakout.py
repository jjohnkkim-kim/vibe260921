import math
import os
import random
import threading
import tkinter as tk

try:
    import winsound
except ImportError:  # Windows 이외 환경에서는 소리 없이 실행
    winsound = None

WIDTH, HEIGHT = 640, 600
HUD_H = 48
COLS, ROWS = 10, 7
MARGIN = 20
GAP = 3
BRICK_W = (WIDTH - MARGIN * 2) / COLS
BRICK_H = 24
BRICK_TOP = HUD_H + 40
PADDLE_W, PADDLE_H = 100, 14
PADDLE_Y = HEIGHT - 50
BALL_R = 8
BASE_SPEED = 6.0
FONT = "Malgun Gothic"
BEST_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "breakout_best.txt")

ROW_COLORS = ["#ff5e6c", "#ff9f43", "#feca57", "#1dd1a1", "#48dbfb", "#5f7cff", "#c56cf0"]
STEEL = "#9aa7b8"

POWERUPS = {
    "W": ("#1dd1a1", "패들 확대"),
    "S": ("#48dbfb", "슬로우"),
    "L": ("#ff5e6c", "목숨 +1"),
}


def mix(c, target, t):
    r, g, b = (int(c[i:i + 2], 16) for i in (1, 3, 5))
    tr, tg, tb = (int(target[i:i + 2], 16) for i in (1, 3, 5))
    return "#%02x%02x%02x" % (int(r + (tr - r) * t), int(g + (tg - g) * t), int(b + (tb - b) * t))


def lighten(c, t):
    return mix(c, "#ffffff", t)


def darken(c, t):
    return mix(c, "#000000", t)


def layout(level, r, c):
    """레벨별 벽돌 배치 패턴."""
    p = (level - 1) % 4
    if p == 0:
        return True
    if p == 1:
        return (r + c) % 2 == 0
    if p == 2:
        return r <= min(c, COLS - 1 - c)
    return r % 2 == 0 or c in (0, COLS - 1)


class Breakout:
    def __init__(self, root):
        self.root = root
        root.title("BREAKOUT")
        root.resizable(False, False)
        self.canvas = tk.Canvas(root, width=WIDTH, height=HEIGHT,
                                bg="#0b0e1f", highlightthickness=0)
        self.canvas.pack()

        self.best = self.load_best()
        self.sound = True
        self.left = self.right = False
        self.frame = 0
        self.state = "title"
        self.particles, self.drops, self.trail, self.bricks = [], [], [], []
        self.wide_timer = self.slow_timer = 0
        self.draw_background()

        root.bind("<KeyPress-Left>", lambda e: setattr(self, "left", True))
        root.bind("<KeyRelease-Left>", lambda e: setattr(self, "left", False))
        root.bind("<KeyPress-Right>", lambda e: setattr(self, "right", True))
        root.bind("<KeyRelease-Right>", lambda e: setattr(self, "right", False))
        root.bind("<Motion>", self.on_mouse)
        root.bind("<Button-1>", lambda e: self.action())
        root.bind("<space>", lambda e: self.action())
        root.bind("<Return>", lambda e: self.action())
        root.bind("p", lambda e: self.toggle_pause())
        root.bind("<Escape>", lambda e: self.toggle_pause())
        root.bind("m", lambda e: self.toggle_sound())
        root.bind("r", lambda e: self.new_game())

        self.clear_game_items()
        self.show_title()
        self.tick()

    # ---------- 유틸 ----------
    def load_best(self):
        try:
            with open(BEST_FILE) as f:
                return int(f.read().strip())
        except (OSError, ValueError):
            return 0

    def save_best(self):
        try:
            with open(BEST_FILE, "w") as f:
                f.write(str(self.best))
        except OSError:
            pass

    def beep(self, freq, dur=40):
        if self.sound and winsound:
            threading.Thread(target=winsound.Beep, args=(freq, dur), daemon=True).start()

    def toggle_sound(self):
        self.sound = not self.sound
        self.draw_hud()

    def rrect(self, x1, y1, x2, y2, r, **kw):
        pts = [x1 + r, y1, x2 - r, y1, x2, y1, x2, y1 + r, x2, y2 - r, x2, y2,
               x2 - r, y2, x1 + r, y2, x1, y2, x1, y2 - r, x1, y1 + r, x1, y1]
        return self.canvas.create_polygon(pts, smooth=True, **kw)

    # ---------- 배경 ----------
    def draw_background(self):
        top, bottom = "#141a3a", "#05060f"
        steps = 60
        h = HEIGHT / steps
        for i in range(steps):
            col = mix(top, bottom, i / (steps - 1))
            self.canvas.create_rectangle(0, i * h, WIDTH, (i + 1) * h + 1,
                                         fill=col, outline="", tags="bg")
        self.stars = []
        for _ in range(70):
            x, y = random.uniform(0, WIDTH), random.uniform(HUD_H, HEIGHT)
            s = random.choice([1, 1, 2])
            item = self.canvas.create_oval(x, y, x + s, y + s, fill="#5b6494",
                                           outline="", tags="bg")
            self.stars.append(item)

    def twinkle(self):
        if self.frame % 8 == 0:
            for item in random.sample(self.stars, 6):
                self.canvas.itemconfig(item, fill=random.choice(
                    ["#3a4270", "#5b6494", "#8b95c9", "#c9d0f5"]))

    # ---------- 게임 상태 ----------
    def clear_game_items(self):
        for tag in ("brick", "paddle", "ball", "fx", "hud", "overlay"):
            self.canvas.delete(tag)

    def new_game(self):
        self.clear_game_items()
        self.score = 0
        self.lives = 3
        self.level = 1
        self.combo = 0
        self.wide_timer = 0
        self.slow_timer = 0
        self.particles = []
        self.drops = []
        self.trail = []
        self.paddle_w = PADDLE_W
        self.paddle_x = (WIDTH - PADDLE_W) / 2
        self.build_level()
        self.make_paddle_ball()
        self.serve()
        self.draw_hud()

    def build_level(self):
        self.bricks = []
        for r in range(ROWS):
            for c in range(COLS):
                if not layout(self.level, r, c):
                    continue
                x1 = MARGIN + c * BRICK_W + GAP / 2
                y1 = BRICK_TOP + r * BRICK_H + GAP / 2
                x2 = x1 + BRICK_W - GAP
                y2 = y1 + BRICK_H - GAP
                hp = 2 if (self.level >= 2 and r < 2) else 1
                b = {"rect": (x1, y1, x2, y2), "row": r, "hp": hp, "items": []}
                self.bricks.append(b)
                self.draw_brick(b)

    def draw_brick(self, b):
        for i in b["items"]:
            self.canvas.delete(i)
        x1, y1, x2, y2 = b["rect"]
        base = STEEL if b["hp"] > 1 else ROW_COLORS[b["row"] % len(ROW_COLORS)]
        body = self.rrect(x1, y1, x2, y2, 5, fill=base, outline=darken(base, 0.35),
                          tags="brick")
        shade = self.canvas.create_line(x1 + 4, y2 - 3, x2 - 4, y2 - 3,
                                        fill=darken(base, 0.3), width=2, tags="brick")
        shine = self.canvas.create_line(x1 + 5, y1 + 4, x2 - 5, y1 + 4,
                                        fill=lighten(base, 0.6), width=2, tags="brick")
        b["items"] = [body, shade, shine]

    def make_paddle_ball(self):
        self.paddle_glow = self.rrect(0, 0, 1, 1, 8, fill="", outline="#2f6bff",
                                      width=3, tags="paddle")
        self.paddle_body = self.rrect(0, 0, 1, 1, 7, fill="#dfe6ff", outline="#8fa4ff",
                                      tags="paddle")
        self.paddle_shine = self.canvas.create_line(0, 0, 1, 1, fill="white", width=2,
                                                    tags="paddle")
        self.ball_glow = self.canvas.create_oval(0, 0, 1, 1, fill="#ffb84d", outline="",
                                                 stipple="gray25", tags="ball")
        self.ball_item = self.canvas.create_oval(0, 0, 1, 1, fill="#fff3c4",
                                                 outline="#ffb84d", width=2, tags="ball")
        self.place_paddle()

    def place_paddle(self):
        w = self.paddle_w
        x = max(0, min(WIDTH - w, self.paddle_x))
        self.paddle_x = x
        y = PADDLE_Y
        self.canvas.delete(self.paddle_glow)
        self.canvas.delete(self.paddle_body)
        color = "#1dd1a1" if self.wide_timer > 0 else "#2f6bff"
        self.paddle_glow = self.rrect(x - 2, y - 2, x + w + 2, y + PADDLE_H + 2, 9,
                                      fill="", outline=color, width=3, tags="paddle")
        self.paddle_body = self.rrect(x, y, x + w, y + PADDLE_H, 7, fill="#dfe6ff",
                                      outline="#8fa4ff", tags="paddle")
        self.canvas.tag_lower(self.paddle_body, self.paddle_shine)
        self.canvas.tag_lower(self.paddle_glow, self.paddle_body)
        self.canvas.coords(self.paddle_shine, x + 8, y + 3, x + w - 8, y + 3)

    def serve(self):
        self.state = "ready"
        self.speed = min(BASE_SPEED + (self.level - 1) * 0.6, 10)
        ang = math.radians(random.uniform(-25, 25))
        self.ux, self.uy = math.sin(ang), -math.cos(ang)
        self.trail = []
        self.combo = 0
        self.stick_ball()
        self.show_hint(f"LEVEL {self.level}", "스페이스 / 클릭으로 발사")

    def stick_ball(self):
        self.bx = self.paddle_x + self.paddle_w / 2
        self.by = PADDLE_Y - BALL_R - 1
        self.draw_ball()

    def draw_ball(self):
        r = BALL_R
        self.canvas.coords(self.ball_glow, self.bx - r - 5, self.by - r - 5,
                           self.bx + r + 5, self.by + r + 5)
        self.canvas.coords(self.ball_item, self.bx - r, self.by - r, self.bx + r, self.by + r)

    # ---------- 입력 ----------
    def on_mouse(self, e):
        if self.state in ("ready", "playing"):
            self.paddle_x = e.x - self.paddle_w / 2
            self.place_paddle()

    def action(self):
        if self.state == "title":
            self.new_game()
        elif self.state == "ready":
            self.state = "playing"
            self.canvas.delete("overlay")
        elif self.state == "paused":
            self.toggle_pause()
        elif self.state == "over":
            self.new_game()

    def toggle_pause(self):
        if self.state == "playing":
            self.state = "paused"
            self.show_panel("일시정지", "P / 스페이스로 계속", "#48dbfb")
        elif self.state == "paused":
            self.state = "playing"
            self.canvas.delete("overlay")

    # ---------- 화면(오버레이) ----------
    def show_title(self):
        self.canvas.delete("overlay")
        cx = WIDTH / 2
        c = self.canvas
        c.create_rectangle(0, 0, WIDTH, HEIGHT, fill="#05060f", stipple="gray50",
                           outline="", tags="overlay")
        for i, (ch, col) in enumerate(zip("BREAKOUT", ROW_COLORS + ["#ff5e6c"])):
            x = cx - 4 * 52 + i * 52 + 26
            c.create_text(x + 3, 213, text=ch, fill=darken(col, 0.6),
                          font=(FONT, 44, "bold"), tags="overlay")
            c.create_text(x, 210, text=ch, fill=col, font=(FONT, 44, "bold"),
                          tags="overlay")
        c.create_text(cx, 290, text="블럭깨기", fill="#c9d0f5",
                      font=(FONT, 18), tags="overlay")
        c.create_text(cx, 380, text="스페이스 / 클릭으로 시작", fill="white",
                      font=(FONT, 16, "bold"), tags=("overlay", "blink"))
        c.create_text(cx, 450, fill="#8b95c9", font=(FONT, 11), tags="overlay",
                      text="← → / 마우스: 이동     P: 일시정지     M: 소리     R: 재시작\n"
                           "W 확대 · S 슬로우 · L 목숨 아이템을 받아보세요",
                      justify="center")
        if self.best:
            c.create_text(cx, 520, text=f"최고 점수  {self.best}", fill="#feca57",
                          font=(FONT, 14, "bold"), tags="overlay")

    def show_hint(self, title, sub):
        self.canvas.delete("overlay")
        cy = PADDLE_Y - 110
        self.canvas.create_text(WIDTH / 2 + 2, cy + 2, text=title, fill="#000000",
                                font=(FONT, 28, "bold"), tags="overlay")
        self.canvas.create_text(WIDTH / 2, cy, text=title, fill="#feca57",
                                font=(FONT, 28, "bold"), tags="overlay")
        self.canvas.create_text(WIDTH / 2, cy + 38, text=sub, fill="white",
                                font=(FONT, 13), tags=("overlay", "blink"))

    def show_panel(self, title, sub, color, lines=()):
        self.canvas.delete("overlay")
        c = self.canvas
        c.create_rectangle(0, 0, WIDTH, HEIGHT, fill="#05060f", stipple="gray50",
                           outline="", tags="overlay")
        x1, y1, x2, y2 = WIDTH / 2 - 190, HEIGHT / 2 - 130, WIDTH / 2 + 190, HEIGHT / 2 + 130
        self.rrect(x1 - 3, y1 - 3, x2 + 3, y2 + 3, 22, fill=color, tags="overlay")
        self.rrect(x1, y1, x2, y2, 20, fill="#121734", tags="overlay")
        c.create_text(WIDTH / 2, y1 + 55, text=title, fill=color,
                      font=(FONT, 30, "bold"), tags="overlay")
        for i, ln in enumerate(lines):
            c.create_text(WIDTH / 2, y1 + 110 + i * 28, text=ln, fill="white",
                          font=(FONT, 15), tags="overlay")
        c.create_text(WIDTH / 2, y2 - 30, text=sub, fill="#c9d0f5",
                      font=(FONT, 12), tags=("overlay", "blink"))

    # ---------- HUD ----------
    def draw_hud(self):
        c = self.canvas
        c.delete("hud")
        c.create_rectangle(0, 0, WIDTH, HUD_H, fill="#0a0d22", outline="", tags="hud")
        c.create_line(0, HUD_H, WIDTH, HUD_H, fill="#2f3a7a", width=2, tags="hud")
        c.create_text(16, 14, anchor="nw", text=f"SCORE  {self.score}", fill="white",
                      font=(FONT, 13, "bold"), tags="hud")
        c.create_text(WIDTH / 2, 12, text=f"LEVEL {self.level}", fill="#feca57",
                      font=(FONT, 13, "bold"), tags="hud")
        c.create_text(WIDTH / 2, 32, text=f"BEST {self.best}", fill="#8b95c9",
                      font=(FONT, 9), tags="hud")
        for i in range(3 if self.lives <= 3 else self.lives):
            col = "#ff5e6c" if i < self.lives else "#3a3f63"
            c.create_text(WIDTH - 16 - i * 24, 24, anchor="e", text="♥", fill=col,
                          font=("Segoe UI Symbol", 17), tags="hud")
        if not self.sound:
            c.create_text(16, 34, anchor="nw", text="소리 꺼짐", fill="#8b95c9",
                          font=(FONT, 8), tags="hud")

    # ---------- 게임 루프 ----------
    def tick(self):
        self.frame += 1
        self.twinkle()
        self.update_paddle_input()

        if self.state == "ready":
            self.stick_ball()
        elif self.state == "playing":
            for _ in range(2):  # 2회 서브스텝으로 터널링 방지
                self.move_ball(0.5)
                if self.state != "playing":
                    break
            self.update_drops()
            self.update_timers()

        self.update_particles()
        self.draw_fx()

        # 안내 문구 깜빡임
        vis = "normal" if (self.frame // 30) % 2 == 0 else "hidden"
        self.canvas.itemconfigure("blink", state=vis)
        self.canvas.tag_raise("overlay")
        self.root.after(16, self.tick)

    def update_paddle_input(self):
        if self.state not in ("ready", "playing"):
            return
        moved = False
        if self.left:
            self.paddle_x -= 9
            moved = True
        if self.right:
            self.paddle_x += 9
            moved = True
        if moved:
            self.place_paddle()

    def update_timers(self):
        if self.wide_timer > 0:
            self.wide_timer -= 1
            if self.wide_timer == 0:
                self.set_paddle_width(PADDLE_W)
        if self.slow_timer > 0:
            self.slow_timer -= 1

    def set_paddle_width(self, w):
        center = self.paddle_x + self.paddle_w / 2
        self.paddle_w = w
        self.paddle_x = center - w / 2
        self.place_paddle()

    def current_speed(self):
        return self.speed * (0.7 if self.slow_timer > 0 else 1.0)

    def move_ball(self, frac):
        v = self.current_speed() * frac
        self.bx += self.ux * v
        self.by += self.uy * v
        r = BALL_R

        if self.bx - r <= 0:
            self.bx, self.ux = r, abs(self.ux)
            self.beep(300)
        elif self.bx + r >= WIDTH:
            self.bx, self.ux = WIDTH - r, -abs(self.ux)
            self.beep(300)
        if self.by - r <= HUD_H:
            self.by, self.uy = HUD_H + r, abs(self.uy)
            self.beep(300)

        # 패들
        px, pw = self.paddle_x, self.paddle_w
        if (self.uy > 0 and PADDLE_Y - 2 <= self.by + r <= PADDLE_Y + PADDLE_H
                and px - r <= self.bx <= px + pw + r):
            off = (self.bx - (px + pw / 2)) / (pw / 2)
            off = max(-1, min(1, off))
            ang = off * math.radians(62)
            self.ux, self.uy = math.sin(ang), -math.cos(ang)
            self.by = PADDLE_Y - r - 1
            self.combo = 0
            self.beep(520)

        self.hit_bricks()

        # 바닥
        if self.by - r > HEIGHT:
            self.lose_life()
            return

        self.trail.append((self.bx, self.by))
        if len(self.trail) > 10:
            self.trail.pop(0)
        self.draw_ball()

    def hit_bricks(self):
        r = BALL_R
        for b in self.bricks:
            x1, y1, x2, y2 = b["rect"]
            cx = max(x1, min(self.bx, x2))
            cy = max(y1, min(self.by, y2))
            if (self.bx - cx) ** 2 + (self.by - cy) ** 2 > r * r:
                continue
            # 이전 위치 기준으로 위/아래에서 왔는지 옆에서 왔는지 판단
            pv = self.current_speed() * 0.5
            pby = self.by - self.uy * pv
            if pby + r <= y1 + 1 or pby - r >= y2 - 1:
                self.uy = -self.uy
            else:
                self.ux = -self.ux
            if abs(self.uy) < 0.25:
                self.uy = math.copysign(0.25, self.uy or -1)
                n = math.hypot(self.ux, self.uy)
                self.ux, self.uy = self.ux / n, self.uy / n
            self.damage_brick(b)
            break

    def damage_brick(self, b):
        b["hp"] -= 1
        x1, y1, x2, y2 = b["rect"]
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        color = ROW_COLORS[b["row"] % len(ROW_COLORS)]
        if b["hp"] > 0:
            self.draw_brick(b)
            self.spawn_particles(mx, my, STEEL, 5)
            self.beep(420)
            return
        for i in b["items"]:
            self.canvas.delete(i)
        self.bricks.remove(b)
        self.combo += 1
        pts = 10 * (ROWS - b["row"]) * min(self.combo, 5)
        self.add_score(pts)
        self.spawn_particles(mx, my, color, 14)
        self.floats_add(mx, my, f"+{pts}", color)
        self.beep(600 + min(self.combo, 8) * 50)
        if random.random() < 0.12:
            self.drops.append({"x": mx, "y": my, "kind": random.choice("WSL")})
        if not self.bricks:
            self.level_clear()

    def add_score(self, pts):
        self.score += pts
        if self.score > self.best:
            self.best = self.score
        self.draw_hud()

    def lose_life(self):
        self.lives -= 1
        self.beep(150, 250)
        self.draw_hud()
        self.wide_timer = self.slow_timer = 0
        self.set_paddle_width(PADDLE_W)
        if self.lives <= 0:
            self.state = "over"
            self.save_best()
            self.canvas.delete("ball")
            new = self.score >= self.best and self.score > 0
            self.show_panel("GAME OVER", "스페이스 / 클릭으로 다시 시작", "#ff5e6c",
                            (f"점수  {self.score}",
                             "새로운 최고 기록!" if new else f"최고 점수  {self.best}"))
            self.ball_glow = self.canvas.create_oval(0, 0, 0, 0, tags="ball")
            self.ball_item = self.canvas.create_oval(0, 0, 0, 0, tags="ball")
        else:
            self.serve()

    def level_clear(self):
        self.add_score(200 * self.level)
        self.save_best()
        self.level += 1
        self.drops.clear()
        self.beep(900, 200)
        self.build_level()
        self.serve()
        self.draw_hud()

    # ---------- 이펙트 ----------
    def spawn_particles(self, x, y, color, n):
        for _ in range(n):
            a = random.uniform(0, math.tau)
            s = random.uniform(1, 4.5)
            self.particles.append({"x": x, "y": y, "vx": math.cos(a) * s,
                                   "vy": math.sin(a) * s - 1, "life": random.randint(18, 34),
                                   "color": color, "size": random.uniform(2, 4.5)})

    def floats_add(self, x, y, text, color):
        self.particles.append({"x": x, "y": y, "vx": 0, "vy": -0.8, "life": 32,
                               "color": color, "size": 0, "text": text})

    def update_particles(self):
        alive = []
        for p in self.particles:
            p["x"] += p["vx"]
            p["y"] += p["vy"]
            if not p.get("text"):
                p["vy"] += 0.18
            p["life"] -= 1
            if p["life"] > 0:
                alive.append(p)
        self.particles = alive

    def update_drops(self):
        alive = []
        for d in self.drops:
            d["y"] += 3
            caught = (PADDLE_Y - 8 <= d["y"] + 10 <= PADDLE_Y + PADDLE_H + 10
                      and self.paddle_x - 12 <= d["x"] <= self.paddle_x + self.paddle_w + 12)
            if caught:
                self.apply_powerup(d["kind"])
            elif d["y"] < HEIGHT + 20:
                alive.append(d)
        self.drops = alive

    def apply_powerup(self, kind):
        color, name = POWERUPS[kind]
        self.beep(880, 80)
        self.floats_add(self.paddle_x + self.paddle_w / 2, PADDLE_Y - 20, name, color)
        if kind == "W":
            self.wide_timer = 60 * 12
            self.set_paddle_width(PADDLE_W * 1.6)
        elif kind == "S":
            self.slow_timer = 60 * 8
        elif kind == "L":
            self.lives = min(self.lives + 1, 5)
            self.draw_hud()

    def draw_fx(self):
        c = self.canvas
        c.delete("fx")
        # 공 꼬리
        n = len(self.trail)
        for i, (x, y) in enumerate(self.trail):
            t = (i + 1) / (n + 1)
            r = BALL_R * t * 0.9
            c.create_oval(x - r, y - r, x + r, y + r,
                          fill=mix("#0b0e1f", "#ffb84d", t * 0.6), outline="", tags="fx")
        # 파티클 / 점수 텍스트
        for p in self.particles:
            if p.get("text"):
                c.create_text(p["x"], p["y"], text=p["text"], fill=p["color"],
                              font=(FONT, 11, "bold"), tags="fx")
            else:
                s = p["size"] * min(1, p["life"] / 14)
                c.create_rectangle(p["x"] - s, p["y"] - s, p["x"] + s, p["y"] + s,
                                   fill=p["color"], outline="", tags="fx")
        # 아이템
        for d in self.drops:
            col = POWERUPS[d["kind"]][0]
            self.rrect(d["x"] - 13, d["y"] - 10, d["x"] + 13, d["y"] + 10, 8,
                       fill=darken(col, 0.45), outline=col, width=2, tags="fx")
            c.create_text(d["x"], d["y"], text=d["kind"], fill="white",
                          font=(FONT, 11, "bold"), tags="fx")
        if c.find_withtag("ball"):
            c.tag_lower("fx", "ball")
        # 활성 아이템 표시
        y = HEIGHT - 16
        if self.state != "title":
            if self.wide_timer > 0:
                self.draw_timer_bar(16, y, self.wide_timer / 720, "#1dd1a1", "확대")
            if self.slow_timer > 0:
                self.draw_timer_bar(120, y, self.slow_timer / 480, "#48dbfb", "슬로우")

    def draw_timer_bar(self, x, y, frac, color, label):
        c = self.canvas
        c.create_text(x, y, anchor="w", text=label, fill=color, font=(FONT, 9), tags="fx")
        c.create_rectangle(x + 38, y - 4, x + 88, y + 4, fill="#1b2048", outline="",
                           tags="fx")
        c.create_rectangle(x + 38, y - 4, x + 38 + 50 * frac, y + 4, fill=color,
                           outline="", tags="fx")


if __name__ == "__main__":
    root = tk.Tk()
    Breakout(root)
    root.mainloop()
