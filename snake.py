import tkinter as tk
import random
from collections import deque

CELL = 20
COLS = 30
ROWS = 20
DELAY = 110  # ms
FOOD_COUNT = 3
DIRS = [(0, -1), (0, 1), (-1, 0), (1, 0)]


class Snake:
    def __init__(self, body, direction, head_color, body_color, name):
        self.body = body
        self.direction = direction
        self.next_direction = direction
        self.head_color = head_color
        self.body_color = body_color
        self.name = name
        self.score = 0
        self.alive = True


class SnakeGame:
    def __init__(self, root):
        self.root = root
        root.title("뱀 게임 - 사람 vs AI")
        root.resizable(False, False)
        self.label = tk.Label(root, text="", font=("Malgun Gothic", 12))
        self.label.pack()
        self.canvas = tk.Canvas(root, width=COLS * CELL, height=ROWS * CELL, bg="black")
        self.canvas.pack()
        root.bind("<Key>", self.on_key)
        self.reset()

    def reset(self):
        cy = ROWS // 4
        self.human = Snake([(5, ROWS - 1 - cy), (4, ROWS - 1 - cy), (3, ROWS - 1 - cy)], (1, 0),
                           "#4cff4c", "#2ea02e", "사람")
        self.ai = Snake([(COLS - 6, cy), (COLS - 5, cy), (COLS - 4, cy)], (-1, 0),
                        "#ff9f4c", "#c46a1a", "AI")
        self.snakes = [self.human, self.ai]
        self.foods = []
        for _ in range(FOOD_COUNT):
            self.place_food()
        self.game_over = False
        self.paused = False
        self.result = ""
        self.tick()

    def occupied(self):
        return {c for s in self.snakes for c in s.body}

    def place_food(self):
        taken = self.occupied() | set(self.foods)
        free = [(x, y) for x in range(COLS) for y in range(ROWS) if (x, y) not in taken]
        if free:
            self.foods.append(random.choice(free))

    def on_key(self, event):
        keys = {
            "Up": (0, -1), "Down": (0, 1), "Left": (-1, 0), "Right": (1, 0),
            "w": (0, -1), "s": (0, 1), "a": (-1, 0), "d": (1, 0),
        }
        if event.keysym in keys:
            d = keys[event.keysym]
            cur = self.human.direction
            if (d[0] + cur[0], d[1] + cur[1]) != (0, 0):
                self.human.next_direction = d
        elif event.keysym in ("space", "p"):
            self.paused = not self.paused
        elif event.keysym in ("r", "R") and self.game_over:
            self.reset()

    # ---------- AI ----------
    def ai_decide(self):
        snake = self.ai
        blocked = set()
        for s in self.snakes:
            blocked.update(s.body[:-1])  # 꼬리는 곧 움직이므로 제외
        # 사람 머리가 다음에 갈 수 있는 칸은 위험하므로 피한다
        hx, hy = self.human.body[0]
        danger = {(hx + dx, hy + dy) for dx, dy in DIRS}

        head = snake.body[0]
        options = []
        for d in DIRS:
            if (d[0] + snake.direction[0], d[1] + snake.direction[1]) == (0, 0):
                continue
            n = (head[0] + d[0], head[1] + d[1])
            if 0 <= n[0] < COLS and 0 <= n[1] < ROWS and n not in blocked:
                options.append((d, n))
        if not options:
            return snake.direction

        safe = [o for o in options if o[1] not in danger] or options

        def area(start, extra_block):
            seen = {start}
            q = deque([start])
            while q:
                x, y = q.popleft()
                for dx, dy in DIRS:
                    n = (x + dx, y + dy)
                    if (0 <= n[0] < COLS and 0 <= n[1] < ROWS and n not in seen
                            and n not in blocked and n not in extra_block):
                        seen.add(n)
                        q.append(n)
            return len(seen)

        # 가장 가까운 사과로 BFS
        goals = set(self.foods)
        best_first = None
        if goals:
            prev = {head: None}
            q = deque([head])
            found = None
            while q and found is None:
                cur = q.popleft()
                for d in DIRS:
                    n = (cur[0] + d[0], cur[1] + d[1])
                    if (0 <= n[0] < COLS and 0 <= n[1] < ROWS and n not in prev
                            and n not in blocked):
                        prev[n] = cur
                        if n in goals:
                            found = n
                            break
                        q.append(n)
            if found:
                step = found
                while prev[step] != head:
                    step = prev[step]
                best_first = step

        need = len(snake.body)
        if best_first is not None:
            for d, n in safe:
                if n == best_first and area(n, set()) >= need:
                    return d
        # 사과로 갈 수 없거나 위험하면 가장 넓은 공간 쪽으로
        return max(safe, key=lambda o: area(o[1], set()))[0]

    # ---------- 진행 ----------
    def tick(self):
        if self.game_over:
            return
        if not self.paused:
            self.step()
        self.draw()
        if not self.game_over:
            self.root.after(DELAY, self.tick)

    def step(self):
        self.ai.next_direction = self.ai_decide()
        info = []
        for s in self.snakes:
            s.direction = s.next_direction
            head = (s.body[0][0] + s.direction[0], s.body[0][1] + s.direction[1])
            eat = head in self.foods
            info.append((head, eat))

        bodies_after = [s.body if info[i][1] else s.body[:-1] for i, s in enumerate(self.snakes)]
        for i, s in enumerate(self.snakes):
            head = info[i][0]
            other = 1 - i
            if (not (0 <= head[0] < COLS and 0 <= head[1] < ROWS)
                    or head in bodies_after[i]
                    or head in bodies_after[other]
                    or head == info[other][0]):
                s.alive = False

        for i, s in enumerate(self.snakes):
            if not s.alive:
                continue
            head, eat = info[i]
            s.body.insert(0, head)
            if eat:
                s.score += 10
                self.foods.remove(head)
            else:
                s.body.pop()
        while len(self.foods) < FOOD_COUNT:
            n = len(self.foods)
            self.place_food()
            if len(self.foods) == n:
                break

        if not (self.human.alive and self.ai.alive):
            self.game_over = True
            if self.human.alive:
                self.result = "사람 승리!"
            elif self.ai.alive:
                self.result = "AI 승리!"
            elif self.human.score != self.ai.score:
                self.result = "사람 승리! (동시 충돌, 점수 우위)" if self.human.score > self.ai.score \
                    else "AI 승리! (동시 충돌, 점수 우위)"
            else:
                self.result = "무승부!"

    def draw(self):
        c = self.canvas
        c.delete("all")
        for s in self.snakes:
            for i, (x, y) in enumerate(s.body):
                color = s.head_color if i == 0 else s.body_color
                c.create_rectangle(x * CELL + 1, y * CELL + 1, (x + 1) * CELL - 1, (y + 1) * CELL - 1,
                                   fill=color, outline="")
        for fx, fy in self.foods:
            c.create_oval(fx * CELL + 2, fy * CELL + 2, (fx + 1) * CELL - 2, (fy + 1) * CELL - 2,
                          fill="red", outline="")
        self.label.config(text=f"사람(초록): {self.human.score}   AI(주황): {self.ai.score}   "
                               f"(방향키/WASD 이동, Space 일시정지)")
        cx, cy = COLS * CELL // 2, ROWS * CELL // 2
        if self.game_over:
            c.create_text(cx, cy,
                          text=f"게임 오버\n{self.result}\n사람 {self.human.score} : {self.ai.score} AI\nR 키로 다시 시작",
                          fill="white", font=("Malgun Gothic", 20, "bold"), justify="center")
        elif self.paused:
            c.create_text(cx, cy, text="일시정지", fill="yellow", font=("Malgun Gothic", 24, "bold"))


if __name__ == "__main__":
    root = tk.Tk()
    SnakeGame(root)
    root.mainloop()
