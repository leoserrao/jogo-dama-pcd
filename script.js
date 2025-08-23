// Aguarda o carregamento completo do HTML para iniciar o jogo
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('checkers-board');
    const ctx = canvas.getContext('2d');
    const statusDisplay = document.getElementById('status');
    const scoreDisplay = document.getElementById('score');

    // Elementos de áudio (devem existir no seu HTML)
    const moveSound = document.getElementById('move-sound');
    const captureSound = document.getElementById('capture-sound');

    const BOARD_SIZE = 8;
    const SQUARE_SIZE = canvas.width / BOARD_SIZE;

    // Constantes para representar as peças e casas vazias
    const EMPTY = 0;
    const BLACK_PIECE = 1;
    const WHITE_PIECE = 2;
    const BLACK_KING = 3;
    const WHITE_KING = 4;

    // Representação do tabuleiro como uma matriz 8x8
    let board = [];

    // Variáveis para controlar o estado do jogo
    let currentPlayer = BLACK_PIECE;
    let selectedPiece = null; // Guarda a peça selecionada { row, col }
    let mandatoryMoves = []; // Guarda os movimentos obrigatórios (capturas)
    let isAnimating = false; // Flag para controlar a animação

    // --- INICIALIZAÇÃO DO JOGO ---

    function initializeBoard() {
        board = [
            [0, 1, 0, 1, 0, 1, 0, 1],
            [1, 0, 1, 0, 1, 0, 1, 0],
            [0, 1, 0, 1, 0, 1, 0, 1],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [2, 0, 2, 0, 2, 0, 2, 0],
            [0, 2, 0, 2, 0, 2, 0, 2],
            [2, 0, 2, 0, 2, 0, 2, 0]
        ];
        currentPlayer = BLACK_PIECE;
        selectedPiece = null;
        drawBoard();
        updateStatus();
        calculateTurnMoves();
    }

    // --- FUNÇÕES DE DESENHO ---

    function drawBoard() {
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                // Desenha a casa do tabuleiro
                const x = col * SQUARE_SIZE;
                const y = row * SQUARE_SIZE;
                ctx.fillStyle = (row + col) % 2 === 0 ? '#f0d9b5' : '#b58863';
                ctx.fillRect(x, y, SQUARE_SIZE, SQUARE_SIZE);

                // Desenha a peça, se houver uma na casa
                const piece = board[row][col];
                if (piece !== EMPTY) {
                    drawPiece(x + SQUARE_SIZE / 2, y + SQUARE_SIZE / 2, piece);
                }
            }
        }

        // Destaca a peça selecionada e os movimentos possíveis
        if (selectedPiece) {
            const { row, col } = selectedPiece;
            // Destaca a peça
            ctx.strokeStyle = '#00ff00'; // Cor verde para destacar
            ctx.lineWidth = 3;
            ctx.strokeRect(col * SQUARE_SIZE, row * SQUARE_SIZE, SQUARE_SIZE, SQUARE_SIZE);

            // Destaca os movimentos possíveis para a peça selecionada
            const possibleMoves = mandatoryMoves.filter(m => m.fromRow === row && m.fromCol === col);
            ctx.fillStyle = 'rgba(10, 132, 255, 0.5)'; // Azul semi-transparente

            for (const move of possibleMoves) {
                const { toRow, toCol } = move;
                const x = toCol * SQUARE_SIZE + SQUARE_SIZE / 2;
                const y = toRow * SQUARE_SIZE + SQUARE_SIZE / 2;
                ctx.beginPath();
                ctx.arc(x, y, SQUARE_SIZE / 4, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
    }

    function drawPiece(x, y, pieceType) {
        ctx.beginPath();
        ctx.arc(x, y, SQUARE_SIZE / 2 - 8, 0, 2 * Math.PI);
        ctx.fillStyle = isBlack(pieceType) ? '#111' : '#fff';
        ctx.fill();
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();

    // Desenha uma 'coroa' para as damas
    if (pieceType === BLACK_KING || pieceType === WHITE_KING) {
        ctx.beginPath();
        ctx.arc(x, y, SQUARE_SIZE / 2 - 18, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffd700'; // Cor de ouro
        ctx.fill();
        ctx.closePath();
    }
    }

    // --- LÓGICA DE MOVIMENTO ---

    function getPossibleMovesForPiece(row, col) {
        const piece = board[row][col];
        if (piece === EMPTY) {
            return { captures: [], simples: [] };
        }

        const captures = [];
        const simples = [];
        const isKing = piece === BLACK_KING || piece === WHITE_KING; // A Dama pode se mover em qualquer direção
        const forwardDir = isBlack(piece) ? 1 : -1;

        // Verifica movimentos simples
        if (isKing) {
            // A Dama (King) pode se mover várias casas em qualquer direção diagonal ("Dama voadora")
            const moveDirections = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
            for (const [dRow, dCol] of moveDirections) {
                let nextRow = row + dRow;
                let nextCol = col + dCol;
                // Continua na mesma direção até encontrar uma peça ou sair do tabuleiro
                while (isOnBoard(nextRow, nextCol)) {
                    if (board[nextRow][nextCol] === EMPTY) {
                        simples.push({ fromRow: row, fromCol: col, toRow: nextRow, toCol: nextCol, isCapture: false });
                        nextRow += dRow;
                        nextCol += dCol;
                    } else {
                        // Caminho bloqueado, para de verificar nesta direção
                        break;
                    }
                }
            }
        } else {
            // Peças comuns se movem apenas uma casa para frente
            const moveDirections = [[forwardDir, 1], [forwardDir, -1]];
            for (const [dRow, dCol] of moveDirections) {
                const toRow = row + dRow;
                const toCol = col + dCol;
                if (isOnBoard(toRow, toCol) && board[toRow][toCol] === EMPTY) {
                    simples.push({ fromRow: row, fromCol: col, toRow, toCol, isCapture: false });
                }
            }
        }

        // Verifica capturas (peças normais também podem capturar para trás)
        const captureDirections = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
        for (const [dRow, dCol] of captureDirections) {
            const opponentRow = row + dRow;
            const opponentCol = col + dCol;
            const toRow = row + dRow * 2;
            const toCol = col + dCol * 2;

            if (isOnBoard(toRow, toCol) && board[toRow][toCol] === EMPTY) {
                const middlePiece = board[opponentRow][opponentCol];
                if (isOpponent(middlePiece, piece)) {
                    captures.push({ fromRow: row, fromCol: col, toRow, toCol, isCapture: true });
                }
            }
        }
        return { captures, simples };
    }

    function calculateTurnMoves() {
        let allCaptures = [];
        let allSimples = [];

        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const piece = board[r][c];
                const isCurrentPlayerPiece = (currentPlayer === BLACK_PIECE && isBlack(piece)) ||
                                             (currentPlayer === WHITE_PIECE && isWhite(piece));

                if (isCurrentPlayerPiece) {
                    const moves = getPossibleMovesForPiece(r, c);
                    allCaptures.push(...moves.captures);
                    allSimples.push(...moves.simples);
                }
            }
        }

        // Regra da captura obrigatória: se houver capturas, elas são os únicos movimentos permitidos.
        mandatoryMoves = allCaptures.length > 0 ? allCaptures : allSimples;

        if (mandatoryMoves.length === 0) {
            const winner = currentPlayer === BLACK_PIECE ? 'Brancas' : 'Pretas';
            statusDisplay.textContent = `${winner} Venceram! (Oponente sem movimentos)`;
            canvas.removeEventListener('click', handleCanvasClick);
        }
    }

    function handleCanvasClick(event) {
        if (isAnimating) return; // Ignora cliques durante a animação
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
    
        const col = Math.floor(x / SQUARE_SIZE);
        const row = Math.floor(y / SQUARE_SIZE);
    
        // Verifica se o clique foi em uma peça que pode se mover
        const isPotentialStart = mandatoryMoves.some(m => m.fromRow === row && m.fromCol === col);
    
        if (selectedPiece) {
            // Uma peça já está selecionada, então tentamos movê-la
            const move = mandatoryMoves.find(m =>
                m.fromRow === selectedPiece.row &&
                m.fromCol === selectedPiece.col &&
                m.toRow === row &&
                m.toCol === col
            );
    
            if (move) {
                // Movimento válido encontrado, executa o movimento
                movePiece(move);
            } else if (isPotentialStart && (selectedPiece.row !== row || selectedPiece.col !== col)) {
                // O jogador clicou em outra peça válida, então trocamos a seleção
                selectedPiece = { row, col };
                drawBoard();
            } else {
                // Clicou em um local inválido ou na mesma peça, então deseleciona
                selectedPiece = null;
                drawBoard();
            }
        } else if (isPotentialStart) {
            // Nenhuma peça selecionada, e o jogador clicou em uma peça válida
            selectedPiece = { row, col };
            drawBoard();
        }
    }

    function animatePieceMove(move, piece, onComplete) {
        const { fromRow, fromCol, toRow, toCol } = move;
        const startX = fromCol * SQUARE_SIZE + SQUARE_SIZE / 2;
        const startY = fromRow * SQUARE_SIZE + SQUARE_SIZE / 2;
        const endX = toCol * SQUARE_SIZE + SQUARE_SIZE / 2;
        const endY = toRow * SQUARE_SIZE + SQUARE_SIZE / 2;

        const duration = 250; // Duração da animação em milissegundos
        let startTime = null;

        function animationLoop(timestamp) {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const fraction = Math.min(progress / duration, 1);

            const currentX = startX + (endX - startX) * fraction;
            const currentY = startY + (endY - startY) * fraction;

            // 1. Limpa e redesenha o tabuleiro estático (sem a peça que está se movendo)
            drawBoard();
            // 2. Desenha a peça em movimento na sua posição atual
            drawPiece(currentX, currentY, piece);

            if (fraction < 1) {
                requestAnimationFrame(animationLoop);
            } else {
                // Animação concluída, chama o callback para atualizar o estado do jogo
                onComplete();
            }
        }

        requestAnimationFrame(animationLoop);
    }

    function movePiece(move) {
        const { fromRow, fromCol, toRow, toCol, isCapture } = move;
        const piece = board[fromRow][fromCol];

        isAnimating = true;
        selectedPiece = null; // Limpa a seleção para remover os destaques visuais durante a animação

        // Toca o som apropriado
        if (isCapture) {
            playSound(captureSound);
        } else {
            playSound(moveSound);
        }

        // Remove a peça da sua posição inicial no tabuleiro lógico ANTES da animação
        board[fromRow][fromCol] = EMPTY;

        animatePieceMove(move, piece, () => {
            // --- CALLBACK PÓS-ANIMAÇÃO ---
            board[toRow][toCol] = piece; // Coloca a peça no seu destino final

            if (isCapture) {
                const capturedRow = fromRow + (toRow - fromRow) / 2;
                const capturedCol = fromCol + (toCol - fromCol) / 2;
                board[capturedRow][capturedCol] = EMPTY;
            }

            if (piece === BLACK_PIECE && toRow === BOARD_SIZE - 1) {
                board[toRow][toCol] = BLACK_KING;
            } else if (piece === WHITE_PIECE && toRow === 0) {
                board[toRow][toCol] = WHITE_KING;
            }

            if (isCapture) {
                const chainCaptures = getPossibleMovesForPiece(toRow, toCol).captures;
                if (chainCaptures.length > 0) {
                    selectedPiece = { row: toRow, col: toCol };
                    mandatoryMoves = chainCaptures;
                    isAnimating = false;
                    drawBoard();
                    updateScore();
                    return;
                }
            }

            switchPlayer();
            updateStatus();
            updateScore();
            drawBoard();
            isAnimating = false;
        });
    }

    // --- FUNÇÕES AUXILIARES ---

    function isBlack(piece) {
        return piece === BLACK_PIECE || piece === BLACK_KING;
    }

    function isWhite(piece) {
        return piece === WHITE_PIECE || piece === WHITE_KING;
    }

    function playSound(sound) {
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(error => console.error("Erro ao tocar o som:", error));
        }
    }

    function isOnBoard(row, col) {
        return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
    }

    function isOpponent(piece, playerPiece) {
        return piece !== EMPTY && isBlack(playerPiece) !== isBlack(piece);
    }

    function switchPlayer() {
        currentPlayer = (currentPlayer === BLACK_PIECE) ? WHITE_PIECE : BLACK_PIECE;
        calculateTurnMoves();
    }

    function updateStatus() {
        const playerName = currentPlayer === BLACK_PIECE ? 'Pretas' : 'Brancas';
        statusDisplay.innerHTML = `Vez das peças <span class="highlight-turn">${playerName}</span>`;
    }

    function updateScore() {
        let blackCount = 0;
        let whiteCount = 0;
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (isBlack(board[row][col])) {
                    blackCount++;
                } else if (isWhite(board[row][col])) {
                    whiteCount++;
                }
            }
        }

        const blackText = `Pretas: ${blackCount}`;
        const whiteText = `Brancas: ${whiteCount}`;
        if (currentPlayer === BLACK_PIECE) {
            scoreDisplay.innerHTML = `<span class="highlight-turn">${blackText}</span> - <span>${whiteText}</span>`;
        } else {
            scoreDisplay.innerHTML = `<span>${blackText}</span> - <span class="highlight-turn">${whiteText}</span>`;
        }

        // Verifica condição de vitória
        if (whiteCount === 0) {
            statusDisplay.textContent = 'As Pretas Venceram!';
            canvas.removeEventListener('click', handleCanvasClick); // Desativa o jogo
        } else if (blackCount === 0) {
            statusDisplay.textContent = 'As Brancas Venceram!';
            canvas.removeEventListener('click', handleCanvasClick); // Desativa o jogo
        }
    }

    // --- INÍCIO DO JOGO ---

    // Adiciona o "ouvinte" de cliques no canvas
    canvas.addEventListener('click', handleCanvasClick);

    // Inicia o jogo pela primeira vez
    initializeBoard();
});