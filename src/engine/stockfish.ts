let engine: Worker;

export function initStockfish(): void {
  engine = new Worker('https://cdn.jsdelivr.net/npm/stockfish/stockfish.js');

  engine.onmessage = (event) => {
    const message = event.data;
    console.log("Stockfish:", message);

    if (message.startsWith("bestmove")) {
      const move = message.split(" ")[1];
      handleEngineMove(move);
    }
  };

  engine.postMessage("uci");
}

export function sendPosition(fen: string) {
  engine.postMessage(`position fen ${fen}`);
  engine.postMessage("go depth 15");
}

function handleEngineMove(move: string) {
  // Update the board or emit to your Vue component
  console.log("Engine recommends:", move);
}
