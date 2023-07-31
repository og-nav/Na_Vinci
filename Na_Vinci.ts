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
  searchDepth: number;
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
let timeLimit = 0;
let startTime = new Date();

const searchDepth = 5;

/////////////////////////////
// UTIL FUNCTIONS / CONSTANTS
/////////////////////////////
/*
 * Piece Square Tables and piece weights taken from PeSTO's Evaluation Function and Rofchade
 * https://www.chessprogramming.org/PeSTO%27s_Evaluation_Function
 */
const gamePhase = { p: 0, n: 1, b: 1, r: 2, q: 4, k: 0 };
const pwmg = { p: 82, n: 337, b: 365, r: 477, q: 1025, k: 0 }; // middle game piece weights
const pweg = { p: 94, n: 281, b: 297, r: 512, q: 936, k: 0 }; // endgame piece weights
const pstw = {
  // middle game piece square tables
  pm: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [98, 134, 61, 95, 68, 126, 34, -11],
    [-6, 7, 26, 31, 65, 56, 25, -20],
    [-14, 13, 6, 21, 23, 12, 17, -23],
    [-27, -2, -5, 12, 17, 6, 10, -25],
    [-26, -4, -4, -10, 3, 3, 33, -12],
    [-35, -1, -20, -23, -15, 24, 38, -22],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  nm: [
    [-167, -89, -34, -49, 61, -97, -15, -107],
    [-73, -41, 72, 36, 23, 62, 7, -17],
    [-47, 60, 37, 65, 84, 129, 73, 44],
    [-9, 17, 19, 53, 37, 69, 18, 22],
    [-13, 4, 16, 13, 28, 19, 21, -8],
    [-23, -9, 12, 10, 19, 17, 25, -16],
    [-29, -53, -12, -3, -1, 18, -14, -19],
    [-105, -21, -58, -33, -17, -28, -19, -23],
  ],
  bm: [
    [-29, 4, -82, -37, -25, -42, 7, -8],
    [-26, 16, -18, -13, 30, 59, 18, -47],
    [-16, 37, 43, 40, 35, 50, 37, -2],
    [-4, 5, 19, 50, 37, 37, 7, -2],
    [-6, 13, 13, 26, 34, 12, 10, 4],
    [0, 15, 15, 15, 14, 27, 18, 10],
    [4, 15, 16, 0, 7, 21, 33, 1],
    [-33, -3, -14, -21, -13, -12, -39, -21],
  ],
  rm: [
    [32, 42, 32, 51, 63, 9, 31, 43],
    [27, 32, 58, 62, 80, 67, 26, 44],
    [-5, 19, 26, 36, 17, 45, 61, 16],
    [-24, -11, 7, 26, 24, 35, -8, -20],
    [-36, -26, -12, -1, 9, -7, 6, -23],
    [-45, -25, -16, -17, 3, 0, -5, -33],
    [-44, -16, -20, -9, -1, 11, -6, -71],
    [-19, -13, 1, 17, 16, 7, -37, -26],
  ],
  qm: [
    [-28, 0, 29, 12, 59, 44, 43, 45],
    [-24, -39, -5, 1, -16, 57, 28, 54],
    [-13, -17, 7, 8, 29, 56, 47, 57],
    [-27, -27, -16, -16, -1, 17, -2, 1],
    [-9, -26, -9, -10, -2, -4, 3, -3],
    [-14, 2, -11, -2, -5, 2, 14, 5],
    [-35, -8, 11, 2, 8, 15, -3, 1],
    [-1, -18, -9, 10, -15, -25, -31, -50],
  ],
  km: [
    [-65, 23, 16, -15, -56, -34, 2, 13],
    [29, -1, -20, -7, -8, -4, -38, -29],
    [-9, 24, 2, -16, -20, 6, 22, -22],
    [-17, -20, -12, -27, -30, -25, -14, -36],
    [-49, -1, -27, -39, -46, -44, -33, -51],
    [-14, -14, -22, -46, -44, -30, -15, -27],
    [1, 7, -8, -64, -43, -16, 9, 8],
    [-15, 36, 12, -54, 8, -28, 24, 14],
  ],

  // Endgame Position Weights
  pe: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [178, 173, 158, 134, 147, 132, 165, 187],
    [94, 100, 85, 67, 56, 53, 82, 84],
    [32, 24, 13, 5, -2, 4, 17, 17],
    [13, 9, -3, -7, -7, -8, 3, -1],
    [4, 7, -6, 1, 0, -5, -1, -8],
    [13, 8, 8, 10, 13, 0, 2, -7],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  ne: [
    [-58, -38, -13, -28, -31, -27, -63, -99],
    [-25, -8, -25, -2, -9, -25, -24, -52],
    [-24, -20, 10, 9, -1, -9, -19, -41],
    [-17, 3, 22, 22, 22, 11, 8, -18],
    [-18, -6, 16, 25, 16, 17, 4, -18],
    [-23, -3, -1, 15, 10, -3, -20, -22],
    [-42, -20, -10, -5, -2, -20, -23, -44],
    [-29, -51, -23, -15, -22, -18, -50, -64],
  ],
  be: [
    [-14, -21, -11, -8, -7, -9, -17, -24],
    [-8, -4, 7, -12, -3, -13, -4, -14],
    [2, -8, 0, -1, -2, 6, 0, 4],
    [-3, 9, 12, 9, 14, 10, 3, 2],
    [-6, 3, 13, 19, 7, 10, -3, -9],
    [-12, -3, 8, 10, 13, 3, -7, -15],
    [-14, -18, -7, -1, 4, -9, -15, -27],
    [-23, -9, -23, -5, -9, -16, -5, -17],
  ],
  re: [
    [13, 10, 18, 15, 12, 12, 8, 5],
    [11, 13, 13, 11, -3, 3, 8, 3],
    [7, 7, 7, 5, 4, -3, -5, -3],
    [4, 3, 13, 1, 2, 1, -1, 2],
    [3, 5, 8, 4, -5, -6, -8, -11],
    [-4, 0, -5, -1, -7, -12, -8, -16],
    [-6, -6, 0, 2, -9, -9, -11, -3],
    [-9, 2, 3, -1, -5, -13, 4, -20],
  ],
  qe: [
    [-9, 22, 22, 27, 27, 19, 10, 20],
    [-17, 20, 32, 41, 58, 25, 30, 0],
    [-20, 6, 9, 49, 47, 35, 19, 9],
    [3, 22, 24, 45, 57, 40, 57, 36],
    [-18, 28, 19, 47, 31, 34, 39, 23],
    [-16, -27, 15, 6, 9, 17, 10, 5],
    [-22, -23, -30, -16, -16, -23, -36, -32],
    [-33, -28, -22, -43, -5, -32, -20, -41],
  ],
  ke: [
    [-74, -35, -18, -18, -11, 15, 4, -17],
    [-12, 17, 14, 17, 17, 38, 23, 11],
    [10, 17, 23, 15, 20, 45, 44, 13],
    [-8, 22, 24, 27, 26, 33, 26, 3],
    [-18, -4, 21, 24, 27, 23, 9, -11],
    [-19, -3, 11, 21, 23, 16, 7, -9],
    [-27, -11, 4, 13, 14, 4, -5, -17],
    [-53, -34, -21, -11, -28, -14, -24, -43],
  ],
};

//piece square tables for black
const pstb = {
  pm: pstw['pm'].slice(), //.reverse(),
  nm: pstw['nm'].slice(), //.reverse(),
  bm: pstw['bm'].slice(), //.reverse(),
  rm: pstw['rm'].slice(), //.reverse(),
  qm: pstw['qm'].slice(), //.reverse(),
  km: pstw['km'].slice(), //.reverse(),
  pe: pstw['pe'].slice(), //.reverse(),
  ne: pstw['ne'].slice(), //.reverse(),
  be: pstw['be'].slice(), //.reverse(),
  re: pstw['re'].slice(), //.reverse(),
  qe: pstw['qe'].slice(), //.reverse(),
  ke: pstw['ke'].slice(), //.reverse(),
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

// center manhattan distance
const cmd = [
  [6, 5, 4, 3, 3, 4, 5, 6],
  [5, 4, 3, 2, 2, 3, 4, 5],
  [4, 3, 2, 1, 1, 2, 3, 4],
  [3, 2, 1, 0, 0, 1, 2, 3],
  [3, 2, 1, 0, 0, 1, 2, 3],
  [4, 3, 2, 1, 1, 2, 3, 4],
  [5, 4, 3, 2, 2, 3, 4, 5],
  [6, 5, 4, 3, 3, 4, 5, 6],
];

/////////////////////////////////
// ZOBRIST HASH FUNCTIONS / CLASS
/////////////////////////////////

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
  //return chess.moves().filter((move) => move.length > 3);
  return chess.moves({ verbose: true }).filter((move) => move.flags === 'c');
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

// since negamax is flipping values back and forth, care should be taken to make sure
// both colors are adequately maximizing the evaluation
function getTurnMultiplier(value: number) {
  return value > 0
    ? chess.turn() === 'w'
      ? 1
      : -1
    : chess.turn() === 'w'
    ? -1
    : 1;
}

function getMDs() {
  const board: ({
    square: Square;
    type: PieceSymbol;
    color: Color;
  } | null)[][] = chess.board();
  const turn = chess.turn();

  //rank: i, file: j
  const goodKingCoords = { i: 0, j: 0 };
  const enemyKingCoords = { i: 0, j: 0 };

  // locate kings
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = board[i][j];
      if (piece && piece.type === 'k') {
        if (piece.color === turn) {
          goodKingCoords.i = i;
          goodKingCoords.j = j;
        } else {
          enemyKingCoords.i = i;
          enemyKingCoords.j = j;
        }
      }
    }
  }

  const md = Math.abs(goodKingCoords.j - enemyKingCoords.j);
  Math.abs(goodKingCoords.i - enemyKingCoords.i);

  return {
    goodKingCoords: goodKingCoords,
    enemyKingCoords: enemyKingCoords,
    manhattanDistance: md,
  };
}

////////////////////////////////
// EVALUATION / SEARCH FUNCTIONS
////////////////////////////////

// returns a score for passed pawns
function passedPawn(i: number, j: number) {
  const board: ({
    square: Square;
    type: PieceSymbol;
    color: Color;
  } | null)[][] = chess.board();
  const turn = chess.turn();

  let passedPawnScore = 0;
  const piece = board[i][j];
  if (piece!.type === 'p' && piece!.color === chess.turn()) {
    if (turn === 'w') {
      // left and right columns, clamping to side of the board if needed
      const lcol = Math.max(j - 1, 0);
      const rcol = Math.min(j + 1, 7);
      const height = i - 1;
      let passed = true;

      for (let k = height; k > 0; k--) {
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
        passedPawnScore += 25;
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
        passedPawnScore += 25;
      }
    }
  }
  return passedPawnScore;
}

// returns a score for isolated pawns
function isolatedPawn(i: number, j: number) {
  const board: ({
    square: Square;
    type: PieceSymbol;
    color: Color;
  } | null)[][] = chess.board();
  const turn = chess.turn();
  let isolated = true;
  let isolatedPawnScore = 0;

  const lcol = Math.max(j - 1, 0);
  const rcol = Math.min(j + 1, 7);
  for (let k = 1; k < 8; k++) {
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
    isolatedPawnScore -= 20;
  }

  return isolatedPawnScore;
}

// force king to corner
function forceKingToCorner() {
  let forceKingToCornerEval = 0;

  //rank: i, file: j
  const res = getMDs(); // gets manhattan distances
  const enemyKingCoords = res.enemyKingCoords;
  const manhattanDistance = res.manhattanDistance;

  const enemyKingDistanceFromCenter = cmd[enemyKingCoords.i][enemyKingCoords.j];
  forceKingToCornerEval += enemyKingDistanceFromCenter;

  forceKingToCornerEval -= 14 - manhattanDistance;

  // so bigger eval for enemy king being farther away from the center + bigger eval for moving closer = our king helping push the enemy king into the corner
  return forceKingToCornerEval;
}

function mopup(mps: number) {
  const res = getMDs();
  const losingKing = mps > 0 ? 'b' : 'w';
  const goodKingCoords = res.goodKingCoords;
  const enemyKingCoords = res.goodKingCoords;
  const manhattanDistance = res.manhattanDistance;
  if (losingKing === 'w') {
    if (chess.turn() === 'w') {
      return (
        4.7 * cmd[goodKingCoords.i][goodKingCoords.j] +
        1.6 * (14 - manhattanDistance)
      );
    } else {
      return (
        4.7 * cmd[enemyKingCoords.i][enemyKingCoords.j] +
        1.6 * (14 - manhattanDistance)
      );
    }
  } else {
    if (chess.turn() === 'b') {
      return (
        4.7 * cmd[goodKingCoords.i][goodKingCoords.j] +
        1.6 * (14 - manhattanDistance)
      );
    } else {
      return (
        4.7 * cmd[enemyKingCoords.i][enemyKingCoords.j] +
        1.6 * (14 - manhattanDistance)
      );
    }
  }
}

// evaluates irrespective of turn or position dynamics
// for example, a hanging queen won't be flagged by this - addressed in a quiescence search (q-search)
// other factors like king safety will be added in the future
function evaluateStatic() {
  if (chess.isGameOver()) {
    if (chess.isDraw() || chess.isThreefoldRepetition()) {
      return 0;
    }

    // opponent put us in checkmate, which is bad for us
    return -Infinity;
  }

  // will always evaluate white - black and then adjust depending on whose turn it is
  const turn = chess.turn();
  const board: ({
    square: Square;
    type: PieceSymbol;
    color: Color;
  } | null)[][] = chess.board();

  // evaluation criteria
  let gamePhaseScore = 0;
  let middlegameScore = 0;
  let endgameScore = 0;
  let mopupScore = 0;
  let passedPawnScore = 0;
  let isolatedPawnScore = 0;
  let forceKingToCornerScore = 0;

  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = board[i][j];
      if (!piece) continue; // skip null squares
      if (piece.color === turn) {
        middlegameScore +=
          turn === 'w'
            ? pwmg[piece.type] + pstw[`${piece.type}m`][i][j]
            : pwmg[piece.type] + pstb[`${piece.type}m`][i][j];
        endgameScore +=
          turn === 'w'
            ? pweg[piece.type] + pstw[`${piece.type}e`][i][j]
            : pweg[piece.type] + pstb[`${piece.type}e`][i][j];
      } else {
        middlegameScore -=
          turn === 'w'
            ? pwmg[piece.type] + pstw[`${piece.type}m`][i][j]
            : pwmg[piece.type] + pstb[`${piece.type}m`][i][j];
        endgameScore -=
          turn === 'w'
            ? pweg[piece.type] + pstw[`${piece.type}e`][i][j]
            : pweg[piece.type] + pstb[`${piece.type}e`][i][j];
      }

      gamePhaseScore += gamePhase[piece.type];
      if (piece.type === 'p') {
        passedPawnScore += passedPawn(i, j);
        isolatedPawnScore += isolatedPawn(i, j);
      }
    }
  }
  let mgPhase = gamePhaseScore;
  if (gamePhaseScore > 24) {
    mgPhase = 24; // accounts for early promotions
  }
  let egPhase = 24 - mgPhase;

  let materialAndPositionScore =
    (middlegameScore * mgPhase + endgameScore * egPhase) / 24;
  mopupScore += mopup(materialAndPositionScore);
  forceKingToCornerScore += forceKingToCorner();

  // fixing values for turn
  //mopupScore *= getTurnMultiplier(mopupScore);
  forceKingToCornerScore *= getTurnMultiplier(forceKingToCornerScore);
  passedPawnScore *= getTurnMultiplier(passedPawnScore);
  isolatedPawnScore *= getTurnMultiplier(isolatedPawnScore);

  const res = materialAndPositionScore; // + passedPawnScore + isolatedPawnScore;

  return res / 100;
}

// quiescence search
// plays out all 'active' moves like captures, checks, promotions, etc until the position is 'quiet'
// imagine the search reaches depth after a queen captures a knight
// the engine sees this as gaining material so it will play it
// however, if the search had went one move deeper, it would have found that the queen could be easily recaptured
// so the quiescence search will continue through the active moves to make sure simple recaptures
// and the like are not missed
function quiescence({ alpha, beta }: { alpha: number; beta: number }) {
  const standPat = evaluateStatic(); // default lower bound evaluation

  if (standPat >= beta) {
    return beta;
  }

  if (alpha < standPat) {
    alpha = standPat;
  }

  const qMoves = getQMoves();
  for (const move of qMoves) {
    chess.move(move);
    let score = -quiescence({ alpha: -beta, beta: -alpha });
    chess.undo();

    if (score >= beta) {
      return beta;
    }
    if (score > alpha) {
      alpha = score;
    }
  }

  return alpha;
}

// negamax search function
// negamax is a variation of minimax but with the assumption the game is a zero-sum game
// so any benefit for one player comes at the expense of the other

function negamax({
  searchDepth,
  depth,
  alpha,
  beta,
}: NegamaxProps): EvaluationResult {
  // current position
  const currFen = chess.fen();

  // check transposition table for current position
  if (currFen in transpositionTable) {
    const entry = transpositionTable[currFen];

    // checking if the cached depth is greater (by having a smaller number) than the current depth
    // while this doesn't necessarily affect the uniqueness of the move (since there is always only
    // one best move for each position regardless of the depth), this value could be useful in the future when
    // more optimizations are added
    if (searchDepth - depth >= entry.depth) {
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

  // check if time is up
  if (
    timeLimit &&
    new Date().valueOf() - startTime.valueOf() > timeLimit * 1000
  ) {
    let nodeScore = evaluateStatic();
    const entry: EvaluationResult = {
      score: nodeScore,
      move: null,
      depth: searchDepth - depth,
      flag: 'exact',
    };

    // save evaluated position
    transpositionTable[currFen] = entry;
    return entry;
  }

  if (depth === 0 || chess.isGameOver()) {
    let nodeScore = evaluateStatic(); //quiescence({ alpha: alpha, beta: beta });

    const entry: EvaluationResult = {
      score: nodeScore,
      move: null,
      depth: searchDepth - depth,
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
      searchDepth: searchDepth,
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
    depth: searchDepth - depth,
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
      searchDepth: depth ? depth : searchDepth,
      depth: depth ? depth : searchDepth,
      alpha: -Infinity,
      beta: Infinity,
    });
    if (res.move === null) {
      res.move = getRandomMove();
      console.log('random move chosen');
    }
    return res.move;
  }

  // for personal use
  getBestMove(fen: string, depth?: number) {
    chess.load(fen);
    startTime = new Date();
    const res = negamax({
      searchDepth: depth ? depth : searchDepth,
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
