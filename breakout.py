import tkinter as tk
import random

WIDTH, HEIGHT = 600, 500
PADDLE_W, PADDLE_H = 90, 12
BALL_R = 8
ROWS, COLS = 6, 10
BRICK_W = WIDTH // COLS
BRICK_H = 22
COLORS = ["#e74c3c", "#e67e22", "#f1c40f", "#2ecc71", "#3498db", "#9b59b6"]


class Breakout:
    def __init__(self, root):
        self.root = root
        root.title("블럭깨기")
        root.resizable(False, False)
        self.canvas = tk.Canvas(root, width=WIDTH, height=HEIGHT, bg="black")
        self.canvas.pack()

        self.left = self.right = False
        root.bind("<KeyPress-Left>", lambda e: setattr(self, "left", True))
        root.bind("<KeyRelease-Left>", lambda e: setattr(self, "left", False))
        root.bind("<KeyPress-Right>", lambda e: setattr(self, "right", True))
        root.bind("<KeyRelease-Right>", lambda e: setattr(self, "right", False))
        root.bind("<Motion>", self.mouse_move)
        root.bind("<space>", self.on_space)
        root.bind("r", lambda e: self.reset())

        self.reset()
        self.loop()

    def reset(self):
        self.canvas.delete("all")
        self.score = 0
        self.lives = 3
        self.level = 1
        self.state = "ready"  # ready, playing, over, won
        self.speed = 5
        self.build_bricks()
        self.paddle = self.canvas.create_rectangle(
            0, 0, PADDLE_W, PADDLE_H, fill="white", outline="")
        self.canvas.move(self.paddle, (WIDTH - PADDLE_W) / 2, HEIGHT - 40)
        self.ball = self.canvas.create_oval(
            0, 0, BALL_R * 2, BALL_R * 2, fill="#ffdd57", outline="")
        self.hud = self.canvas.create_text(
            8, 6, anchor="nw", fill="white", font=("Arial", 12))
        self.msg = self.canvas.create_text(
            WIDTH / 2, HEIGHT / 2 + 40, fill="white", font=("Arial", 16, "bold"))
        self.place_ball()
        self.update_hud()

    def build_bricks(self):
        self.bricks = {}
        top = 40
        for r in range(ROWS):
            for c in range(COLS):
                x = c * BRICK_W
                y = top + r * BRICK_H
                item = self.canvas.create_rectangle(
                    x + 1, y + 1, x + BRICK_W - 1, y + BRICK_H - 1,
                    fill=COLORS[r % len(COLORS)], outline="")
                self.bricks[item] = 10 * (ROWS - r)

    def place_ball(self):
        px1, py1, px2, _ = self.canvas.coords(self.paddle)
        cx = (px1 + px2) / 2
        self.canvas.coords(self.ball, cx - BALL_R, py1 - BALL_R * 2,
                           cx + BALL_R, py1)
        self.dx = random.choice([-1, 1]) * self.speed * 0.7
        self.dy = -self.speed
        self.canvas.itemconfig(self.msg, text="스페이스바: 시작 / 방향키·마우스: 이동")

    def update_hud(self):
        self.canvas.itemconfig(
            self.hud, text=f"점수: {self.score}   목숨: {self.lives}   레벨: {self.level}")

    def mouse_move(self, e):
        if self.state in ("ready", "playing"):
            self.set_paddle_x(e.x - PADDLE_W / 2)

    def set_paddle_x(self, x):
        x = max(0, min(WIDTH - PADDLE_W, x))
        y = self.canvas.coords(self.paddle)[1]
        self.canvas.coords(self.paddle, x, y, x + PADDLE_W, y + PADDLE_H)

    def on_space(self, e):
        if self.state == "ready":
            self.state = "playing"
            self.canvas.itemconfig(self.msg, text="")
        elif self.state in ("over", "won"):
            self.reset()

    def loop(self):
        if self.state in ("ready", "playing"):
            step = 8
            px = self.canvas.coords(self.paddle)[0]
            if self.left:
                self.set_paddle_x(px - step)
            if self.right:
                self.set_paddle_x(px + step)
        if self.state == "ready":
            self.place_ball_on_paddle()
        elif self.state == "playing":
            self.step()
        self.root.after(16, self.loop)

    def place_ball_on_paddle(self):
        px1, py1, px2, _ = self.canvas.coords(self.paddle)
        cx = (px1 + px2) / 2
        self.canvas.coords(self.ball, cx - BALL_R, py1 - BALL_R * 2,
                           cx + BALL_R, py1)

    def step(self):
        self.canvas.move(self.ball, self.dx, self.dy)
        x1, y1, x2, y2 = self.canvas.coords(self.ball)

        # 벽 충돌
        if x1 <= 0:
            self.dx = abs(self.dx)
        elif x2 >= WIDTH:
            self.dx = -abs(self.dx)
        if y1 <= 0:
            self.dy = abs(self.dy)

        # 바닥
        if y1 >= HEIGHT:
            self.lives -= 1
            self.update_hud()
            if self.lives <= 0:
                self.state = "over"
                self.canvas.itemconfig(
                    self.msg, text=f"게임 오버! 점수 {self.score}\n스페이스바: 다시 시작")
            else:
                self.state = "ready"
                self.place_ball()
            return

        # 패들 충돌
        px1, py1, px2, py2 = self.canvas.coords(self.paddle)
        if self.dy > 0 and x2 >= px1 and x1 <= px2 and y2 >= py1 and y2 <= py2 + 6:
            offset = ((x1 + x2) / 2 - (px1 + px2) / 2) / (PADDLE_W / 2)
            offset = max(-1, min(1, offset))
            self.dx = offset * self.speed * 1.2
            self.dy = -abs(self.dy)
            self.canvas.move(self.ball, 0, py1 - y2)

        # 벽돌 충돌
        overlapping = self.canvas.find_overlapping(x1, y1, x2, y2)
        hit = [i for i in overlapping if i in self.bricks]
        if hit:
            brick = hit[0]
            bx1, by1, bx2, by2 = self.canvas.coords(brick)
            cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
            # 옆면에 맞았는지 위/아래에 맞았는지 판단
            if bx1 <= cx <= bx2:
                self.dy = -self.dy
            else:
                self.dx = -self.dx
            self.score += self.bricks.pop(brick)
            self.canvas.delete(brick)
            self.update_hud()
            if not self.bricks:
                self.next_level()

    def next_level(self):
        self.level += 1
        self.speed = min(self.speed + 1, 10)
        self.build_bricks()
        self.state = "ready"
        self.place_ball()
        self.update_hud()


if __name__ == "__main__":
    root = tk.Tk()
    Breakout(root)
    root.mainloop()
