const BLACK = 1;
const WHITE = 2;
const EMPTY = 0;
const BOARD_SIZE = 8;
const DIRECTIONS = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
];

function getIndex(x, y) {
    return y * BOARD_SIZE + x;
}

function createInitialBoard() {
    const board = Array(BOARD_SIZE * BOARD_SIZE).fill(EMPTY);
    board[getIndex(3, 3)] = WHITE;
    board[getIndex(3, 4)] = BLACK;
    board[getIndex(4, 3)] = BLACK;
    board[getIndex(4, 4)] = WHITE;
    return board;
}

function createGameState() {
    return {
        board: createInitialBoard(),
        turn: BLACK,
        gameOver: false,
        winner: null,
        passCount: 0
    };
}

function opponent(color) {
    return color === BLACK ? WHITE : BLACK;
}

function isInsideBoard(x, y) {
    return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

function countStones(state) {
    let blackCount = 0;
    let whiteCount = 0;
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            if (state.board[getIndex(x, y)] === BLACK) {
                blackCount++;
            } else if (state.board[getIndex(x, y)] === WHITE) {
                whiteCount++;
            }
        }
    }
    return { blackCount, whiteCount };
}

function findFlippableStones(state, x, y, color) {
    if (!isInsideBoard(x, y) || state.board[getIndex(x, y)] !== EMPTY) {
        return [];
    }
    const flips = [];
    for (const [dx, dy] of DIRECTIONS) {
        let nx = x + dx;
        let ny = y + dy;
        const line = [];
        while (isInsideBoard(nx, ny)) {
            const cell = state.board[getIndex(nx, ny)];
            if (cell === EMPTY) {
                line.length = 0;
                break;
            }
            if (cell === color) {
                break;
            }
            line.push([nx, ny]);
            nx += dx;
            ny += dy;
        }
        if (!isInsideBoard(nx, ny) || state.board[getIndex(nx, ny)] !== color) {
            continue;
        }
        flips.push(...line);
    }
    return flips;
}

function isPuttable(state, x, y, color = state.turn) {
    return findFlippableStones(state, x, y, color).length > 0;
}

function getPuttableMoves(state, color = state.turn) {
    const moves = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            if (isPuttable(state, x, y, color)) {
                moves.push({ x, y });
            }
        }
    }
    return moves;
}

function updateGameOver(state) {
    const { blackCount, whiteCount } = countStones(state);
    const isBoardFull = blackCount + whiteCount === BOARD_SIZE * BOARD_SIZE;
    if (isBoardFull || blackCount === 0 || whiteCount === 0 || state.passCount >= 2) {
        state.gameOver = true;
        if (blackCount > whiteCount) {
            state.winner = BLACK;
        } else if (whiteCount > blackCount) {
            state.winner = WHITE;
        } else {
            state.winner = null;
        }
    }
}

function advanceTurn(state) {
    if (state.gameOver) {
        return;
    }
    const currentMoves = getPuttableMoves(state, state.turn);
    console.log("current :",currentMoves);
    if (currentMoves.length > 0) {
        state.passCount = 0;
        return;
    }

    state.turn = opponent(state.turn);
    state.passCount += 1;

    const opponentMoves = getPuttableMoves(state, state.turn);
    console.log("opponent :",opponentMoves);
    if (opponentMoves.length > 0) {
        return;
    }

    state.passCount += 1;
    updateGameOver(state);
}

function applyMove(state, x, y) {
    if (state.gameOver) {
        return false;
    }
    const flips = findFlippableStones(state, x, y, state.turn);
    if (flips.length === 0) {
        return false;
    }
    state.board[getIndex(x, y)] = state.turn;
    for (const [fx, fy] of flips) {
        state.board[getIndex(fx, fy)] = state.turn;
    }
    state.turn = opponent(state.turn);
    state.passCount = 0;
    updateGameOver(state);
    advanceTurn(state);
    updateGameOver(state);
    return true;
}

function resetGame(state) {
    const next = createGameState();
    state.board = next.board;
    state.turn = next.turn;
    state.gameOver = next.gameOver;
    state.winner = next.winner;
    state.passCount = next.passCount;
}

function colorLabel(color) {
    return color === BLACK ? "Black" : "White";
}

function winnerLabel(state) {
    if (state.winner === BLACK) {
        return "Black";
    }
    if (state.winner === WHITE) {
        return "White";
    }
    return "Draw";
}

function createBrowserApp() {
    const CANVAS_SIZE = 400;
    const blackScore = document.getElementById("black-score");
    const whiteScore = document.getElementById("white-score");
    const boardRoot = document.getElementById("game-board");
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    boardRoot.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    const state = createGameState();

    function drawStone(x, y, color) {
        const cellSize = CANVAS_SIZE / BOARD_SIZE;
        const centerX = x * cellSize + cellSize / 2;
        const centerY = y * cellSize + cellSize / 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, cellSize / 2 - 5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    }

    function drawBoard() {
        ctx.fillStyle = "#008000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i <= BOARD_SIZE; i++) {
            ctx.beginPath();
            ctx.moveTo(i * (CANVAS_SIZE / BOARD_SIZE), 0);
            ctx.lineTo(i * (CANVAS_SIZE / BOARD_SIZE), CANVAS_SIZE);
            ctx.strokeStyle = "#000000";
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, i * (CANVAS_SIZE / BOARD_SIZE));
            ctx.lineTo(CANVAS_SIZE, i * (CANVAS_SIZE / BOARD_SIZE));
            ctx.strokeStyle = "#000000";
            ctx.stroke();
        }
        for (let y = 0; y < BOARD_SIZE; y++) {
            for (let x = 0; x < BOARD_SIZE; x++) {
                if (state.board[getIndex(x, y)] === BLACK) {
                    drawStone(x, y, "black");
                } else if (state.board[getIndex(x, y)] === WHITE) {
                    drawStone(x, y, "white");
                }
            }
        }
    }

    function drawPuttable() {
        const puttable = getPuttableMoves(state);
        const cellSize = CANVAS_SIZE / BOARD_SIZE;
        for (const move of puttable) {
            const centerX = move.x * cellSize + cellSize / 2;
            const centerY = move.y * cellSize + cellSize / 2;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
            ctx.fillStyle = "yellow";
            ctx.fill();
        }
    }

    function drawScores() {
        const { blackCount, whiteCount } = countStones(state);
        blackScore.textContent = `${blackCount}`;
        whiteScore.textContent = `${whiteCount}`;
    }

    function render() {
        drawBoard();
        drawPuttable();
        drawScores();
    }

    function handleEndIfNeeded() {
        if (!state.gameOver) {
            return;
        }
        const { blackCount, whiteCount } = countStones(state);
        alert(`Game Over! Winner: ${winnerLabel(state)} (Black: ${blackCount}, White: ${whiteCount})`);
    }

    function tryMove(x, y) {
        const moved = applyMove(state, x, y);
        if (!moved) {
            return;
        }
        render();
        handleEndIfNeeded();
    }

    canvas.addEventListener("click", (event) => {
        if (state.gameOver) {
            return;
        }
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor((event.clientX - rect.left) / (CANVAS_SIZE / BOARD_SIZE));
        const y = Math.floor((event.clientY - rect.top) / (CANVAS_SIZE / BOARD_SIZE));
        tryMove(x, y);
    });

    function reset() {
        resetGame(state);
        render();
    }

    render();

    return {
        reset,
        state
    };
}

function formatBoardForCli(state) {
    const puttableSet = new Set(getPuttableMoves(state).map((m) => `${m.x},${m.y}`));
    const rows = [];
    rows.push("  0 1 2 3 4 5 6 7");
    for (let y = 0; y < BOARD_SIZE; y++) {
        let line = `${y} `;
        for (let x = 0; x < BOARD_SIZE; x++) {
            if (state.board[getIndex(x, y)] === BLACK) {
                line += "B";
            } else if (state.board[getIndex(x, y)] === WHITE) {
                line += "W";
            } else if (puttableSet.has(`${x},${y}`)) {
                line += "*";
            } else {
                line += ".";
            }
            line += " ";
        }
        rows.push(line.trimEnd());
    }
    return rows.join("\n");
}

function runCli() {
    const readline = require("readline");
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    const state = createGameState();

    function renderCli() {
        const { blackCount, whiteCount } = countStones(state);
        console.clear();
        console.log("=== Othello CUI ===");
        console.log(formatBoardForCli(state));
        console.log(`Turn: ${colorLabel(state.turn)}`);
        console.log(`Score => Black: ${blackCount}, White: ${whiteCount}`);
        console.log("Input format: x y (example: 2 3), or q to quit");
    }

    function finishCli() {
        const { blackCount, whiteCount } = countStones(state);
        console.log(`Game Over! Winner: ${winnerLabel(state)} (Black: ${blackCount}, White: ${whiteCount})`);
        rl.close();
    }

    function askMove() {
        if (state.gameOver) {
            finishCli();
            return;
        }
        renderCli();
        rl.question("> ", (input) => {
            const trimmed = input.trim();
            if (trimmed.toLowerCase() === "q") {
                rl.close();
                return;
            }

            const parts = trimmed.split(/\s+/);
            if (parts.length !== 2) {
                console.log("Invalid input. Please use: x y");
                setTimeout(askMove, 600);
                return;
            }

            const x = Number(parts[0]);
            const y = Number(parts[1]);
            if (!Number.isInteger(x) || !Number.isInteger(y) || !isInsideBoard(x, y)) {
                console.log("Coordinates must be integers between 0 and 7.");
                setTimeout(askMove, 600);
                return;
            }

            const moved = applyMove(state, x, y);
            if (!moved) {
                console.log("You cannot put a stone there.");
                setTimeout(askMove, 600);
                return;
            }

            askMove();
        });
    }

    askMove();
}

if (typeof document !== "undefined") {
    const app = createBrowserApp();
    window.reset = () => app.reset();
}

if (typeof process !== "undefined" && process.versions && process.versions.node && typeof window === "undefined") {
    runCli();
}


