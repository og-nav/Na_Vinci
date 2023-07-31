import { Chess, Color, PieceSymbol, Square } from './chess';
const Na_Vinci = require('./Na_Vinci');
///////////////////////
// TESTING
///////////////////////

const NaVinci = new Na_Vinci();

function mateTests() {
  // MATE IN X TESTS
  //const chess = new Chess('8/8/8/8/8/2R5/8/k1K5 w - - 0 2'); // [ 'Ra3#' ]
  //const chess = new Chess('2k1rb1r/Rbq4p/3p4/1P6/1PNP1p2/2PQn2P/4BpPB/5R1K b - - 2 25'); // [ 'Bxg2#' ]
  //const chess = new Chess('8/8/2R5/8/8/1K6/8/1k6 w - - 0 1') // [ 'Rc7', 'Ka1', 'Rc1#' ]
  //const chess = new Chess('1kr4r/p2P1p2/1p6/4P3/8/3R2P1/PQ2nqBP/1R5K b - - 0 33') // [ 'Rxh2+', 'Kxh2', 'Rh8#' ]
  //const chess = new Chess('8/8/8/3K4/6QB/8/8/5k2 w - - 0 1'); // [ 'Qg7', 'Ke2', 'Qd4', 'Kf3', 'Qe4#' ]
  const chess = new Chess('3b4/8/7p/5K1k/8/6p1/6P1/2R5 w - - 0 1'); // mate in 3 // [ 'Rh1+', 'Bh4', 'Rh2', 'gxh2', 'g4#' ]
  //const chess = new Chess('4r3/p1Q4p/2p2Bpk/2P2b2/P7/1B3P2/2P2PKP/4q3 b - - 0 26'); //[ 'Qf1+', 'Kxf1', 'Bh3+', 'Kg1', 'Re1#' ]
  //const chess = new Chess('r6k/p1p3pn/b1p3Q1/6q1/2P5/P7/1BP3PP/5RK1 w - - 1 20') // [ 'Bxg7+', 'Kg8', 'Qf7#' ]
  //const chess = new Chess('2k5/5R2/1p1Kp3/3p4/3N4/2Pb4/P5r1/5q2 w - - 0 45') // [ 'Rc7+', 'Kd8', 'Nxe6+', 'Ke8', 'Re7#' ]
  //const chess = new Chess('1R1b2k1/p1r1qp1p/b3p1pB/3pP1N1/5QP1/2p5/5P1P/6K1 w - - 2 31') // mate in 3
  //const chess = new Chess('r5rk/5p1p/5R2/4B3/8/8/7P/7K w'); // mate in 3 // first move ra6+
  //const chess = new Chess('k1b2b2/1p2p1p1/pP2P3/Pq3PP1/8/6Q1/6BK/8 w - - 0 1') // mate in 5

  //console.log(chess.ascii());
  while (!chess.isGameOver()) {
    const res = NaVinci.getBestMove(chess.fen(), 5);
    const move = res.move;
    const score = res.score;

    if (move === null) {
      //move = getSortedMoves(chess)[0];
      console.log('null');
      break;
    }

    chess.move(move);
    console.log({ 'move:': move, 'score': score });
  }
  console.log(chess.history());
  //console.log(Object.keys(transpositionTable).length);
}

function positionalTests() {
  // POSITIONAL TESTS
  //const chess = new Chess(); // start position
  //const chess = new Chess('8/8/3k4/8/8/4K3/8/Q6R w - - 0 1'); // q + r vs k
  //const chess = new Chess('8/8/3k4/8/8/4K3/8/4Q3 w - - 0 1'); // q vs k // white
  //const chess = new Chess('8/8/3K4/8/8/4k3/8/4q3 b - - 0 1'); // q vs k // black
  //const chess = new Chess('8/8/3k4/8/8/4K3/8/4R3 w - - 0 1'); // r vs k
  //const chess = new Chess('8/2k5/8/8/2PK4/8/8/8 w - - 0 1'); // p + k, requires offensive opposition, cant win this yet
  //const chess = new Chess('8/8/8/4p3/4k3/8/8/4K3 w - - 0 1'); // k vs p, requires defensive opposition
  const chess = new Chess('k7/2K5/8/1P6/8/8/8/8 w - - 0 1'); // p v k, p on b6, k on c7 // k on a8
  //const chess = new Chess('8/8/K7/8/8/5p2/6k1/Q7 w - - 0 1'); // king queen vs pawn king // cant win

  while (!chess.isGameOver()) {
    const res = NaVinci.getBestMove(chess.fen(), 7);
    const move = res.move;
    const score = res.score;
    if (move === null) {
      console.log('null');
      break;
    }

    chess.move(move);
    console.log({ 'move:': move, 'score': score });
  }
  console.log(chess.pgn());
}

function evaluationTests() {}

//mateTests();
positionalTests();
//evaluationTests();

// graveyard
/*function passedPawn() {
		//const chess = new Chess()
		//const chess = new Chess('8/8/8/pPk5/P7/2K5/8/8 w - - 0 1'); // 1
		//const chess = new Chess('8/2kP4/2P5/6K1/8/7p/8/8 w - - 0 1') // 2
		//const chess = new Chess('8/8/p6p/4k1p1/1P2p1P1/P3K2P/8/8 w - - 0 1') // 0
		//const chess = new Chess('6k1/pp3p2/2p5/8/8/2P5/PP5P/6K1 w - - 0 1')
		//const chess = new Chess('8/p7/1p3kp1/1P6/5PKP/8/8/8 b - - 0 1') // 0
		const chess = new Chess('8/pK6/7p/8/7P/8/6P1/2k5 b - - 0 1') // 0 for white, 1 for black

		const board: ({
			square: Square;
			type: PieceSymbol;
			color: Color;
		} | null)[][] = chess.board();
		const turn = chess.turn();
		let passedPawnScore = 0;

		for (let i = 0; i < 8; i++) {
			for (let j = 0; j < 8; j++) {
				const piece = board[i][j];
				if (piece) {
					const color = piece.color;
					const pieceType = piece.type;

					if (pieceType === 'p' && color === turn) {
						if (turn === 'w') {
							// getting left and right columns, clamping to side of the board

							const lcol = Math.max(j - 1, 0);
							const rcol = Math.min(j + 1, 7);

							const height = i - 1;
							let passed = true;
							// passed pawn
							for (let k = height; k > 0; k--) {
								for (let l = lcol; l <= rcol; l++) {
									if (
										board[k][l] &&
										board[k][l]!.type === 'p'
									) {
										// enemy pawn found within search square
										passed = false;
										break;
									}
								}
							}
							if (passed) {
								passedPawnScore += 1;
							}
						}

						if (turn === 'b') {
							const lcol = Math.max(j - 1, 0);
							const rcol = Math.min(j + 1, 7);

							const height = 8 - i;
							let passed = true;
							// passed pawn
							for (let k = i; k < height; k++) {
								for (let l = lcol; l <= rcol; l++) {
									if (
										board[k][l] &&
										board[k][l]!.type === 'p' &&
										board[k][l]!.color !== turn
									) {
										// enemy pawn found within search square
										passed = false;
										break;
									}
								}
							}
							if (passed) {
								passedPawnScore += 1;
							}
						}
					}
				}
			}
		}
		return passedPawnScore;
	}

	console.log(passedPawn());
	//return passedPawn();
	*/
