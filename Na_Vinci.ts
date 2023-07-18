import { Chess, Color, Move, PieceSymbol, Square } from './chess';

////////////////////
// TYPE DEFINITIONS
////////////////////
interface EvaluationResult {
	score: number;
	move: Move['lan'] | null;
	depth: number;
	flag: 'exact' | 'upperbound' | 'lowerbound';
}

interface TranspositionTableProps {
	[key: string]: EvaluationResult;
}

interface NegamaxProps {
	depth: number;
	alpha: number;
	beta: number;
}

///////////////////////////////
// GLOBAL VARIABLES / CONSTANTS
///////////////////////////////
// chess object
const chess = new Chess();

// caches positions with their evaluation result to save time
const transpositionTable: TranspositionTableProps = {};

// time limit per move in seconds; no limit if 0
let timeLimit = 5;
let startTime = 0;

const searchDepth = 3;

/////////////////////////////
// UTIL FUNCTIONS / CONSTANTS
/////////////////////////////
/*
 * Piece Square Tables and piece weights taken from Sunfish.py
 * https://github.com/thomasahle/sunfish/blob/master/sunfish.py
 */
const pw = { p: 100, n: 280, b: 320, r: 479, q: 929, k: 20000 }; //piece weights
const pstw = {
	// piece square table for white
	p: [
		[0, 0, 0, 0, 0, 0, 0, 0],
		[78, 83, 86, 73, 102, 82, 85, 90],
		[7, 29, 21, 44, 40, 31, 44, 7],
		[-17, 16, -2, 15, 14, 0, 15, -13],
		[-26, 3, 10, 9, 6, 1, 0, -23],
		[-22, 9, 5, -11, -10, -2, 3, -19],
		[-31, 8, -7, -37, -36, -14, 3, -31],
		[0, 0, 0, 0, 0, 0, 0, 0],
	],
	n: [
		[-66, -53, -75, -75, -10, -55, -58, -70],
		[-3, -6, 100, -36, 4, 62, -4, -14],
		[10, 67, 1, 74, 73, 27, 62, -2],
		[24, 24, 45, 37, 33, 41, 25, 17],
		[-1, 5, 31, 21, 22, 35, 2, 0],
		[-18, 10, 13, 22, 18, 15, 11, -14],
		[-23, -15, 2, 0, 2, 0, -23, -20],
		[-74, -23, -26, -24, -19, -35, -22, -69],
	],
	b: [
		[-59, -78, -82, -76, -23, -107, -37, -50],
		[-11, 20, 35, -42, -39, 31, 2, -22],
		[-9, 39, -32, 41, 52, -10, 28, -14],
		[25, 17, 20, 34, 26, 25, 15, 10],
		[13, 10, 17, 23, 17, 16, 0, 7],
		[14, 25, 24, 15, 8, 25, 20, 15],
		[19, 20, 11, 6, 7, 6, 20, 16],
		[-7, 2, -15, -12, -14, -15, -10, -10],
	],
	r: [
		[35, 29, 33, 4, 37, 33, 56, 50],
		[55, 29, 56, 67, 55, 62, 34, 60],
		[19, 35, 28, 33, 45, 27, 25, 15],
		[0, 5, 16, 13, 18, -4, -9, -6],
		[-28, -35, -16, -21, -13, -29, -46, -30],
		[-42, -28, -42, -25, -25, -35, -26, -46],
		[-53, -38, -31, -26, -29, -43, -44, -53],
		[-30, -24, -18, 5, -2, -18, -31, -32],
	],
	q: [
		[6, 1, -8, -104, 69, 24, 88, 26],
		[14, 32, 60, -10, 20, 76, 57, 24],
		[-2, 43, 32, 60, 72, 63, 43, 2],
		[1, -16, 22, 17, 25, 20, -13, -6],
		[-14, -15, -2, -5, -1, -10, -20, -22],
		[-30, -6, -13, -11, -16, -11, -16, -27],
		[-36, -18, 0, -19, -15, -15, -21, -38],
		[-39, -30, -31, -13, -31, -36, -34, -42],
	],
	k: [
		[4, 54, 47, -99, -99, 60, 83, -62],
		[-32, 10, 55, 56, 56, 55, 10, 3],
		[-62, 12, -57, 44, -67, 28, 37, -31],
		[-55, 50, 11, -4, -19, 13, 0, -49],
		[-55, -43, -52, -28, -51, -47, -8, -50],
		[-47, -42, -43, -79, -64, -32, -29, -32],
		[-4, 3, -14, -50, -57, -18, 13, 4],
		[17, 30, -3, -14, 6, -1, 40, 18],
	],

	// Endgame Position Weights
	pe: [
		[0, 0, 0, 0, 0, 0, 0, 0],
		[100, 100, 100, 100, 100, 100, 100, 100],
		[20, 20, 30, 50, 50, 30, 20, 20],
		[5, 5, 10, 25, 25, 10, 5, 5],
		[5, 5, 5, 20, 20, 5, 5, 5],
		[5, -5, -10, 0, 0, -10, -5, 5],
		[5, 10, 10, -20, -20, 10, 10, 5],
		[0, 0, 0, 0, 0, 0, 0, 0],
	],
	ne: [
		[-66, -53, -75, -75, -10, -55, -58, -70],
		[-3, -6, 100, -36, 4, 62, -4, -14],
		[10, 67, 1, 74, 73, 27, 62, -2],
		[24, 24, 45, 37, 33, 41, 25, 17],
		[-1, 5, 31, 21, 22, 35, 2, 0],
		[-18, 10, 13, 22, 18, 15, 11, -14],
		[-23, -15, 2, 0, 2, 0, -23, -20],
		[-74, -23, -26, -24, -19, -35, -22, -69],
	],
	be: [
		[-59, -78, -82, -76, -23, -107, -37, -50],
		[-11, 20, 35, -42, -39, 31, 2, -22],
		[-9, 39, -32, 41, 52, -10, 28, -14],
		[25, 17, 20, 34, 26, 25, 15, 10],
		[13, 10, 17, 23, 17, 16, 0, 7],
		[14, 25, 24, 15, 8, 25, 20, 15],
		[19, 20, 11, 6, 7, 6, 20, 16],
		[-7, 2, -15, -12, -14, -15, -10, -10],
	],
	re: [
		[35, 29, 33, 4, 37, 33, 56, 50],
		[55, 29, 56, 67, 55, 62, 34, 60],
		[19, 35, 28, 33, 45, 27, 25, 15],
		[0, 5, 16, 13, 18, -4, -9, -6],
		[-28, -35, -16, -21, -13, -29, -46, -30],
		[-42, -28, -42, -25, -25, -35, -26, -46],
		[-53, -38, -31, -26, -29, -43, -44, -53],
		[-30, -24, -18, 5, -2, -18, -31, -32],
	],
	qe: [
		[6, 1, -8, -104, 69, 24, 88, 26],
		[14, 32, 60, -10, 20, 76, 57, 24],
		[-2, 43, 32, 60, 72, 63, 43, 2],
		[1, -16, 22, 17, 25, 20, -13, -6],
		[-14, -15, -2, -5, -1, -10, -20, -22],
		[-30, -6, -13, -11, -16, -11, -16, -27],
		[-36, -18, 0, -19, -15, -15, -21, -38],
		[-39, -30, -31, -13, -31, -36, -34, -42],
	],
	ke: [
		[-50, -40, -30, -20, -20, -30, -40, -50],
		[-30, -20, -10, 0, 0, -10, -20, -30],
		[-30, -10, 20, 30, 30, 20, -10, -30],
		[-30, -10, 30, 40, 40, 30, -10, -30],
		[-30, -10, 30, 40, 40, 30, -10, -30],
		[-30, -10, 20, 30, 30, 20, -10, -30],
		[-30, -30, 0, 0, 0, 0, -30, -30],
		[-50, -30, -30, -30, -30, -30, -30, -50],
	],
};

//piece square tables for black
const pstb = {
	p: pstw['p'].slice().reverse(),
	n: pstw['n'].slice().reverse(),
	b: pstw['b'].slice().reverse(),
	r: pstw['r'].slice().reverse(),
	q: pstw['q'].slice().reverse(),
	k: pstw['k'].slice().reverse(),
	pe: pstw['p'].slice().reverse(),
	ne: pstw['n'].slice().reverse(),
	be: pstw['b'].slice().reverse(),
	re: pstw['r'].slice().reverse(),
	qe: pstw['q'].slice().reverse(),
	ke: pstw['ke'].slice().reverse(),
};

//piece values for zobrist hash
const phv = {
	p: 0,
	n: 1,
	b: 2,
	r: 3,
	q: 4,
	k: 5,
};

/*
/////////////////////////////////
// ZOBRIST HASH FUNCTIONS / CLASS
/////////////////////////////////
class ZobristHash {
	private pieceKeys: Uint32Array[][]
}
*/
// since lichess returns all prior moves as an array,
function applyMoves(moves: Move['lan'][]) {
	moves.forEach((move) => chess.move(move));
}

// random 32 bit number for zobrist hash
function getRandomNumber() {
	return Math.floor(2 ** 31 * Math.random());
}

function getRandomMove() {
	const m = chess.moves();
	return m[Math.floor(m.length * Math.random())];
}

// returns all moves sorted by priority (doesn't filter though)
// typically "longer" moves will be more impactful on the game state so those are evaluated first
function getSortedMoves() {
	return chess
		.moves({ verbose: true })
		.sort((a, b) => b['san'].length - a['san'].length);
}

// only returns high-priority moves: captures (x), checks (+), checkmates (#), promotions (=)
function getQMoves() {
	return chess.moves().filter((move) => move.length > 3);
}

function getNonQMoves() {
	return chess.moves().filter((move) => move.length <= 3);
}

// right now only checks if 5 pieces per side are left on board
function isEndgame() {
	const board: ({
		square: Square;
		type: PieceSymbol;
		color: Color;
	} | null)[][] = chess.board();

	let whitePieces = 0;
	let blackPieces = 0;

	for (let i = 0; i < board.length; i++) {
		for (let j = 0; j < board[0].length; j++) {
			const piece = board[i][j];
			if (piece) {
				if (piece.color === 'w') {
					whitePieces += 1;
				} else {
					blackPieces += 1;
				}
			}
		}
	}
	return whitePieces <= 5 || blackPieces <= 5;
}

////////////////////////////////
// EVALUATION / SEARCH FUNCTIONS
////////////////////////////////

// evaluates irrespective of turn or position dynamics
// for example, a hanging queen won't be flagged by this - addressed in a quiescence search (q-search)
// other factors like king safety will be added in the future
function evaluateStatic() {
	if (chess.isGameOver()) {
		if (chess.isDraw() || chess.isThreefoldRepetition()) {
			return 0; // draw
		}
		// previous player caused this board state
		// so the 'negative' of this score will be their score
		// since it is currently the opponent's turn
		return -Infinity;
	}

	const turn = chess.turn();

	const board: ({
		square: Square;
		type: PieceSymbol;
		color: Color;
	} | null)[][] = chess.board();

	// evaluation criteria
	let materialScore = 0;
	let positionalScore = 0;
	let passedPawnScore = 0;
	let isolatedPawnScore = 0;

	for (let i = 0; i < board.length; i++) {
		for (let j = 0; j < board[0].length; j++) {
			const piece = board[i][j];
			if (piece) {
				const color = piece.color;
				const pieceType = piece.type;

				if (isEndgame()) {
					if (color === turn) {
						positionalScore +=
							turn === 'w'
								? pstw[(pieceType + 'e') as keyof typeof pstw][
										i
								  ][j]
								: pstb[(pieceType + 'e') as keyof typeof pstb][
										i
								  ][j];
						materialScore += pw[pieceType];
					} else {
						positionalScore -=
							turn === 'w'
								? pstw[(pieceType + 'e') as keyof typeof pstw][
										i
								  ][j]
								: pstb[(pieceType + 'e') as keyof typeof pstb][
										i
								  ][j];
						materialScore -= pw[pieceType];
					}
				} else {
					if (color === turn) {
						positionalScore +=
							turn === 'w'
								? pstw[pieceType][i][j]
								: pstb[pieceType][i][j];
						materialScore += pw[pieceType];
					} else {
						positionalScore -=
							turn === 'w'
								? pstw[pieceType][i][j]
								: pstb[pieceType][i][j];
						materialScore -= pw[pieceType];
					}
				}

				// passed and isolated pawn evaluation
				if (piece.type === 'p' && piece.color === turn) {
					// getting left and right columns, clamping to side of the board
					const lcol = Math.max(j, 0);
					const rcol = Math.min(j, 7);

					const height = i - 2;

					let passed = true;
					// passed pawn
					for (let k = i - 1; k > height; k--) {
						for (let l = lcol; l < rcol; l++) {
							if (board[k][l] && board[k][l]!.type === 'p') {
								// enemy pawn found within search square
								passed = false;
								break;
							}
						}
					}
					if (passed) {
						passedPawnScore += 30;
					}
					let isolated = true;
					for (let k = 1; k < 5; k++) {
						if (
							board[k][lcol] &&
							board[k][lcol]!.type === 'p' &&
							board[k][lcol]!.color === turn
						) {
							isolated = false;
						}
						if (
							board[k][rcol] &&
							board[k][rcol]!.type === 'p' &&
							board[k][rcol]!.color === turn
						) {
							isolated = false;
						}
					}
					if (isolated) {
						isolatedPawnScore -= 25;
					}
				}
			}
		}
	}

	let res =
		materialScore + positionalScore + passedPawnScore + isolatedPawnScore;
	return res / 100;
}

// quiescence search
// plays out all 'active' moves like captures, checks, promotions, etc until the position is 'quiet'
// imagine the search reaches depth after a queen captures a knight
// the engine sees this as gaining material so it will play it
// however, if the search had went one move deeper, it would have found that the queen could be easily recaptured
// so the quiescence search will continue through the active moves to make sure simple recaptures
// and the like are not missed
function quiesce({ alpha, beta }: { alpha: number; beta: number }) {
	const standPat = evaluateStatic(); // default lower bound evaluation
	if (standPat >= beta) {
		return beta;
	}
	if (alpha < standPat) {
		alpha = standPat;
	}

	let score = standPat;

	const qMoves = getQMoves();
	for (const move of qMoves) {
		chess.move(move);
		score = -quiesce({ alpha: -beta, beta: -alpha });
		chess.undo();

		if (score >= beta) {
			return beta;
		}
		if (score > alpha) {
			alpha = score;
		}
	}

	return score;
}

// negamax search function
// negamax is a variation of minimax but with the assumption the game is a zero-sum game
// so any benefit for one player comes at the expense of the other

function negamax({ depth, alpha, beta }: NegamaxProps): EvaluationResult {
	// current position
	const currFen = chess.fen();

	// check transposition table for current position
	if (currFen in transpositionTable) {
		const entry = transpositionTable[currFen];

		// checking if the cached depth is greater (by having a smaller number) than the current depth
		// while this doesn't necessarily affect the uniqueness of the move (since there is always only
		// one best move for each position regardless of the depth), this value could be useful in the future when
		// more optimizations are added
		if (entry.depth >= depth) {
			if (entry.flag === 'exact') {
				return entry;
			}
			// update cutoffs
			else if (entry.flag === 'lowerbound') {
				// alpha represents the best score so far for the maximizing player
				alpha = Math.max(alpha, entry.score);
			} else if (entry.flag === 'upperbound') {
				// beta represents the best score so far for the minimizing player
				beta = Math.min(beta, entry.score);
			}

			if (alpha >= beta) {
				return entry;
			}
		}

		//return entry;
	}

	// base cases / terminal nodes
	if (depth === 0 || chess.isGameOver()) {
		//let nodeScoreRegular = evaluateStatic();
		//let nodeScoreQ = quiesce({ alpha: alpha, beta: beta});
		let nodeScore = quiesce({ alpha: alpha, beta: beta });
		const entry: EvaluationResult = {
			score: nodeScore, //Math.max(nodeScoreRegular, nodeScoreQ),
			move: null,
			depth: depth,
			flag: 'exact',
		};

		// save evaluated position
		transpositionTable[currFen] = entry;
		return entry;
	}

	const sortedLegalMoves = getSortedMoves();
	let bestScore = -Infinity;
	let bestMove: Move['lan'] = sortedLegalMoves[0]['lan'];

	for (const move of sortedLegalMoves) {
		// make move
		chess.move(move);

		// DFS search and swapping alpha/beta
		let currScore = -negamax({
			depth: depth - 1,
			alpha: -beta,
			beta: -alpha,
		}).score;

		// unmake move
		chess.undo();

		// alpha represents the best score so far, so keep current value or update it
		alpha = Math.max(alpha, bestScore);

		if (currScore > bestScore) {
			bestScore = currScore;
			bestMove = move['lan'];
		}

		if (alpha >= beta) {
			// pruning
			break;
		}
	}

	const entry: EvaluationResult = {
		move: bestMove,
		score: bestScore,
		depth: depth,
		flag:
			bestScore < alpha
				? 'upperbound'
				: bestScore > beta
				? 'lowerbound'
				: 'exact',
	};

	transpositionTable[currFen] = entry;
	return entry;
}

/////////////////
// IMPLEMENTATION
/////////////////
class Na_Vinci {
	chess: Chess;

	constructor(
		fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
	) {
		this.chess = new Chess(fen);
	}

	getReply(_chat: string) {
		return 'LMFAO';
	}

	// for lichess bot
	getNextMove(moves: Move['lan'][], depth?: number) {
		chess.reset();
		applyMoves(moves);
		const res = negamax({
			depth: depth ? depth : searchDepth,
			alpha: -Infinity,
			beta: Infinity,
		});
		return res.move;
	}

	// for personal use
	getBestMove(fen: string, depth?: number) {
		chess.load(fen);
		const res = negamax({
			depth: depth ? depth : searchDepth,
			alpha: -Infinity,
			beta: Infinity,
		});
		if (res.move === null) {
			res.move = getRandomMove();
			console.log('random move chosen');
		}

		return res;
	}
}

module.exports = Na_Vinci;
